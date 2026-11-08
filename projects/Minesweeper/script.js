(() => {
  'use strict';
  const PRESETS = {
    beginner: { w: 9, h: 9, m: 10, label: 'Beginner' },
    intermediate: { w: 16, h: 16, m: 40, label: 'Intermediate' },
    expert: { w: 30, h: 16, m: 99, label: 'Expert' }
  };
  const $ = id => document.getElementById(id);
  const boardEl = $('board'), wrapEl = $('boardWrap'), minesEl = $('mines'), timeEl = $('time');
  const statusEl = $('status'), presetSel = $('preset'), flagBtn = $('flagMode'), newBtn = $('newBtn');
  const customForm = $('customForm'), cw = $('cw'), ch = $('ch'), cm = $('cm'), customErr = $('customErr');
  const bestList = $('bestList');

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  let W, H, M, mine, adj, st, cells, state, flags, revealed, startTime, ticker, focusIdx, flagMode = false;
  // st: 0 hidden, 1 revealed, 2 flagged; state: ready | playing | won | lost

  function loadBest() {
    try { const o = JSON.parse(store.get('foundry.minesweeper.best') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
  }
  function renderBest() {
    const b = loadBest();
    bestList.textContent = '';
    for (const k of Object.keys(PRESETS)) {
      const li = document.createElement('li');
      const a = document.createElement('span'), t = document.createElement('span');
      a.textContent = PRESETS[k].label;
      t.textContent = typeof b[k] === 'number' ? b[k].toFixed(1) + ' s' : '—';
      li.append(a, t); bestList.appendChild(li);
    }
  }

  const nbrs = i => {
    const x = i % W, y = (i - x) / W, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) out.push(ny * W + nx);
    }
    return out;
  };

  function say(msg, cls) { statusEl.textContent = msg; statusEl.className = 'status' + (cls ? ' ' + cls : ''); }

  function fitCells() {
    const avail = Math.max(240, Math.min(window.innerWidth - 48, 920));
    const cs = Math.max(24, Math.min(36, Math.floor((avail - (W - 1) * 2) / W)));
    boardEl.style.setProperty('--cs', cs + 'px');
  }

  function newGame(keepFocus) {
    clearInterval(ticker); ticker = null;
    mine = new Uint8Array(W * H); adj = new Uint8Array(W * H); st = new Uint8Array(W * H);
    state = 'ready'; flags = 0; revealed = 0; startTime = 0; focusIdx = 0;
    timeEl.textContent = '0'; minesEl.textContent = M;
    boardEl.textContent = '';
    boardEl.style.gridTemplateColumns = 'repeat(' + W + ', var(--cs))';
    boardEl.setAttribute('aria-rowcount', H); boardEl.setAttribute('aria-colcount', W);
    cells = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < W * H; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cell'; b.dataset.i = i; b.setAttribute('role', 'gridcell');
      b.tabIndex = i === 0 ? 0 : -1;
      cells.push(b); frag.appendChild(b); paint(i);
    }
    boardEl.appendChild(frag);
    fitCells();
    say('Click any square to start. Your first click is always safe.');
    if (keepFocus) cells[0].focus();
  }

  function paint(i) {
    const b = cells[i], s = st[i];
    let cls = 'cell', txt = '', label;
    const pos = 'row ' + (Math.floor(i / W) + 1) + ' column ' + ((i % W) + 1) + ', ';
    delete b.dataset.n;
    if (s === 1) {
      cls += ' open';
      if (mine[i]) { txt = '✹'; label = 'mine'; }
      else if (adj[i]) { txt = String(adj[i]); b.dataset.n = adj[i]; label = adj[i] + ' adjacent mines'; }
      else label = 'empty';
    } else if (s === 2) { cls += ' flag'; txt = '⚑'; label = 'flagged'; }
    else label = 'hidden';
    b.className = cls; b.textContent = txt; b.setAttribute('aria-label', pos + label);
  }

  function placeMines(safe) {
    const banned = new Set([safe, ...nbrs(safe)]);
    if (W * H - banned.size < M) { banned.clear(); banned.add(safe); }
    const pool = [];
    for (let i = 0; i < W * H; i++) if (!banned.has(i)) pool.push(i);
    for (let k = 0; k < M; k++) { // partial Fisher-Yates
      const j = k + Math.floor(Math.random() * (pool.length - k));
      [pool[k], pool[j]] = [pool[j], pool[k]]; mine[pool[k]] = 1;
    }
    for (let i = 0; i < W * H; i++) { let c = 0; for (const n of nbrs(i)) c += mine[n]; adj[i] = c; }
  }

  function reveal(start) {
    if (st[start] !== 0) return;
    if (state === 'ready') {
      placeMines(start); state = 'playing'; startTime = performance.now();
      ticker = setInterval(tick, 100); say('Good luck!');
    }
    if (mine[start]) return lose(start);
    const q = [start]; st[start] = 1; revealed++;
    while (q.length) { // BFS flood fill through zero cells
      const i = q.shift(); paint(i);
      if (adj[i] !== 0) continue;
      for (const n of nbrs(i)) if (st[n] === 0) { st[n] = 1; revealed++; q.push(n); }
    }
    if (revealed === W * H - M) win();
  }

  function chord(i) {
    if (st[i] !== 1 || !adj[i]) return;
    const ns = nbrs(i);
    if (ns.filter(n => st[n] === 2).length !== adj[i]) return; // per-cell flag count must match
    for (const n of ns) {
      if (st[n] !== 0) continue;
      if (mine[n]) { lose(n); return; }
      reveal(n);
      if (state !== 'playing') return;
    }
  }

  function toggleFlag(i) {
    if (state === 'won' || state === 'lost' || st[i] === 1) return;
    if (st[i] === 0) { st[i] = 2; flags++; } else { st[i] = 0; flags--; }
    minesEl.textContent = M - flags; paint(i);
  }

  function tick() { timeEl.textContent = Math.floor((performance.now() - startTime) / 1000); }
  function elapsed() { return (performance.now() - startTime) / 1000; }

  function lose(hit) {
    state = 'lost'; clearInterval(ticker);
    for (let i = 0; i < W * H; i++) {
      if (mine[i] && st[i] !== 2) { st[i] = 1; paint(i); cells[i].classList.add('mine'); }
      else if (!mine[i] && st[i] === 2) { paint(i); cells[i].classList.add('wrong'); }
    }
    cells[hit].classList.add('boom');
    say('Boom! You hit a mine. Press New game to try again.', 'lose');
  }

  function win() {
    state = 'won'; clearInterval(ticker);
    const t = elapsed(); timeEl.textContent = Math.floor(t);
    for (let i = 0; i < W * H; i++) if (mine[i] && st[i] !== 2) { st[i] = 2; paint(i); }
    flags = M; minesEl.textContent = 0;
    for (let i = 0; i < W * H; i++) if (st[i] === 2) cells[i].classList.add('won');
    let msg = 'You win in ' + t.toFixed(1) + ' seconds!';
    const key = presetSel.value;
    if (PRESETS[key]) {
      const b = loadBest();
      if (typeof b[key] !== 'number' || t < b[key]) { b[key] = Math.round(t * 10) / 10; store.set('foundry.minesweeper.best', JSON.stringify(b)); msg += ' New best time!'; renderBest(); }
    }
    say(msg, 'win');
  }

  // ---- input (event delegation) ----
  const cellOf = e => { const b = e.target.closest && e.target.closest('.cell'); return b && boardEl.contains(b) ? +b.dataset.i : -1; };
  function primary(i) {
    if (state === 'won' || state === 'lost') return;
    if (flagMode && st[i] !== 1) return toggleFlag(i);
    if (st[i] === 1) chord(i); else if (st[i] === 0) reveal(i);
  }

  let press = null, longDone = false, lastType = 'mouse';
  boardEl.addEventListener('pointerdown', e => {
    lastType = e.pointerType; longDone = false;
    const i = cellOf(e); clearTimeout(press && press.t);
    if (i < 0 || e.pointerType === 'mouse') { press = null; return; }
    press = { x: e.clientX, y: e.clientY, t: setTimeout(() => {
      longDone = true; toggleFlag(i);
      if (navigator.vibrate) { try { navigator.vibrate(30); } catch (err) { /* unsupported */ } }
    }, 450) };
  });
  boardEl.addEventListener('pointermove', e => {
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.t); press = null; }
  });
  const cancelPress = () => { if (press) { clearTimeout(press.t); press = null; } };
  boardEl.addEventListener('pointerup', cancelPress);
  boardEl.addEventListener('pointercancel', cancelPress);
  boardEl.addEventListener('click', e => {
    if (e.detail === 0) return; // keyboard-synthesized click; keydown handler already acted
    if (longDone) { longDone = false; e.preventDefault(); return; }
    const i = cellOf(e); if (i >= 0) { setFocus(i, false); primary(i); }
  });
  boardEl.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (lastType !== 'mouse') return; // touch long-press handled above
    const i = cellOf(e); if (i >= 0) toggleFlag(i);
  });
  boardEl.addEventListener('auxclick', e => { // middle click chords
    if (e.button === 1) { e.preventDefault(); const i = cellOf(e); if (i >= 0 && state === 'playing') chord(i); }
  });

  function setFocus(i, doFocus) {
    cells[focusIdx].tabIndex = -1; focusIdx = i; cells[i].tabIndex = 0;
    if (doFocus) cells[i].focus();
  }
  boardEl.addEventListener('keydown', e => {
    const i = cellOf(e); if (i < 0) return;
    const x = i % W, y = (i - x) / W; let n = -1;
    switch (e.key) {
      case 'ArrowLeft': if (x > 0) n = i - 1; break;
      case 'ArrowRight': if (x < W - 1) n = i + 1; break;
      case 'ArrowUp': if (y > 0) n = i - W; break;
      case 'ArrowDown': if (y < H - 1) n = i + W; break;
      case 'Home': n = y * W; break;
      case 'End': n = y * W + W - 1; break;
      case 'f': case 'F': e.preventDefault(); toggleFlag(i); return;
      case ' ': case 'Enter': e.preventDefault(); primary(i); return;
      default: return;
    }
    e.preventDefault(); if (n >= 0) setFocus(n, true);
  });
  // Space/Enter would also fire a click on buttons; we preventDefault above so it does not.

  // ---- settings ----
  function applyPreset() {
    const k = presetSel.value;
    customForm.hidden = k !== 'custom';
    if (PRESETS[k]) { ({ w: W, h: H, m: M } = PRESETS[k]); newGame(false); }
    else applyCustom(true);
    store.set('foundry.minesweeper.preset', JSON.stringify({ k, w: +cw.value, h: +ch.value, m: +cm.value }));
  }
  function applyCustom(silent) {
    const w = parseInt(cw.value, 10), h = parseInt(ch.value, 10), m = parseInt(cm.value, 10);
    let err = '';
    if (!(w >= 5 && w <= 40)) err = 'Width must be 5 to 40.';
    else if (!(h >= 5 && h <= 30)) err = 'Height must be 5 to 30.';
    else if (!(m >= 1 && m <= w * h - 9)) err = 'Mines must be 1 to ' + (w * h - 9) + ' for this size.';
    customErr.textContent = err;
    if (err) { if (!W) { W = 9; H = 9; M = 10; newGame(false); } return; }
    W = w; H = h; M = m; newGame(false);
    if (!silent) store.set('foundry.minesweeper.preset', JSON.stringify({ k: 'custom', w, h, m }));
  }
  presetSel.addEventListener('change', applyPreset);
  customForm.addEventListener('submit', e => { e.preventDefault(); applyCustom(false); });
  newBtn.addEventListener('click', () => newGame(true));
  flagBtn.addEventListener('click', () => {
    flagMode = !flagMode; flagBtn.setAttribute('aria-pressed', flagMode);
    flagBtn.textContent = 'Flag mode: ' + (flagMode ? 'on' : 'off');
  });
  window.addEventListener('resize', fitCells);

  try {
    const s = JSON.parse(store.get('foundry.minesweeper.preset') || 'null');
    if (s && (PRESETS[s.k] || s.k === 'custom')) {
      presetSel.value = s.k;
      if (s.w) cw.value = s.w; if (s.h) ch.value = s.h; if (s.m) cm.value = s.m;
    }
  } catch (e) { /* ignore corrupt state */ }
  renderBest();
  applyPreset();
})();
