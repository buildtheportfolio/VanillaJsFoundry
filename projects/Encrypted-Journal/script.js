'use strict';

/* ===CRYPTO-START=== */
const VaultCrypto = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const VERSION = 1;
  const KDF = 'PBKDF2-SHA256';
  const ITERATIONS = 600000;
  const MIN_ITERATIONS = 310000;
  const MAX_ITERATIONS = 5000000;
  const SALT_BYTES = 16;
  const IV_BYTES = 12;

  class VaultError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }

  function toB64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }
  function fromB64(str) {
    if (typeof str !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(str) || str.length % 4 !== 0) {
      throw new VaultError('BAD_FORMAT', 'Invalid base64 data.');
    }
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function rand(n) { return crypto.getRandomValues(new Uint8Array(n)); }
  function aadFor(h) { return enc.encode('journal|' + h.v + '|' + h.kdf + '|' + h.iterations + '|' + h.salt); }
  function pass(p) { return enc.encode(String(p).normalize('NFKC')); }

  async function deriveKey(passphrase, saltBytes, iterations) {
    const base = await crypto.subtle.importKey('raw', pass(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  }

  function validateEnvelope(env) {
    if (!env || typeof env !== 'object' || Array.isArray(env)) throw new VaultError('BAD_FORMAT', 'File is not a vault envelope.');
    if (env.v !== VERSION) throw new VaultError('BAD_FORMAT', 'Unsupported vault version.');
    if (env.kdf !== KDF) throw new VaultError('BAD_FORMAT', 'Unsupported key derivation function.');
    if (!Number.isInteger(env.iterations) || env.iterations < MIN_ITERATIONS || env.iterations > MAX_ITERATIONS) {
      throw new VaultError('BAD_FORMAT', 'Iteration count is missing or outside the accepted range.');
    }
    if (fromB64(env.salt).length !== SALT_BYTES) throw new VaultError('BAD_FORMAT', 'Salt must be 16 bytes.');
    if (fromB64(env.iv).length !== IV_BYTES) throw new VaultError('BAD_FORMAT', 'IV must be 12 bytes.');
    if (fromB64(env.ct).length < 17) throw new VaultError('BAD_FORMAT', 'Ciphertext is missing or too short.');
    return { v: env.v, kdf: env.kdf, iterations: env.iterations, salt: env.salt, iv: env.iv, ct: env.ct };
  }

  function sanitizeData(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.entries)) throw new VaultError('CORRUPT', 'Decrypted data has an unexpected shape.');
    const str = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');
    const num = (x) => (Number.isFinite(x) ? x : Date.now());
    const entries = d.entries.filter((e) => e && typeof e === 'object').map((e) => ({
      id: str(e.id, 64) || Math.random().toString(36).slice(2),
      title: str(e.title, 200),
      body: str(e.body, 500000),
      mood: Number.isInteger(e.mood) && e.mood >= 0 && e.mood <= 5 ? e.mood : 0,
      tags: Array.isArray(e.tags) ? e.tags.filter((t) => typeof t === 'string').map((t) => t.slice(0, 40)).slice(0, 30) : [],
      created: num(e.created),
      updated: num(e.updated)
    }));
    return { entries };
  }

  // header = {v,kdf,iterations,salt}; returns a full envelope with a fresh IV
  async function seal(key, header, data) {
    const h = { v: header.v, kdf: header.kdf, iterations: header.iterations, salt: header.salt };
    const plain = enc.encode(JSON.stringify(data));
    const iv = rand(IV_BYTES);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aadFor(h) }, key, plain);
    return { v: h.v, kdf: h.kdf, iterations: h.iterations, salt: h.salt, iv: toB64(iv), ct: toB64(new Uint8Array(ct)) };
  }

  async function open(key, envelope) {
    const env = validateEnvelope(envelope);
    let plain;
    try {
      plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(env.iv), additionalData: aadFor(env) }, key, fromB64(env.ct));
    } catch (e) {
      throw new VaultError('BAD_PASSPHRASE', 'Wrong passphrase, or the vault was modified.');
    }
    let parsed;
    try { parsed = JSON.parse(dec.decode(plain)); } catch (e) { throw new VaultError('CORRUPT', 'Decrypted data is not valid.'); }
    return sanitizeData(parsed);
  }

  async function create(passphrase, data) {
    const header = { v: VERSION, kdf: KDF, iterations: ITERATIONS, salt: toB64(rand(SALT_BYTES)) };
    const key = await deriveKey(passphrase, fromB64(header.salt), header.iterations);
    return { key, header, envelope: await seal(key, header, data) };
  }

  async function unlock(passphrase, envelope) {
    const env = validateEnvelope(envelope);
    const key = await deriveKey(passphrase, fromB64(env.salt), env.iterations);
    const data = await open(key, env);
    return { key, data, header: { v: env.v, kdf: env.kdf, iterations: env.iterations, salt: env.salt } };
  }

  return { create, unlock, seal, open, deriveKey, validateEnvelope, VaultError, ITERATIONS, KDF, VERSION, fromB64, toB64, rand, SALT_BYTES };
})();
/* ===CRYPTO-END=== */

(() => {
  const STORE_KEY = 'encjournal.vault.v1';
  const SETTINGS_KEY = 'encjournal.settings.v1';
  const MOODS = ['None', 'Awful', 'Low', 'Okay', 'Good', 'Great'];
  const MIN_PASS = 10;

  const $ = (id) => document.getElementById(id);
  const views = ['error', 'loading', 'setup', 'lock'].map((n) => [n, $('view-' + n)]);
  const appEl = $('view-app');

  // Memory-only state; all wiped on lock.
  let key = null;
  let header = null;
  let data = null;
  let currentId = null;
  let dirty = false;
  let saveTimer = 0;
  let saveChain = Promise.resolve();
  let lastActivity = Date.now();
  let timeoutMin = 5;
  let failCount = 0;
  let lockedUntil = 0;
  let pendingImport = null;
  let deleteArm = 0;

  /* ---------- helpers ---------- */
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { localStorage.setItem(k, v); }
  function safeDel(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  function toast(msg, bad) {
    const t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(() => t.remove(), 4200);
  }
  function showError(el, msg) { el.textContent = msg; el.hidden = !msg; }
  function setBusy(btn, busy, text) {
    btn.disabled = busy;
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    const label = btn.querySelector('.label');
    if (label) {
      if (busy) { btn.dataset.label = label.textContent; label.textContent = text; }
      else if (btn.dataset.label) { label.textContent = btn.dataset.label; }
    }
  }
  function showView(name) {
    for (const [n, el] of views) el.hidden = n !== name;
    appEl.hidden = name !== 'app';
  }
  function fmt(ts, long) {
    try {
      return new Intl.DateTimeFormat(undefined, long
        ? { dateStyle: 'medium', timeStyle: 'short' } : { month: 'short', day: 'numeric' }).format(ts);
    } catch (e) { return new Date(ts).toLocaleString(); }
  }
  function uid() { return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join(''); }
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

  function openDialog(id) {
    const d = $('dlg-' + id);
    if (d.open) return;
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function closeDialog(d) {
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }

  /* ---------- passphrase strength ---------- */
  function strength(p) {
    if (!p) return { level: 0, bits: 0, label: '' };
    let pool = 0;
    if (/[a-z]/.test(p)) pool += 26;
    if (/[A-Z]/.test(p)) pool += 26;
    if (/\d/.test(p)) pool += 10;
    if (/[^A-Za-z0-9]/.test(p)) pool += 32;
    const unique = new Set(p).size;
    let bits = Math.min(p.length, unique * 2) * Math.log2(Math.max(pool, 2)) * 0.85;
    if (/^(.)\1+$/.test(p) || /^\d+$/.test(p)) bits *= 0.4;
    if (/(password|qwerty|letmein|123456|abcdef|iloveyou|admin)/i.test(p)) bits *= 0.4;
    if (/\s/.test(p) && p.trim().split(/\s+/).length >= 4) bits += 12;
    let level = 1; let label = 'Very weak';
    if (bits >= 90) { level = 4; label = 'Strong'; }
    else if (bits >= 62) { level = 3; label = 'Good'; }
    else if (bits >= 40) { level = 2; label = 'Fair'; }
    else if (bits >= 26) { level = 1; label = 'Weak'; }
    return { level, bits, label };
  }
  function bindMeter(input, meter, hint) {
    input.addEventListener('input', () => {
      const s = strength(input.value);
      meter.dataset.level = String(s.level);
      hint.textContent = input.value
        ? s.label + (input.value.length < MIN_PASS ? ' (needs at least ' + MIN_PASS + ' characters)' : '')
        : 'Use at least ' + MIN_PASS + ' characters.' + (hint.id === 'setup-strength' ? ' A few random words works well.' : '');
    });
  }
  function checkNewPass(p, c) {
    if (p.length < MIN_PASS) return 'Passphrase must be at least ' + MIN_PASS + ' characters.';
    if (strength(p).level < 2) return 'That passphrase is too easy to guess. Add more words or characters.';
    if (p !== c) return 'Passphrases do not match.';
    return '';
  }

  /* ---------- persistence ---------- */
  function storedEnvelope() {
    const raw = safeGet(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }
  function setStatus(text, bad) {
    const s = $('save-status');
    s.textContent = text;
    s.classList.toggle('bad', !!bad);
  }
  function persist() {
    dirty = false;
    saveChain = saveChain.then(doSave);
    return saveChain;
  }
  async function doSave() {
    if (!key || !data) return;
    setStatus('Saving...');
    try {
      const env = await VaultCrypto.seal(key, header, data);
      safeSet(STORE_KEY, JSON.stringify(env));
      if (!dirty) setStatus('Saved');
    } catch (e) {
      setStatus('Save failed', true);
      toast('Could not save: storage may be full or blocked.', true);
    }
  }
  function scheduleSave() {
    dirty = true;
    setStatus('Unsaved changes');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 900);
  }
  async function flush() {
    clearTimeout(saveTimer);
    if (dirty) persist();
    await saveChain;
  }

  /* ---------- lock / unlock ---------- */
  function enterApp() {
    failCount = 0;
    lockedUntil = 0;
    lastActivity = Date.now();
    currentId = null;
    $('search').value = '';
    showView('app');
    appEl.hidden = false;
    appEl.classList.remove('show-detail');
    renderList();
    renderEditor();
  }
  function wipe() {
    key = null; header = null; data = null; currentId = null; dirty = false; pendingImport = null;
    clearTimeout(saveTimer);
    $('entries').replaceChildren();
    for (const id of ['f-title', 'f-tags', 'f-body', 'search']) $(id).value = '';
    $('stamps').textContent = '';
    for (const d of document.querySelectorAll('dialog[open]')) closeDialog(d);
    for (const id of ['setup-pass', 'setup-confirm', 'lock-pass', 'cp-old', 'cp-new', 'cp-confirm', 'imp-pass']) $(id).value = '';
  }
  async function lock(reason) {
    if (!key) return;
    try { await flush(); } catch (e) { /* ignore */ }
    wipe();
    showView('lock');
    $('lock-note').textContent = reason || 'Enter your passphrase to decrypt your entries.';
    showError($('lock-error'), '');
    $('lock-pass').focus();
  }

  $('setup-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const p = $('setup-pass').value;
    const err = checkNewPass(p, $('setup-confirm').value);
    showError($('setup-error'), err);
    if (err) return;
    const btn = $('setup-submit');
    setBusy(btn, true, 'Deriving key...');
    await nextFrame();
    try {
      const r = await VaultCrypto.create(p, { entries: [] });
      safeSet(STORE_KEY, JSON.stringify(r.envelope));
      key = r.key; header = r.header; data = { entries: [] };
      $('setup-pass').value = ''; $('setup-confirm').value = '';
      enterApp();
      toast('Vault created. Export a backup from Settings.');
    } catch (e) {
      showError($('setup-error'), 'Could not create the vault. Storage may be blocked or full.');
    } finally { setBusy(btn, false); }
  });

  function tickLockout() {
    const btn = $('lock-submit');
    const left = Math.ceil((lockedUntil - Date.now()) / 1000);
    if (left > 0) {
      btn.disabled = true;
      showError($('lock-error'), 'Too many failed attempts. Try again in ' + left + 's.');
      setTimeout(tickLockout, 250);
    } else if (btn.disabled && btn.getAttribute('aria-busy') !== 'true') {
      btn.disabled = false;
      showError($('lock-error'), '');
    }
  }
  $('lock-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (Date.now() < lockedUntil) return;
    const p = $('lock-pass').value;
    if (!p) return;
    const btn = $('lock-submit');
    setBusy(btn, true, 'Decrypting...');
    showError($('lock-error'), '');
    await nextFrame();
    try {
      const r = await VaultCrypto.unlock(p, storedEnvelope());
      key = r.key; header = r.header; data = r.data;
      $('lock-pass').value = '';
      enterApp();
    } catch (e) {
      $('lock-pass').select();
      if (e instanceof VaultCrypto.VaultError && e.code === 'BAD_PASSPHRASE') {
        failCount++;
        if (failCount >= 3) lockedUntil = Date.now() + Math.min(60, Math.pow(2, failCount - 2)) * 1000;
        showError($('lock-error'), 'Wrong passphrase. The vault could not be decrypted.');
      } else {
        showError($('lock-error'), 'The stored vault is damaged or unreadable. You can import a backup or destroy it.');
      }
    } finally {
      setBusy(btn, false);
      if (Date.now() < lockedUntil) tickLockout();
    }
  });

  /* ---------- list & editor ---------- */
  function sortedEntries() {
    const q = $('search').value.trim().toLowerCase();
    return data.entries.filter((e) => !q || e.title.toLowerCase().includes(q) ||
      e.body.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => b.updated - a.updated);
  }
  function renderList() {
    const ul = $('entries');
    ul.replaceChildren();
    if (!data) return;
    const items = sortedEntries();
    const empty = $('list-empty');
    empty.hidden = items.length > 0;
    empty.textContent = data.entries.length ? 'No entries match your search.' : 'Your journal is empty. Start with a new entry.';
    for (const e of items) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'entry-item';
      b.dataset.id = e.id;
      if (e.id === currentId) b.setAttribute('aria-current', 'true');
      const top = document.createElement('div'); top.className = 'entry-top';
      const t = document.createElement('span'); t.className = 'entry-title'; t.textContent = e.title || 'Untitled entry';
      const d = document.createElement('span'); d.className = 'entry-date'; d.textContent = fmt(e.updated);
      top.append(t, d);
      const sn = document.createElement('span'); sn.className = 'entry-snippet';
      sn.textContent = e.body.replace(/\s+/g, ' ').slice(0, 90) || 'No text yet';
      const tg = document.createElement('span'); tg.className = 'entry-tags';
      const dot = document.createElement('span'); dot.className = 'dot'; dot.dataset.m = String(e.mood);
      dot.title = MOODS[e.mood];
      tg.append(dot);
      if (e.tags.length) tg.append(document.createTextNode(e.tags.map((x) => '#' + x).join(' ')));
      b.append(top, sn, tg);
      b.addEventListener('click', () => selectEntry(e.id));
      li.appendChild(b);
      ul.appendChild(li);
    }
  }
  function current() { return data && data.entries.find((e) => e.id === currentId); }

  function buildMoods() {
    const box = $('f-mood');
    for (let i = 1; i <= 5; i++) {
      const l = document.createElement('label');
      const r = document.createElement('input');
      r.type = 'radio'; r.name = 'mood'; r.value = String(i);
      const s = document.createElement('span');
      const dot = document.createElement('i'); dot.className = 'dot'; dot.dataset.m = String(i);
      s.append(dot, document.createTextNode(MOODS[i]));
      l.append(r, s);
      box.appendChild(l);
      r.addEventListener('click', () => {
        const e = current(); if (!e) return;
        if (e.mood === i) { e.mood = 0; r.checked = false; } else e.mood = i;
        touch(e);
      });
    }
  }
  function renderEditor() {
    const e = current();
    $('editor').hidden = !e;
    $('detail-empty').hidden = !!e;
    if (!e) return;
    $('f-title').value = e.title;
    $('f-tags').value = e.tags.join(', ');
    $('f-body').value = e.body;
    for (const r of $('f-mood').querySelectorAll('input')) r.checked = Number(r.value) === e.mood;
    updateStamps(e);
    setStatus(dirty ? 'Unsaved changes' : 'Saved');
  }
  function updateStamps(e) {
    $('stamps').textContent = 'Created ' + fmt(e.created, true) + '  |  Edited ' + fmt(e.updated, true) + '  |  ' +
      e.body.trim().split(/\s+/).filter(Boolean).length + ' words';
  }
  function touch(e) {
    e.updated = Date.now();
    updateStamps(e);
    renderList();
    scheduleSave();
  }
  function dropIfEmpty() {
    const e = current();
    if (e && !e.title.trim() && !e.body.trim() && !e.tags.length && !e.mood) {
      data.entries = data.entries.filter((x) => x !== e);
      return true;
    }
    return false;
  }
  function selectEntry(id) {
    const changed = dropIfEmpty();
    currentId = id;
    appEl.classList.add('show-detail');
    if (changed) scheduleSave();
    renderList();
    renderEditor();
  }
  function newEntry() {
    if (!key) return;
    dropIfEmpty();
    const now = Date.now();
    const e = { id: uid(), title: '', body: '', mood: 0, tags: [], created: now, updated: now };
    data.entries.push(e);
    $('search').value = '';
    currentId = e.id;
    appEl.classList.add('show-detail');
    renderList();
    renderEditor();
    scheduleSave();
    $('f-title').focus();
  }
  function parseTags(s) {
    const seen = new Set();
    return s.split(',').map((t) => t.trim().replace(/^#+/, '').slice(0, 40)).filter((t) => {
      const k = t.toLowerCase(); if (!t || seen.has(k)) return false; seen.add(k); return true;
    }).slice(0, 30);
  }
  $('f-title').addEventListener('input', (ev) => { const e = current(); if (e) { e.title = ev.target.value; touch(e); } });
  $('f-body').addEventListener('input', (ev) => { const e = current(); if (e) { e.body = ev.target.value; touch(e); } });
  $('f-tags').addEventListener('input', (ev) => { const e = current(); if (e) { e.tags = parseTags(ev.target.value); touch(e); } });
  $('search').addEventListener('input', renderList);
  $('btn-new').addEventListener('click', newEntry);
  $('btn-new-2').addEventListener('click', newEntry);
  $('editor').addEventListener('submit', (ev) => ev.preventDefault());
  $('btn-save').addEventListener('click', async () => { await flush(); toast('Saved and re-encrypted.'); });
  $('btn-back').addEventListener('click', () => {
    if (dropIfEmpty()) { currentId = null; scheduleSave(); }
    appEl.classList.remove('show-detail'); renderList(); renderEditor();
  });
  $('btn-lock').addEventListener('click', () => lock('Locked. The key and decrypted entries were cleared from memory.'));
  $('btn-delete').addEventListener('click', (ev) => {
    const btn = ev.currentTarget;
    if (!deleteArm) {
      deleteArm = setTimeout(() => { deleteArm = 0; btn.textContent = 'Delete'; btn.classList.remove('confirming'); }, 3000);
      btn.textContent = 'Confirm delete'; btn.classList.add('confirming');
      return;
    }
    clearTimeout(deleteArm); deleteArm = 0; btn.textContent = 'Delete'; btn.classList.remove('confirming');
    data.entries = data.entries.filter((e) => e.id !== currentId);
    currentId = null;
    appEl.classList.remove('show-detail');
    renderList(); renderEditor();
    persist();
    toast('Entry deleted.');
  });

  /* ---------- auto-lock ---------- */
  function loadSettings() {
    try {
      const s = JSON.parse(safeGet(SETTINGS_KEY) || '{}');
      if ([1, 5, 15, 30, 60].includes(s.timeoutMin)) timeoutMin = s.timeoutMin;
    } catch (e) { /* defaults */ }
    $('timeout-select').value = String(timeoutMin);
  }
  $('timeout-select').addEventListener('change', (ev) => {
    timeoutMin = Number(ev.target.value);
    try { safeSet(SETTINGS_KEY, JSON.stringify({ timeoutMin })); } catch (e) { /* ignore */ }
    lastActivity = Date.now();
    toast('Auto-lock set to ' + ev.target.selectedOptions[0].textContent + '.');
  });
  function activity() { lastActivity = Date.now(); }
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel', 'input']) {
    document.addEventListener(ev, activity, { passive: true, capture: true });
  }
  function checkIdle() {
    if (!key) return;
    const left = timeoutMin * 60000 - (Date.now() - lastActivity);
    if (left <= 0) { lock('Locked automatically after ' + timeoutMin + ' minute' + (timeoutMin > 1 ? 's' : '') + ' of inactivity.'); return; }
    const s = Math.ceil(left / 1000);
    $('autolock').textContent = 'Auto-lock in ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  setInterval(checkIdle, 1000);
  document.addEventListener('visibilitychange', checkIdle);

  /* ---------- settings, change passphrase ---------- */
  $('btn-settings').addEventListener('click', () => openDialog('settings'));

  bindMeter($('setup-pass'), $('setup-meter'), $('setup-strength'));
  bindMeter($('cp-new'), $('cp-meter'), $('cp-strength'));

  $('changepw-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const old = $('cp-old').value; const np = $('cp-new').value;
    const err = checkNewPass(np, $('cp-confirm').value);
    showError($('cp-error'), err);
    if (err) return;
    const btn = $('cp-submit');
    setBusy(btn, true, 'Working...');
    await nextFrame();
    try {
      await flush();
      try { await VaultCrypto.unlock(old, storedEnvelope()); }
      catch (e) { showError($('cp-error'), 'Current passphrase is incorrect.'); return; }
      const r = await VaultCrypto.create(np, data);
      safeSet(STORE_KEY, JSON.stringify(r.envelope));
      key = r.key; header = r.header;
      for (const id of ['cp-old', 'cp-new', 'cp-confirm']) $(id).value = '';
      closeDialog($('dlg-changepw'));
      toast('Passphrase changed. All entries were re-encrypted with a new salt.');
    } catch (e) {
      showError($('cp-error'), 'Could not re-encrypt. Nothing was changed if storage is blocked or full.');
    } finally { setBusy(btn, false); }
  });

  /* ---------- export / import ---------- */
  $('btn-export').addEventListener('click', async () => {
    try {
      await flush();
      const raw = safeGet(STORE_KEY);
      if (!raw) throw new Error('empty');
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'encrypted-journal-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('Encrypted backup downloaded.');
    } catch (e) { toast('Export failed.', true); }
  });

  $('imp-file').addEventListener('change', async (ev) => {
    pendingImport = null;
    showError($('imp-error'), '');
    $('imp-file-info').textContent = '';
    const f = ev.target.files[0];
    if (!f) return;
    try {
      if (f.size > 20 * 1024 * 1024) throw new Error('File is too large to be a journal backup.');
      let parsed;
      try { parsed = JSON.parse(await f.text()); } catch (e) { throw new Error('File is not valid JSON.'); }
      pendingImport = VaultCrypto.validateEnvelope(parsed);
      $('imp-file-info').textContent = 'Valid backup format (' + pendingImport.iterations.toLocaleString() + ' PBKDF2 iterations).';
    } catch (e) {
      showError($('imp-error'), e.message || 'Invalid backup file.');
    }
  });
  $('import-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!pendingImport) { showError($('imp-error'), 'Choose a valid backup file first.'); return; }
    const hasVault = !!safeGet(STORE_KEY);
    if (hasVault && !$('imp-replace').checked) { showError($('imp-error'), 'Confirm that you want to replace the current vault.'); return; }
    const btn = $('imp-submit');
    setBusy(btn, true, 'Decrypting...');
    showError($('imp-error'), '');
    await nextFrame();
    try {
      const r = await VaultCrypto.unlock($('imp-pass').value, pendingImport);
      clearTimeout(saveTimer); dirty = false; await saveChain;
      safeSet(STORE_KEY, JSON.stringify(pendingImport));
      key = r.key; header = r.header; data = r.data;
      $('imp-pass').value = ''; $('imp-file').value = ''; pendingImport = null;
      closeDialog($('dlg-import'));
      closeDialog($('dlg-settings'));
      enterApp();
      toast('Imported ' + data.entries.length + ' entries.');
    } catch (e) {
      showError($('imp-error'), e instanceof VaultCrypto.VaultError && e.code === 'BAD_PASSPHRASE'
        ? 'Wrong passphrase for this backup.' : 'Could not import this backup. It may be damaged or storage is blocked.');
    } finally { setBusy(btn, false); }
  });

  /* ---------- destroy ---------- */
  $('destroy-input').addEventListener('input', (ev) => { $('destroy-submit').disabled = ev.target.value.trim() !== 'DESTROY'; });
  $('destroy-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if ($('destroy-input').value.trim() !== 'DESTROY') return;
    clearTimeout(saveTimer);
    safeDel(STORE_KEY);
    wipe();
    $('destroy-input').value = ''; $('destroy-submit').disabled = true;
    closeDialog($('dlg-destroy'));
    $('setup-meter').dataset.level = '0';
    showView('setup');
    toast('Vault destroyed.');
  });

  /* ---------- dialog wiring ---------- */
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-open],[data-close]');
    if (!t) return;
    if (t.hasAttribute('data-close')) { closeDialog(t.closest('dialog')); return; }
    const name = t.dataset.open;
    if (name === 'import') {
      $('imp-replace-row').hidden = !safeGet(STORE_KEY);
      $('imp-replace').checked = false;
      showError($('imp-error'), '');
    }
    openDialog(name);
  });
  for (const d of document.querySelectorAll('dialog')) {
    d.addEventListener('click', (ev) => { if (ev.target === d) closeDialog(d); });
  }

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', (ev) => {
    if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || !key) return;
    const k = ev.key.toLowerCase();
    if (k === 's') { ev.preventDefault(); flush().then(() => toast('Saved and re-encrypted.')); }
    else if (k === 'l') { ev.preventDefault(); lock('Locked. The key and decrypted entries were cleared from memory.'); }
    else if (k === 'n') { ev.preventDefault(); newEntry(); }
  });
  window.addEventListener('pagehide', () => { if (key && dirty) { clearTimeout(saveTimer); persist(); } });

  /* ---------- boot ---------- */
  function fatal(title, text, actions) {
    $('error-title').textContent = title;
    $('error-text').textContent = text;
    $('error-actions').hidden = !actions;
    showView('error');
  }
  $('error-import').addEventListener('click', () => { $('imp-replace-row').hidden = !safeGet(STORE_KEY); openDialog('import'); });
  $('error-destroy').addEventListener('click', () => openDialog('destroy'));

  function boot() {
    if (!window.crypto || !crypto.subtle) {
      fatal('Secure context required',
        'The Web Crypto API (crypto.subtle) is unavailable. Open this page over HTTPS or from localhost, in a current browser.');
      return;
    }
    try {
      localStorage.setItem('encjournal.probe', '1');
      localStorage.removeItem('encjournal.probe');
    } catch (e) {
      fatal('Storage is blocked',
        'This journal needs localStorage to keep your encrypted vault. Allow site data for this page or leave private browsing, then reload.');
      return;
    }
    buildMoods();
    loadSettings();
    const raw = safeGet(STORE_KEY);
    if (!raw) { showView('setup'); $('setup-pass').focus(); return; }
    try {
      VaultCrypto.validateEnvelope(JSON.parse(raw));
    } catch (e) {
      fatal('Stored vault is damaged',
        'The saved vault data could not be read. Import an encrypted backup to restore it, or destroy it to start fresh.', true);
      return;
    }
    showView('lock');
    $('lock-pass').focus();
  }
  boot();
})();
