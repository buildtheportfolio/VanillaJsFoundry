(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'foundry.infinite-runner.v1';

  // ---------- constants (pixels, seconds) ----------
  const W = 720, H = 320, PX = 150;          // logical canvas size, player's fixed screen x
  const DT = 1 / 120, CH = 1200;              // physics step, chunk length
  const G = 2200, JUMP = 760, JUMP2 = 640;     // gravity, first and second jump speeds
  const AIR_T = (2 * JUMP) / G;                // air time of a full single jump
  const STAND = 46, DUCK = 24, PW = 24;        // player heights / hit width
  const BASE_Y = 250, COYOTE = 0.09, BUFFER = 0.1;
  const speedAt = (x) => Math.min(620, 280 + 0.0125 * x);
  const minSpace = (v) => 0.95 * v;            // free run between hazards so each is clearable

  // ---------- seeded randomness ----------
  function strHash(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function mix(a, b) {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return (h ^ (h >>> 15)) >>> 0;
  }
  function mulberry32(a) {
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash01 = (seed, i) => mix(seed, i | 0) / 4294967296;
  function vnoise(seed, x) {            // smooth 1D value noise in [0,1], purely a function of position
    const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    return hash01(seed, i) * (1 - s) + hash01(seed, i + 1) * s;
  }

  // ---------- world (stateless in position: chunk i depends only on seed + i) ----------
  let seedStr = '', seed = 0;
  let chunks = new Map();

  function groundBase(x) {
    const A = 34 * Math.min(1, x / 2500);
    return BASE_Y + A * (vnoise(seed, x / 420) - 0.5) * 2 + A * 0.3 * (vnoise(seed + 7, x / 150) - 0.5) * 2;
  }
  function genChunk(i) {
    const rng = mulberry32(mix(seed, 0x1000 + i)), c = { gaps: [], obs: [], coins: [] };
    if (i < 1) return c;
    const x0 = i * CH, x1 = x0 + CH;
    let cur = x0 + minSpace(speedAt(x0)) * 0.5; const limit = x1 - minSpace(speedAt(x1)) * 0.5;
    while (cur < limit) {
      const v = speedAt(cur), ms = minSpace(v), d = Math.min(1, cur / 20000), r = rng();
      if (r < 0.2 + 0.1 * d && i >= 2) {
        const w = Math.round((0.3 + 0.25 * rng()) * v * AIR_T);   // always < 55% of one jump's reach
        if (cur + w > limit) break;
        c.gaps.push({ x0: cur, x1: cur + w });
        if (rng() < 0.6) for (let k = -1; k <= Math.floor(w / 34) + 1; k++) { const t = (k * 34 + 17) / w; c.coins.push({ x: cur + k * 34 + 17, arc: 55 + 70 * Math.sin(Math.PI * Math.min(1, Math.max(0, t))), got: false }); }
        cur += w + ms;
      } else if (r < 0.55) {
        const w = 22 + Math.round(rng() * 20) + (rng() < 0.25 ? 22 : 0), h = 28 + Math.round(rng() * (16 + 14 * d));
        if (cur + w > limit) break;
        c.obs.push({ t: 'c', x: cur, w, h }); cur += w + ms * (1 + rng() * 0.4);
      } else if (r < 0.72 && i >= 2) {
        if (cur + 54 > limit) break;
        c.obs.push({ t: 'f', x: cur, w: 54, h: 16 }); cur += 54 + ms * (1 + rng() * 0.3);
      } else {
        const n = 3 + Math.floor(rng() * 4), hi = rng() < 0.4 ? 70 : 24;
        for (let k = 0; k < n; k++) c.coins.push({ x: cur + k * 30, arc: hi, got: false });
        cur += n * 30 + 40;
      }
    }
    return c;
  }
  function chunk(i) {
    let c = chunks.get(i);
    if (!c) { c = genChunk(i); chunks.set(i, c); }
    return c;
  }
  function inGap(x) {
    const c = chunk(Math.floor(x / CH));
    for (const g of c.gaps) if (x >= g.x0 && x <= g.x1) return true;
    return false;
  }
  const groundAt = (x) => (inGap(x) ? NaN : groundBase(x));
  function obstacleRect(o) {
    const gy = groundBase(o.x + o.w / 2);
    return o.t === 'c' ? { x: o.x, y: gy - o.h, w: o.w, h: o.h } : { x: o.x, y: gy - STAND, w: o.w, h: o.h };
  }

  // ---------- state ----------
  const canvas = $('game'), ctx = canvas.getContext('2d'), live = $('live');
  let state = 'idle', dist = 0, coins = 0, hi = 0, bySeed = {};
  let pl = null, dark = false, tShake = 0, parts = [];
  const keys = { jump: false, duck: false }, touch = { jump: false, duck: false };
  let swipeDuck = 0, jumpReq = 0;

  function say(m) { live.textContent = ''; setTimeout(() => { live.textContent = m; }, 30); }
  const score = () => Math.floor(dist / 12) + coins * 10;
  function loadStore() {
    try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d) { hi = Number(d.hi) || 0; bySeed = d.bySeed && typeof d.bySeed === 'object' ? d.bySeed : {}; return d.seed; } } catch (e) { /* ignore */ }
    return null;
  }
  function saveStore() {
    try { const keysArr = Object.keys(bySeed); if (keysArr.length > 40) delete bySeed[keysArr[0]]; localStorage.setItem(KEY, JSON.stringify({ hi, bySeed, seed: seedStr })); } catch (e) { /* storage blocked */ }
  }

  const WORDS = ['ember', 'quartz', 'lagoon', 'comet', 'maple', 'cobalt', 'nimbus', 'fjord', 'saffron', 'willow', 'zephyr', 'pebble', 'orchid', 'basalt', 'meadow', 'tundra'];
  function randomSeed() { return WORDS[Math.floor(Math.random() * WORDS.length)] + '-' + Math.floor(Math.random() * 9000 + 1000); }
  function shareUrl() {
    try { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('seed', seedStr); return u.toString(); } catch (e) { return '?seed=' + encodeURIComponent(seedStr); }
  }
  function setSeed(s) {
    seedStr = (s || '').trim().slice(0, 40) || randomSeed(); seed = strHash(seedStr); chunks = new Map();
    $('seedIn').value = seedStr;
    try { history.replaceState(null, '', '?seed=' + encodeURIComponent(seedStr)); } catch (e) { /* file:// or sandbox */ }
    saveStore(); resetRun(); showIdle();
  }

  function resetRun() {
    dist = 0; coins = 0; parts = []; swipeDuck = 0; jumpReq = 0;
    pl = { feet: groundBase(0), vy: 0, ground: true, jumps: 0, coyote: 0, buffer: 0, cut: false, anim: 0, duck: false };
    chunks = new Map(); hud();
  }
  function hud() {
    $('hudScore').textContent = score(); $('hudCoins').textContent = coins;
    $('hudSpeed').textContent = (speedAt(dist) / 280).toFixed(1) + 'x'; $('hudHigh').textContent = hi;
  }

  function overlay(show, title, text, btn) {
    const ov = $('overlay'); ov.hidden = !show; if (!show) return;
    $('ovTitle').textContent = title; $('ovText').textContent = text; $('ovBtn').textContent = btn; $('ovBtn').focus({ preventScroll: true });
  }
  function showIdle() {
    state = 'idle';
    overlay(true, 'Infinite Runner', 'Seed "' + seedStr + '" (' + (bySeed[seedStr] || 0) + ' best on this seed). Press Space, tap, or Run.', 'Run');
  }
  function start() { resetRun(); state = 'run'; overlay(false); canvas.focus({ preventScroll: true }); say('Go'); }
  function die() {
    state = 'over'; tShake = 0.3;
    for (let i = 0; i < 16; i++) parts.push({ x: dist, y: pl.feet - 20, vx: (Math.random() - 0.5) * 300, vy: -Math.random() * 400, life: 0.7, c: '#ff6b6b' });
    const s = score(); let msg = 'Score ' + s + ', ' + coins + ' coins.';
    if (s > hi) { hi = s; msg += ' New high score!'; }
    if (s > (bySeed[seedStr] || 0)) bySeed[seedStr] = s;
    saveStore(); hud();
    overlay(true, 'Crashed', msg + ' Seed "' + seedStr + '".', 'Run again');
    say('Game over. ' + msg);
  }
  function togglePause() {
    if (state === 'run') { state = 'paused'; overlay(true, 'Paused', 'Press P, Space or the button to resume.', 'Resume'); $('tPause').textContent = 'Resume'; }
    else if (state === 'paused') { state = 'run'; overlay(false); $('tPause').textContent = 'Pause'; canvas.focus({ preventScroll: true }); }
  }
  function primary() { if (state === 'paused') togglePause(); else start(); }

  // ---------- simulation ----------
  function jumpNow() {
    if (pl.ground || pl.coyote > 0) { pl.vy = -JUMP; pl.ground = false; pl.coyote = 0; pl.jumps = 1; pl.cut = false; puff(); return true; }
    if (pl.jumps < 2) { pl.vy = -JUMP2; pl.jumps = 2; pl.cut = false; puff(); return true; }
    return false;
  }
  function puff() { for (let i = 0; i < 5; i++) parts.push({ x: dist - 6, y: pl.feet, vx: -80 - Math.random() * 80, vy: -Math.random() * 80, life: 0.35, c: dark ? '#cbd5ff' : '#ffffff' }); }

  function step(dt) {
    const v = speedAt(dist), prevFeet = pl.feet;
    dist += v * dt;
    const duckHeld = keys.duck || touch.duck || swipeDuck > 0;
    if (swipeDuck > 0) swipeDuck -= dt;
    if (jumpReq > 0) { pl.buffer = BUFFER; jumpReq = 0; } else pl.buffer -= dt;
    pl.duck = duckHeld && pl.ground;

    const a = groundAt(dist - 8), b = groundAt(dist + 8);
    const gy = Number.isNaN(a) ? b : Number.isNaN(b) ? a : Math.min(a, b);

    if (pl.ground) {
      if (Number.isNaN(gy) || gy - pl.feet > 14) { pl.ground = false; pl.coyote = COYOTE; pl.jumps = 1; }
      else { pl.feet = gy; pl.vy = 0; pl.jumps = 0; }
    } else pl.coyote -= dt;

    if (pl.buffer > 0 && jumpNow()) pl.buffer = 0;

    if (!pl.ground) {
      const held = keys.jump || touch.jump;
      if (!held && !pl.cut && pl.vy < -300) { pl.vy *= 0.55; pl.cut = true; }
      pl.vy += G * (duckHeld && pl.vy > -200 ? 2.2 : 1) * dt;
      pl.feet += pl.vy * dt;
      if (pl.vy >= 0 && !Number.isNaN(gy) && prevFeet <= gy + 6 && pl.feet >= gy) {
        pl.feet = gy; pl.vy = 0; pl.ground = true; pl.jumps = 0; puff();
      }
    }
    pl.anim += v * dt * 0.03;

    // hazards
    const h = pl.duck ? DUCK : STAND, px0 = dist - PW / 2 + 3, px1 = dist + PW / 2 - 3, py0 = pl.feet - h + 4, py1 = pl.feet - 1;
    const c0 = Math.floor((dist - 120) / CH), c1 = Math.floor((dist + 160) / CH);
    for (let ci = Math.max(0, c0); ci <= c1; ci++) {
      const c = chunk(ci);
      for (const o of c.obs) {
        const r = obstacleRect(o);
        if (px1 > r.x + 3 && px0 < r.x + r.w - 3 && py1 > r.y + 3 && py0 < r.y + r.h - 1) { die(); return; }
      }
      for (const k of c.coins) {
        if (k.got) continue;
        const cy = groundBase(k.x) - k.arc;
        if (Math.abs(k.x - dist) < 22 && Math.abs(cy - (pl.feet - h / 2)) < 30) {
          k.got = true; coins++; for (let i = 0; i < 4; i++) parts.push({ x: k.x, y: cy, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160, life: 0.4, c: '#ffd43b' });
        }
      }
    }
    if (pl.feet > H + 90) die();
    for (const [ci] of chunks) if (ci < c0 - 2) chunks.delete(ci);
  }

  // ---------- input ----------
  function pressJump() {
    if (state === 'idle' || state === 'over') { start(); return; }
    if (state === 'paused') { togglePause(); return; }
    jumpReq = 1;
  }
  const JKEYS = ['Space', 'ArrowUp', 'KeyW'], DKEYS = ['ArrowDown', 'KeyS'];
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const onBtn = e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT');
    if (JKEYS.includes(e.code)) {
      if (e.target.tagName === 'INPUT' || (onBtn && e.code === 'Space')) return;
      e.preventDefault(); if (!keys.jump) pressJump(); keys.jump = true;
    } else if (DKEYS.includes(e.code)) { if (e.target.tagName === 'INPUT') return; e.preventDefault(); keys.duck = true; }
    else if (e.target.tagName === 'INPUT') return;
    else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    else if (e.code === 'KeyR') start();
    else if (e.code === 'KeyN') setSeed('');
    else if (e.code === 'Enter' && !onBtn && state !== 'run') { e.preventDefault(); primary(); }
  });
  document.addEventListener('keyup', (e) => {
    if (JKEYS.includes(e.code)) keys.jump = false;
    if (DKEYS.includes(e.code)) keys.duck = false;
  });
  window.addEventListener('blur', () => { keys.jump = keys.duck = touch.jump = touch.duck = false; if (state === 'run') togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'run') togglePause(); });

  // tap = jump, swipe down = duck
  let sw = null;
  const screenEl = $('screen');
  screenEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    sw = { id: e.pointerId, x: e.clientX, y: e.clientY, done: false };
    screenEl.setPointerCapture(e.pointerId);
  });
  screenEl.addEventListener('pointermove', (e) => {
    if (!sw || sw.id !== e.pointerId || sw.done) return;
    if (e.clientY - sw.y > 36 && Math.abs(e.clientX - sw.x) < 80) { sw.done = true; swipeDuck = 0.6; }
  });
  screenEl.addEventListener('pointerup', (e) => {
    if (!sw || sw.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - sw.x, e.clientY - sw.y);
    if (!sw.done && moved < 24) pressJump();
    sw = null;
  });
  screenEl.addEventListener('pointercancel', () => { sw = null; });

  function holdBtn(id, name) {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('down');
      if (name === 'jump') { if (!touch.jump) pressJump(); }
      touch[name] = true;
    });
    const up = () => { touch[name] = false; b.classList.remove('down'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  holdBtn('tJump', 'jump'); holdBtn('tDuck', 'duck');
  $('tPause').addEventListener('click', () => { togglePause(); $('tPause').blur(); });
  $('ovBtn').addEventListener('click', primary);

  $('seedApply').addEventListener('click', () => setSeed($('seedIn').value));
  $('seedIn').addEventListener('keydown', (e) => { if (e.key === 'Enter') setSeed($('seedIn').value); });
  $('seedRand').addEventListener('click', () => { setSeed(''); $('seedMsg').textContent = 'New seed ready.'; });
  $('seedCopy').addEventListener('click', async () => {
    const url = shareUrl(); let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { /* fall through */ }
    $('seedMsg').textContent = ok ? 'Link copied.' : 'Copy this link: ' + url;
  });

  // ---------- rendering ----------
  function pal() {
    return dark
      ? { sky: ['#0b1030', '#2b2a63'], far: '#1c2150', mid: '#262c66', near: '#12183a', ground: '#2a2447', grass: '#7bdc9b', ink: '#e9ecff' }
      : { sky: ['#8fd3ff', '#fdf2d0'], far: '#9fb7d8', mid: '#7fb89a', near: '#4f9a6a', ground: '#8b6a4a', grass: '#58c26d', ink: '#2b2140' };
  }
  function layer(cam, f, base, amp, wl, sd, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let sx = 0; sx <= W + 8; sx += 8) ctx.lineTo(sx, base - amp * vnoise(sd, (cam * f + sx) / wl));
    ctx.lineTo(W, H); ctx.fill();
  }
  function draw() {
    const p = pal(), cam = dist - PX;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (tShake > 0) ctx.translate((Math.random() - 0.5) * 8 * tShake * 3, (Math.random() - 0.5) * 8 * tShake * 3);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, p.sky[0]); g.addColorStop(1, p.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
    if (dark) { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const x = ((hash01(seed + 3, i) * 1400 - cam * 0.03) % 740 + 740) % 740 - 10; ctx.globalAlpha = 0.4 + 0.5 * hash01(seed + 4, i); ctx.fillRect(x, hash01(seed + 5, i) * 140, 2, 2); } ctx.globalAlpha = 1; }
    else { ctx.fillStyle = 'rgba(255,236,160,.9)'; ctx.beginPath(); ctx.arc(560 - (cam * 0.01) % 40, 70, 26, 0, Math.PI * 2); ctx.fill(); }
    layer(cam, 0.1, 190, 90, 260, seed + 11, p.far);
    layer(cam, 0.3, 235, 60, 170, seed + 12, p.mid);
    // trees on the near parallax layer
    const f = 0.6, t0 = Math.floor(cam * f / 90) - 1;
    ctx.fillStyle = p.near;
    for (let k = t0; k < t0 + W / 90 + 3; k++) {
      if (hash01(seed + 20, k) < 0.45) continue;
      const tx = k * 90 + hash01(seed + 21, k) * 50 - cam * f, th = 34 + hash01(seed + 22, k) * 36;
      ctx.beginPath(); ctx.moveTo(tx - 16, 268); ctx.lineTo(tx, 268 - th); ctx.lineTo(tx + 16, 268); ctx.fill();
    }
    // terrain (gaps are exact chunk data, so the picture matches the collision)
    const gaps = [];
    for (let ci = Math.max(0, Math.floor(cam / CH)); ci <= Math.floor((cam + W) / CH); ci++) for (const gp of chunk(ci).gaps) gaps.push(gp);
    gaps.sort((a, b) => a.x0 - b.x0);
    let a = cam - 4;
    const segs = [];
    for (const gp of gaps) { if (gp.x0 > a) segs.push([a, Math.min(gp.x0, cam + W + 4)]); a = Math.max(a, gp.x1); }
    if (a < cam + W + 4) segs.push([a, cam + W + 4]);
    for (const [s0, s1] of segs) {
      if (s1 <= s0) continue;
      ctx.beginPath(); ctx.moveTo(s0 - cam, H + 4);
      for (let x = s0; x < s1; x += 6) ctx.lineTo(x - cam, groundBase(x));
      ctx.lineTo(s1 - cam, groundBase(s1)); ctx.lineTo(s1 - cam, H + 4); ctx.closePath();
      ctx.fillStyle = p.ground; ctx.fill();
      ctx.beginPath(); ctx.moveTo(s0 - cam, groundBase(s0));
      for (let x = s0; x < s1; x += 6) ctx.lineTo(x - cam, groundBase(x));
      ctx.lineTo(s1 - cam, groundBase(s1)); ctx.strokeStyle = p.grass; ctx.lineWidth = 5; ctx.stroke();
    }
    // obstacles + coins
    for (let ci = Math.max(0, Math.floor((cam - 100) / CH)); ci <= Math.floor((cam + W + 100) / CH); ci++) {
      const c = chunk(ci);
      for (const o of c.obs) {
        const r = obstacleRect(o), x = r.x - cam; if (x < -80 || x > W + 20) continue;
        if (o.t === 'c') {
          ctx.fillStyle = dark ? '#35c47a' : '#2f9e5b'; ctx.fillRect(x, r.y, r.w, r.h + 8);
          ctx.fillRect(x - 5, r.y + r.h * 0.3, 6, 10); ctx.fillRect(x + r.w - 1, r.y + r.h * 0.45, 6, 10);
          ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + r.w - 5, r.y, 5, r.h + 8);
        } else {
          ctx.fillStyle = dark ? '#ff7a8a' : '#c2255c'; ctx.beginPath(); ctx.ellipse(x + r.w / 2, r.y + r.h / 2, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); ctx.fill();
          const fl = Math.sin(performance.now() / 70) * 8; ctx.fillStyle = dark ? '#ffd0d6' : '#f783ac';
          ctx.beginPath(); ctx.moveTo(x + 18, r.y + 4); ctx.lineTo(x + 28, r.y - 6 + fl); ctx.lineTo(x + 36, r.y + 4); ctx.fill();
        }
      }
      for (const k of c.coins) {
        if (k.got) continue; const x = k.x - cam; if (x < -10 || x > W + 10) continue;
        const y = groundBase(k.x) - k.arc, w = Math.abs(Math.cos(performance.now() / 260 + k.x)) * 6 + 2;
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.ellipse(x, y, w, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e67700'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    // player
    if (state !== 'over') {
      const duck = pl.duck, h = duck ? DUCK : STAND, x = PX - 14, y = pl.feet - h;
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(PX, groundBase(dist) + 3, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark ? '#ffb86b' : '#6d3df0'; ctx.fillRect(x, y, 28, h - (duck ? 0 : 8));
      if (!duck) { const s = Math.sin(pl.anim * 6) * (pl.ground ? 6 : 2); ctx.fillStyle = dark ? '#ff9f43' : '#4c2bb8'; ctx.fillRect(x + 4 + s, y + h - 8, 7, 8); ctx.fillRect(x + 17 - s, y + h - 8, 7, 8); }
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 17, y + 6, 8, 8); ctx.fillStyle = '#111'; ctx.fillRect(x + 21, y + 8, 4, 4);
    }
    for (const q of parts) { ctx.globalAlpha = Math.max(0, q.life * 2); ctx.fillStyle = q.c; ctx.fillRect(q.x - cam, q.y, 4, 4); }
    ctx.globalAlpha = 1;
  }

  // ---------- main loop ----------
  let last = 0, acc = 0, lastScore = -1;
  function frame(t) {
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    if (state === 'run') {
      acc += dt;
      while (acc >= DT && state === 'run') { step(DT); acc -= DT; }
      const s = score(); if (s !== lastScore) { lastScore = s; hud(); }
    } else acc = 0;
    if (tShake > 0) tShake -= dt;
    for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 900 * dt; q.life -= dt; }
    parts = parts.filter((q) => q.life > 0);
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- init ----------
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  dark = !!(mq && mq.matches);
  if (mq && mq.addEventListener) mq.addEventListener('change', (e) => { dark = e.matches; });
  const stored = loadStore();
  let urlSeed = null;
  try { urlSeed = new URLSearchParams(location.search).get('seed'); } catch (e) { /* ignore */ }
  setSeed(urlSeed || (typeof stored === 'string' && stored) || randomSeed());
  requestAnimationFrame((t) => { last = t; frame(t); });
  window.__ir = { chunk, speedAt, AIR_T, CH, groundBase, setSeed };
})();
