(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'foundry.cellular-automaton.v1';

  const PRESETS = [
    { name: 'Conway Life', rule: 'B3/S23' }, { name: 'HighLife', rule: 'B36/S23' },
    { name: 'Seeds', rule: 'B2/S' }, { name: 'Day & Night', rule: 'B3678/S34678' },
    { name: 'Replicator', rule: 'B1357/S1357' }, { name: 'Maze', rule: 'B3/S12345' },
    { name: 'Diamoeba', rule: 'B35678/S5678' }, { name: '2x2', rule: 'B36/S125' },
    { name: 'Anneal', rule: 'B4678/S35678' }
  ];
  const ELEM = [30, 90, 110, 184, 54, 22, 60, 150, 126, 45];

  const PATTERNS = {
    Glider: ['.O.', '..O', 'OOO'],
    'Blinker': ['OOO'],
    Toad: ['.OOO', 'OOO.'],
    Beacon: ['OO..', 'OO..', '..OO', '..OO'],
    'Pentadecathlon': ['..O....O..', 'OO.OOOO.OO', '..O....O..'],
    LWSS: ['.O..O', 'O....', 'O...O', 'OOOO.'],
    'R-pentomino': ['.OO', 'OO.', '.O.'],
    Acorn: ['.O.....', '...O...', 'OO..OOO'],
    Diehard: ['......O.', 'OO......', '.O...OOO'],
    'Gosper gun': [
      '........................O...........',
      '......................O.O...........',
      '............OO......OO............OO',
      '...........O...O....OO............OO',
      'OO........O.....O...OO..............',
      'OO........O...O.OO....O.O...........',
      '..........O.....O.......O...........',
      '...........O...O....................',
      '............OO......................'
    ]
  };

  const canvas = $('board'), ctx = canvas.getContext('2d');
  const wrapEl = $('wrap');
  const live = $('live');

  const st = { mode: 'life', rule: 'B3/S23', elem: 30, wrap: true, size: 128, speed: 20, tool: 'draw', pattern: 'Glider', rot: 0 };
  let W = 0, H = 0, S = 0, cur, nxt, off, offCtx, img, u32;
  let gen = 0, pop = 0, row = 0, running = false, dirty = true;
  let lut = new Uint8Array(18);
  let view = { s: 1, ox: 0, oy: 0 };
  let cw = 0, ch = 0, dpr = 1;
  let cellColor = 0xff44, hover = null;
  let saveTimer = 0, touched = false;

  function say(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); }

  // ---------- rules ----------
  function parseRule(str) {
    const m = /^\s*B([0-8]*)\s*\/\s*S([0-8]*)\s*$/i.exec(str);
    if (!m) return null;
    const birth = new Set(m[1].split('').map(Number)), surv = new Set(m[2].split('').map(Number));
    const t = new Uint8Array(18);
    for (let n = 0; n < 9; n++) { t[n] = birth.has(n) ? 1 : 0; t[9 + n] = surv.has(n) ? 1 : 0; }
    const f = (s) => [...s].sort((a, b) => a - b).join('');
    return { lut: t, canon: 'B' + f(birth) + '/S' + f(surv) };
  }

  // ---------- grid ----------
  function alloc(size) {
    W = H = size; S = W + 2;
    cur = new Uint8Array(S * (H + 2)); nxt = new Uint8Array(S * (H + 2));
    off = document.createElement('canvas'); off.width = W; off.height = H;
    offCtx = off.getContext('2d'); img = offCtx.createImageData(W, H); u32 = new Uint32Array(img.data.buffer);
    gen = 0; pop = 0; row = 0; dirty = true;
    $('sizeOut').textContent = W + 'x' + H;
  }

  function seed1D() { cur.fill(0); row = 0; cur[S + 1 + (W >> 1)] = 1; pop = 1; }

  function countPop() {
    let p = 0;
    for (let y = 1; y <= H; y++) { const r = y * S; for (let x = 1; x <= W; x++) p += cur[r + x]; }
    pop = p;
  }

  function fillBorder(g) {
    if (st.wrap) {
      for (let x = 1; x <= W; x++) { g[x] = g[H * S + x]; g[(H + 1) * S + x] = g[S + x]; }
      for (let y = 0; y <= H + 1; y++) { g[y * S] = g[y * S + W]; g[y * S + W + 1] = g[y * S + 1]; }
    } else {
      g.fill(0, 0, S); g.fill(0, (H + 1) * S, (H + 2) * S);
      for (let y = 0; y <= H + 1; y++) { g[y * S] = 0; g[y * S + W + 1] = 0; }
    }
  }

  // Flat Uint8Array with a 1-cell padded border: no bounds checks in the inner loop.
  function step2D() {
    fillBorder(cur);
    const g = cur, o = nxt, t = lut;
    let p = 0;
    for (let y = 1; y <= H; y++) {
      const r = y * S, u = r - S, d = r + S;
      for (let x = 1; x <= W; x++) {
        const i = r + x;
        const n = g[u + x - 1] + g[u + x] + g[u + x + 1] + g[i - 1] + g[i + 1] + g[d + x - 1] + g[d + x] + g[d + x + 1];
        const v = t[g[i] * 9 + n];
        o[i] = v; p += v;
      }
    }
    cur = o; nxt = g; pop = p;
  }

  function step1D() {
    let src = row;
    if (row >= H - 1) {
      cur.copyWithin(S, 2 * S, (H + 1) * S);
      cur.fill(0, H * S, (H + 1) * S);
      src = H - 2; row = H - 1;
    } else { row++; }
    const a = (src + 1) * S + 1, b = (row + 1) * S + 1, rule = st.elem;
    for (let x = 0; x < W; x++) {
      const l = x > 0 ? cur[a + x - 1] : (st.wrap ? cur[a + W - 1] : 0);
      const c = cur[a + x];
      const r = x < W - 1 ? cur[a + x + 1] : (st.wrap ? cur[a] : 0);
      cur[b + x] = (rule >> ((l << 2) | (c << 1) | r)) & 1;
    }
    countPop();
  }

  function stepOnce() {
    if (st.mode === 'life') step2D(); else step1D();
    gen++; dirty = true;
  }

  function randomize() {
    if (st.mode === 'life') {
      cur.fill(0);
      for (let y = 1; y <= H; y++) for (let x = 1; x <= W; x++) cur[y * S + x] = Math.random() < 0.3 ? 1 : 0;
    } else {
      cur.fill(0); row = 0;
      for (let x = 0; x < W; x++) cur[S + 1 + x] = Math.random() < 0.5 ? 1 : 0;
    }
    gen = 0; countPop(); dirty = true; say('Randomized. Population ' + pop);
  }

  function clearAll() {
    cur.fill(0); gen = 0; pop = 0; row = 0;
    if (st.mode === 'elem') seed1D();
    dirty = true; say('Cleared');
  }

  // ---------- view ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = wrapEl.clientWidth; ch = wrapEl.clientHeight;
    canvas.width = Math.max(1, Math.round(cw * dpr)); canvas.height = Math.max(1, Math.round(ch * dpr));
    dirty = true;
  }
  function fit() {
    touched = false;
    const s = Math.min(cw / W, ch / H);
    view.s = Math.max(0.5, s); view.ox = (cw - W * view.s) / 2; view.oy = (ch - H * view.s) / 2; dirty = true;
  }
  function zoomAt(px, py, f) {
    const ns = Math.min(40, Math.max(0.5, view.s * f));
    touched = true;
    view.ox = px - (px - view.ox) * ns / view.s; view.oy = py - (py - view.oy) * ns / view.s; view.s = ns; dirty = true;
  }
  function cellAt(px, py) {
    const x = Math.floor((px - view.ox) / view.s), y = Math.floor((py - view.oy) / view.s);
    return x >= 0 && y >= 0 && x < W && y < H ? { x, y } : null;
  }

  // ---------- drawing ----------
  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const hex = (cs.getPropertyValue('--cell').trim() || '#1f2a44').replace('#', '');
    const n = parseInt(hex.length === 3 ? hex.replace(/./g, '$&$&') : hex, 16);
    cellColor = (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff)) >>> 0;
    dirty = true;
  }

  function patternCells() {
    const rows = PATTERNS[st.pattern]; const cells = [];
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === 'O') cells.push([x, y]); });
    let c = cells;
    for (let k = 0; k < st.rot; k++) c = c.map(([x, y]) => [-y, x]);
    const minX = Math.min(...c.map((p) => p[0])), minY = Math.min(...c.map((p) => p[1]));
    c = c.map(([x, y]) => [x - minX, y - minY]);
    return { c, w: Math.max(...c.map((p) => p[0])) + 1, h: Math.max(...c.map((p) => p[1])) + 1 };
  }

  function draw() {
    const cs = getComputedStyle(document.documentElement);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cs.getPropertyValue('--board').trim() || '#ebe6d8';
    ctx.fillRect(0, 0, cw, ch);
    for (let y = 0; y < H; y++) { const r = (y + 1) * S + 1, o = y * W; for (let x = 0; x < W; x++) u32[o + x] = cur[r + x] ? cellColor : 0; }
    offCtx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, W, H, view.ox, view.oy, W * view.s, H * view.s);
    const s = view.s;
    if (s >= 7) {
      ctx.strokeStyle = cs.getPropertyValue('--grid').trim() || 'rgba(0,0,0,.08)'; ctx.lineWidth = 1; ctx.beginPath();
      const x0 = Math.max(0, Math.floor(-view.ox / s)), x1 = Math.min(W, Math.ceil((cw - view.ox) / s));
      const y0 = Math.max(0, Math.floor(-view.oy / s)), y1 = Math.min(H, Math.ceil((ch - view.oy) / s));
      for (let x = x0; x <= x1; x++) { const px = Math.round(view.ox + x * s) + 0.5; ctx.moveTo(px, Math.max(0, view.oy)); ctx.lineTo(px, Math.min(ch, view.oy + H * s)); }
      for (let y = y0; y <= y1; y++) { const py = Math.round(view.oy + y * s) + 0.5; ctx.moveTo(Math.max(0, view.ox), py); ctx.lineTo(Math.min(cw, view.ox + W * s), py); }
      ctx.stroke();
    }
    ctx.strokeStyle = cs.getPropertyValue('--muted').trim() || '#888'; ctx.lineWidth = 1;
    ctx.strokeRect(view.ox - 0.5, view.oy - 0.5, W * s + 1, H * s + 1);
    if (hover && st.tool === 'stamp') {
      const p = patternCells(); ctx.fillStyle = cs.getPropertyValue('--ghost').trim() || 'rgba(47,111,237,.45)';
      const bx = hover.x - (p.w >> 1), by = hover.y - (p.h >> 1);
      for (const [x, y] of p.c) ctx.fillRect(view.ox + (bx + x) * s, view.oy + (by + y) * s, s, s);
    }
    $('genOut').textContent = gen; $('popOut').textContent = pop;
    $('zoomOut').textContent = (Math.round(s * 10) / 10) + 'x';
    dirty = false;
  }

  // ---------- editing ----------
  function setCell(x, y, v) {
    const i = (y + 1) * S + x + 1;
    if (cur[i] !== v) { cur[i] = v; pop += v ? 1 : -1; dirty = true; }
  }
  function line(a, b, v) {
    let x = a.x, y = a.y; const dx = Math.abs(b.x - x), dy = -Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      setCell(x, y, v);
      if (x === b.x && y === b.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
  function stamp(c) {
    const p = patternCells(); const bx = c.x - (p.w >> 1), by = c.y - (p.h >> 1);
    for (const [x, y] of p.c) { const gx = bx + x, gy = by + y; if (gx >= 0 && gy >= 0 && gx < W && gy < H) setCell(gx, gy, 1); }
    say('Stamped ' + st.pattern);
  }

  const pointers = new Map();
  let drag = null, pinch = null;
  function localXY(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    const p = localXY(e); pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s }; drag = null; return;
    }
    const panning = e.button === 1 || e.shiftKey || st.tool === 'pan';
    if (panning) { drag = { type: 'pan', x: p.x, y: p.y, ox: view.ox, oy: view.oy }; return; }
    const c = cellAt(p.x, p.y);
    if (st.tool === 'stamp') { if (c) { stamp(c); scheduleSave(); } drag = null; return; }
    const v = (e.button === 2 || st.tool === 'erase') ? 0 : 1;
    drag = { type: 'paint', v, last: c };
    if (c) setCell(c.x, c.y, v);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = localXY(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    hover = cellAt(p.x, p.y); if (st.tool === 'stamp') dirty = true;
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ns = Math.min(40, Math.max(0.5, pinch.s * d / pinch.d));
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, ns / view.s); return;
    }
    if (!drag) return;
    if (drag.type === 'pan') { touched = true; view.ox = drag.ox + p.x - drag.x; view.oy = drag.oy + p.y - drag.y; dirty = true; return; }
    const c = cellAt(p.x, p.y);
    if (c) { if (drag.last) line(drag.last, c, drag.v); else setCell(c.x, c.y, drag.v); drag.last = c; }
  });
  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && drag.type === 'paint') scheduleSave();
    drag = null;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { hover = null; if (st.tool === 'stamp') dirty = true; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); const p = localXY(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }, { passive: false });

  // ---------- UI ----------
  function setRunning(r) {
    running = r; const b = $('playBtn');
    b.textContent = r ? 'Pause' : 'Play'; b.setAttribute('aria-pressed', String(r));
    say(r ? 'Running' : 'Paused at generation ' + gen);
    if (!r) scheduleSave();
  }

  function setTool(t) {
    st.tool = t;
    document.querySelectorAll('#tools [data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
    canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair'; dirty = true; scheduleSave();
  }

  function applyRule(str, silent) {
    const r = parseRule(str); const input = $('ruleInput'), msg = $('ruleMsg');
    if (!r) {
      input.setAttribute('aria-invalid', 'true'); msg.className = 'msg err';
      msg.textContent = 'Invalid rule. Use the form B3/S23 (digits 0-8 after B and S).'; return false;
    }
    input.removeAttribute('aria-invalid'); msg.className = 'msg';
    msg.textContent = 'Active rule ' + r.canon;
    lut = r.lut; st.rule = r.canon;
    const idx = PRESETS.findIndex((p) => parseRule(p.rule).canon === r.canon);
    $('presetSel').value = idx >= 0 ? String(idx) : 'custom';
    if (!silent) { say('Rule ' + r.canon); scheduleSave(); }
    return true;
  }

  function renderBits() {
    const box = $('bits'); box.textContent = '';
    for (let i = 7; i >= 0; i--) {
      const b = document.createElement('button'); b.type = 'button';
      const on = (st.elem >> i) & 1;
      b.textContent = (i >> 2 & 1) + '' + (i >> 1 & 1) + '' + (i & 1) + ' > ' + on;
      b.setAttribute('aria-pressed', String(!!on)); b.setAttribute('aria-label', 'Neighbourhood ' + (i >> 2 & 1) + (i >> 1 & 1) + (i & 1) + ' gives ' + on);
      b.addEventListener('click', () => setElem(st.elem ^ (1 << i)));
      box.appendChild(b);
    }
  }
  function setElem(n, silent) {
    n = Math.max(0, Math.min(255, Math.round(Number(n)) || 0));
    st.elem = n; $('elemInput').value = n; renderBits();
    $('elemPreset').value = ELEM.includes(n) ? String(n) : 'custom';
    if (!silent) { say('Rule ' + n); scheduleSave(); }
  }

  function setMode(m, fresh) {
    st.mode = m;
    $('modeLife').setAttribute('aria-pressed', String(m === 'life')); $('modeElem').setAttribute('aria-pressed', String(m === 'elem'));
    $('lifePanel').hidden = m !== 'life'; $('elemPanel').hidden = m !== 'elem';
    $('patPanel').hidden = m !== 'life'; $('stampTool').hidden = m !== 'life';
    if (m === 'elem' && st.tool === 'stamp') setTool('draw');
    if (fresh) {
      running && setRunning(false);
      cur.fill(0); gen = 0; row = 0; pop = 0; if (m === 'elem') seed1D();
      dirty = true; say(m === 'life' ? '2D Life-like mode' : '1D elementary mode');
      scheduleSave();
    }
  }

  function buildLists() {
    const ps = $('presetSel');
    PRESETS.forEach((p, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = p.name + ' (' + p.rule + ')'; ps.appendChild(o); });
    const c = document.createElement('option'); c.value = 'custom'; c.textContent = 'Custom'; ps.appendChild(c);
    const es = $('elemPreset');
    ELEM.forEach((n) => { const o = document.createElement('option'); o.value = String(n); o.textContent = 'Rule ' + n; es.appendChild(o); });
    const c2 = document.createElement('option'); c2.value = 'custom'; c2.textContent = 'Custom'; es.appendChild(c2);
    const box = $('pats');
    Object.keys(PATTERNS).forEach((name) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small'; b.textContent = name; b.dataset.pat = name;
      b.setAttribute('aria-pressed', String(name === st.pattern));
      b.addEventListener('click', () => { selectPattern(name); setTool('stamp'); });
      box.appendChild(b);
    });
  }
  function selectPattern(name) {
    st.pattern = name; st.rot = 0;
    document.querySelectorAll('#pats [data-pat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pat === name)));
    dirty = true; scheduleSave();
  }
  function rotate() { st.rot = (st.rot + 1) % 4; dirty = true; say('Pattern rotated'); }

  function setSpeed(v) { st.speed = v; $('speed').value = v; $('speedVal').textContent = v + ' gen/s'; }

  // ---------- persistence ----------
  function encode() {
    const runs = []; let v = 0, n = 0;
    for (let y = 1; y <= H; y++) { const r = y * S; for (let x = 1; x <= W; x++) { const c = cur[r + x]; if (c === v) n++; else { runs.push(n); v = c; n = 1; } } }
    runs.push(n); return runs.length > 30000 ? null : runs.join(',');
  }
  function decode(str) {
    const runs = str.split(',').map(Number); let v = 0, k = 0;
    cur.fill(0);
    for (const n of runs) {
      for (let j = 0; j < n && k < W * H; j++, k++) if (v) cur[(Math.floor(k / W) + 1) * S + (k % W) + 1] = 1;
      v ^= 1;
    }
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ st, gen, row, grid: encode() })); } catch (e) { /* storage blocked */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!d || !d.st) return false;
      const s = d.st;
      if (s.mode === 'life' || s.mode === 'elem') st.mode = s.mode;
      if ([64, 128, 256].includes(s.size)) st.size = s.size;
      if (typeof s.rule === 'string' && parseRule(s.rule)) st.rule = parseRule(s.rule).canon;
      if (Number.isInteger(s.elem) && s.elem >= 0 && s.elem < 256) st.elem = s.elem;
      st.wrap = s.wrap !== false;
      if (Number.isFinite(s.speed)) st.speed = Math.max(1, Math.min(120, s.speed));
      if (['draw', 'erase', 'stamp', 'pan'].includes(s.tool)) st.tool = s.tool;
      if (PATTERNS[s.pattern]) st.pattern = s.pattern;
      alloc(st.size);
      if (typeof d.grid === 'string') { decode(d.grid); countPop(); gen = Number(d.gen) || 0; row = Math.max(0, Math.min(H - 1, Number(d.row) || 0)); }
      return true;
    } catch (e) { return false; }
  }

  // ---------- loop ----------
  let last = 0, acc = 0;
  function frame(t) {
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    if (running) {
      acc += dt * st.speed; let n = Math.min(8, Math.floor(acc)); acc -= Math.floor(acc);
      while (n-- > 0) stepOnce();
      if (Math.random() < 0.02) scheduleSave();
    }
    if (dirty) draw();
    requestAnimationFrame(frame);
  }

  // ---------- init ----------
  buildLists();
  const loaded = load();
  if (!loaded) { alloc(st.size); }
  $('wrapChk').checked = st.wrap; $('sizeSel').value = String(st.size);
  setSpeed(st.speed); setElem(st.elem, true);
  applyRule(st.rule, true); $('ruleInput').value = st.rule;
  setMode(st.mode, false); setTool(st.tool);
  document.querySelectorAll('#pats [data-pat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pat === st.pattern)));
  if (!loaded) {
    // friendly first view: a glider heading into an R-pentomino
    if (st.mode === 'life') { st.pattern = 'R-pentomino'; stamp({ x: W >> 1, y: H >> 1 }); st.pattern = 'Glider'; st.rot = 0; countPop(); }
  }
  readColors(); resize(); fit();
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
  if (window.ResizeObserver) new ResizeObserver(() => { resize(); if (!touched) fit(); }).observe(wrapEl);
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (running) setRunning(false); save(); } });

  $('playBtn').addEventListener('click', () => setRunning(!running));
  $('stepBtn').addEventListener('click', () => { if (running) setRunning(false); stepOnce(); scheduleSave(); });
  $('randBtn').addEventListener('click', () => { randomize(); scheduleSave(); });
  $('clearBtn').addEventListener('click', () => { clearAll(); scheduleSave(); });
  $('wrapChk').addEventListener('change', (e) => { st.wrap = e.target.checked; say('Wrap ' + (st.wrap ? 'on' : 'off')); scheduleSave(); });
  $('speed').addEventListener('input', (e) => { setSpeed(Number(e.target.value)); scheduleSave(); });
  $('modeLife').addEventListener('click', () => { if (st.mode !== 'life') setMode('life', true); });
  $('modeElem').addEventListener('click', () => { if (st.mode !== 'elem') setMode('elem', true); });
  $('presetSel').addEventListener('change', (e) => {
    if (e.target.value === 'custom') return;
    const p = PRESETS[Number(e.target.value)]; $('ruleInput').value = p.rule; applyRule(p.rule);
  });
  $('ruleInput').addEventListener('input', (e) => applyRule(e.target.value));
  $('elemInput').addEventListener('input', (e) => { if (e.target.value !== '') setElem(e.target.value); });
  $('elemInput').addEventListener('change', (e) => setElem(e.target.value));
  $('elemPreset').addEventListener('change', (e) => { if (e.target.value !== 'custom') setElem(e.target.value); });
  document.querySelectorAll('#tools [data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $('zoomInBtn').addEventListener('click', () => zoomAt(cw / 2, ch / 2, 1.25));
  $('zoomOutBtn').addEventListener('click', () => zoomAt(cw / 2, ch / 2, 1 / 1.25));
  $('fitBtn').addEventListener('click', fit);
  $('rotBtn').addEventListener('click', rotate);
  $('sizeSel').addEventListener('change', (e) => {
    running && setRunning(false);
    st.size = Number(e.target.value); alloc(st.size); if (st.mode === 'elem') seed1D(); fit(); say('Grid ' + W + ' by ' + H); scheduleSave();
  });

  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
    const onBtn = tag === 'BUTTON';
    const k = e.key; const pan = 40;
    if (k === ' ' && !onBtn) { e.preventDefault(); setRunning(!running); }
    else if (k === 's' || k === 'S') { if (running) setRunning(false); stepOnce(); scheduleSave(); }
    else if (k === 'r' || k === 'R') { randomize(); scheduleSave(); }
    else if (k === 'c' || k === 'C') { clearAll(); scheduleSave(); }
    else if (k === 'f' || k === 'F') fit();
    else if (k === 't' || k === 'T') rotate();
    else if (k === '+' || k === '=') zoomAt(cw / 2, ch / 2, 1.25);
    else if (k === '-' || k === '_') zoomAt(cw / 2, ch / 2, 1 / 1.25);
    else if (k === 'ArrowLeft') { view.ox += pan; dirty = true; e.preventDefault(); }
    else if (k === 'ArrowRight') { view.ox -= pan; dirty = true; e.preventDefault(); }
    else if (k === 'ArrowUp') { view.oy += pan; dirty = true; e.preventDefault(); }
    else if (k === 'ArrowDown') { view.oy -= pan; dirty = true; e.preventDefault(); }
  });

  requestAnimationFrame((t) => { last = t; frame(t); });
})();
