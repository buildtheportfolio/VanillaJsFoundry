(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KEY = 'foundry.platformer-physics.v1';

  // ---------- constants (pixels, seconds) ----------
  const T = 16, VW = 480, VH = 272, ROWS = 17, DT = 1 / 120;
  const RUN = 125, ACCEL = 950, FRIC = 1300, AIR_ACCEL = 680, AIR_FRIC = 220;
  const GRAV = 1100, JUMP = 350, CUT = 2.4, MAXFALL = 420;
  const COYOTE = 0.1, BUFFER = 0.12, STEP_MAX = 4;

  // ---------- levels (tile units; ground surface is row 14) ----------
  // solids [x,y,w,h], spikes [x,y,w], coins [x,y], movers {x,y,w,ax,ay,period}
  const LEVELS = [
    {
      name: 'First Steps', w: 72, start: [2, 12], goal: [69, 12],
      sky: ['#7ec8ff', '#d6f0ff'], hill: ['#5aa66a', '#3f8a55'], tile: ['#8a5a3b', '#5fbf5a'],
      solids: [[0, 14, 19, 3], [22, 14, 14, 3], [39, 14, 14, 3], [56, 14, 16, 3],
        [8, 12, 4, 1], [26, 13, 2, 1], [28, 12, 3, 2], [64, 13, 2, 1], [66, 12, 2, 2]],
      spikes: [[31, 13, 2], [47, 13, 2]],
      coins: [[9, 10], [10, 10], [27, 11], [29, 10], [31, 11], [32, 11], [37, 11], [46, 11], [47, 10], [48, 10], [49, 11], [54, 11], [60, 12], [62, 12]],
      movers: []
    },
    {
      name: 'Moving Day', w: 90, start: [2, 12], goal: [87, 12],
      sky: ['#ffb877', '#ffe9c9'], hill: ['#c98a5b', '#a56c43'], tile: ['#6b5170', '#d58bd0'],
      solids: [[0, 14, 12, 3], [20, 14, 18, 3], [38, 7, 8, 1], [46, 14, 12, 3], [66, 14, 24, 3],
        [72, 12, 3, 1], [77, 10, 3, 1], [82, 12, 3, 1]],
      spikes: [[50, 13, 3], [79, 13, 2]],
      coins: [[13, 12], [15, 11], [17, 11], [28, 12], [35, 9], [36, 9], [40, 5], [42, 5], [44, 5], [50, 11], [51, 11], [52, 11], [60, 12], [62, 12], [73, 10], [78, 8], [83, 10]],
      movers: [
        { x: 10, y: 14, w: 3, ax: 8, ay: 0, period: 6 },
        { x: 34, y: 13, w: 3, ax: 0, ay: -6, period: 5 },
        { x: 56, y: 14, w: 3, ax: 8, ay: 0, period: 6 }
      ]
    },
    {
      name: 'Spike Run', w: 100, start: [1, 12], goal: [96, 12],
      sky: ['#2b3a67', '#6a7fb8'], hill: ['#3d4f8a', '#2e3d70'], tile: ['#3b3f58', '#ff6b6b'],
      solids: [[0, 14, 8, 3], [11, 13, 2, 4], [15, 12, 2, 5], [19, 12, 3, 5], [23, 14, 10, 3],
        [45, 14, 10, 3], [48, 10, 8, 1], [58, 14, 6, 3], [64, 13, 2, 4], [66, 12, 2, 5], [68, 11, 2, 6],
        [72, 12, 3, 1], [77, 12, 3, 1], [82, 12, 3, 1], [87, 14, 13, 3]],
      spikes: [[25, 13, 2], [29, 13, 2], [50, 13, 2], [33, 15, 12], [70, 15, 17]],
      coins: [[12, 11], [16, 10], [20, 10], [25, 11], [29, 11], [37, 9], [41, 9], [49, 12], [53, 12], [59, 12], [61, 12], [65, 10], [67, 9], [69, 8], [73, 10], [78, 10], [83, 10], [92, 12], [94, 12]],
      movers: [{ x: 32, y: 12, w: 3, ax: 10, ay: 0, period: 7 }]
    }
  ];

  // ---------- state ----------
  const canvas = $('game'), ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const live = $('live');
  let best = LEVELS.map(() => null);
  let li = 0, lvl = null, p = null, cam = 0, timer = 0, ltime = 0, collected = 0, state = 'ready';
  let particles = [];
  const input = { left: false, right: false, jump: false, jumpEdge: false };
  const touchHeld = { left: false, right: false, jump: false };
  const keyHeld = { left: false, right: false, jump: false };

  function say(m) { live.textContent = ''; setTimeout(() => { live.textContent = m; }, 30); }
  function load() {
    try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && Array.isArray(d.best)) best = LEVELS.map((_, i) => (typeof d.best[i] === 'number' && d.best[i] > 0 ? d.best[i] : null)); } catch (e) { /* ignore */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ best })); } catch (e) { /* storage blocked */ } }
  const fmt = (t) => (t == null ? '--' : t.toFixed(2));

  // ---------- level build ----------
  function build(i) {
    const d = LEVELS[i], solid = new Uint8Array(d.w * ROWS);
    for (const [x, y, w, h] of d.solids) for (let yy = y; yy < y + h && yy < ROWS; yy++) for (let xx = x; xx < x + w; xx++) solid[yy * d.w + xx] = 1;
    lvl = {
      d, w: d.w, solid,
      spikes: d.spikes.flatMap(([x, y, w]) => Array.from({ length: w }, (_, k) => ({ x: x + k, y }))),
      coins: d.coins.map(([x, y]) => ({ x: x * T + T / 2, y: y * T + T / 2, got: false })),
      movers: d.movers.map((m) => ({ ...m, px: m.x * T, py: m.y * T, pw: m.w * T, ph: T, dx: 0, dy: 0 })),
      goal: { x: d.goal[0] * T, y: d.goal[1] * T, w: T, h: 2 * T }
    };
    p = { x: d.start[0] * T + 3, y: d.start[1] * T + (2 * T - 14), w: 10, h: 14, vx: 0, vy: 0, ground: false, coyote: 0, buffer: 0, face: 1, anim: 0, land: 0 };
    cam = Math.max(0, Math.min(lvl.w * T - VW, p.x - VW / 2));
    timer = 0; ltime = 0; collected = 0; particles = [];
    updateMovers(0);
    hud();
  }

  function isSolidTile(c, r) {
    if (c < 0 || c >= lvl.w) return true;
    if (r < 0 || r >= ROWS) return false;
    return lvl.solid[r * lvl.w + c] === 1;
  }
  function hitTile(x, y, w, h) {
    const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.001) / T), r0 = Math.floor(y / T), r1 = Math.floor((y + h - 0.001) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (isSolidTile(c, r)) return { c, r };
    return null;
  }
  function hitMover(x, y, w, h) {
    for (const m of lvl.movers) if (x < m.px + m.pw && x + w > m.px && y < m.py + m.ph && y + h > m.py) return m;
    return null;
  }

  // ---------- movement (per-axis AABB resolution, sub-stepped against tunneling) ----------
  function moveX(amount) {
    let left = amount; const sgn = Math.sign(amount);
    while (Math.abs(left) > 1e-6) {
      const s = Math.abs(left) > STEP_MAX ? sgn * STEP_MAX : left; left -= s; p.x += s;
      const t = hitTile(p.x, p.y, p.w, p.h);
      if (t) { p.x = s > 0 ? t.c * T - p.w : (t.c + 1) * T; p.vx = 0; return; }
      const m = hitMover(p.x, p.y, p.w, p.h);
      if (m) { p.x = s > 0 ? m.px - p.w : m.px + m.pw; p.vx = 0; return; }
    }
  }
  function moveY(amount) {
    let left = amount; const sgn = Math.sign(amount); p.ground = false;
    while (Math.abs(left) > 1e-6) {
      const s = Math.abs(left) > STEP_MAX ? sgn * STEP_MAX : left; left -= s; p.y += s;
      const t = hitTile(p.x, p.y, p.w, p.h);
      if (t) {
        if (s > 0) { p.y = t.r * T - p.h; p.ground = true; } else p.y = (t.r + 1) * T;
        p.vy = 0; return;
      }
      const m = hitMover(p.x, p.y, p.w, p.h);
      if (m) {
        if (s > 0) { p.y = m.py - p.h; p.ground = true; } else p.y = m.py + m.ph;
        p.vy = 0; return;
      }
    }
  }

  function updateMovers(time) {
    for (const m of lvl.movers) {
      const ox = m.px, oy = m.py, ph = (1 - Math.cos((2 * Math.PI * time) / m.period)) / 2;
      m.px = (m.x + m.ax * ph) * T; m.py = (m.y + m.ay * ph) * T; m.dx = m.px - ox; m.dy = m.py - oy;
    }
  }
  function carryRiders() {
    // Riders are detected against the mover's previous position, then carried by its delta.
    for (const m of lvl.movers) {
      const prevX = m.px - m.dx, prevY = m.py - m.dy;
      const onTop = p.vy >= 0 && Math.abs(p.y + p.h - prevY) < 1.6 && p.x + p.w > prevX && p.x < prevX + m.pw;
      if (onTop) { moveX(m.dx); p.y = m.py - p.h; p.ground = true; if (hitTile(p.x, p.y, p.w, p.h)) p.y = Math.floor(p.y / T) * T + T; }
      else if (p.x < m.px + m.pw && p.x + p.w > m.px && p.y < m.py + m.ph && p.y + p.h > m.py) {
        // mover pushed into the player: eject along the shallowest axis
        const ol = p.x + p.w - m.px, or = m.px + m.pw - p.x, ot = p.y + p.h - m.py, ob = m.py + m.ph - p.y;
        const mn = Math.min(ol, or, ot, ob);
        if (mn === ot) { p.y = m.py - p.h; p.ground = true; p.vy = Math.min(p.vy, 0); }
        else if (mn === ob) { p.y = m.py + m.ph; p.vy = Math.max(p.vy, 0); }
        else if (mn === ol) moveX(-ol); else moveX(or);
      }
    }
  }

  function approach(v, target, amt) { return v < target ? Math.min(v + amt, target) : Math.max(v - amt, target); }

  function physics(dt) {
    ltime += dt; timer += dt;
    updateMovers(ltime);
    carryRiders();

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) {
      p.face = dir;
      const a = (p.ground ? ACCEL : AIR_ACCEL) * (Math.sign(p.vx) === -dir ? 1.6 : 1);
      p.vx = approach(p.vx, dir * RUN, a * dt);
    } else p.vx = approach(p.vx, 0, (p.ground ? FRIC : AIR_FRIC) * dt);

    if (input.jumpEdge) { p.buffer = BUFFER; input.jumpEdge = false; } else p.buffer -= dt;
    p.coyote = p.ground ? COYOTE : p.coyote - dt;
    if (p.buffer > 0 && p.coyote > 0) { p.vy = -JUMP; p.buffer = 0; p.coyote = 0; p.ground = false; burst(p.x + p.w / 2, p.y + p.h, 4, '#fff'); }
    const g = p.vy < 0 && !input.jump ? GRAV * CUT : GRAV;
    p.vy = Math.min(p.vy + g * dt, MAXFALL);

    const wasGround = p.ground, pvy = p.vy;
    moveX(p.vx * dt);
    moveY(p.vy * dt);
    if (p.ground && !wasGround && pvy > 150) { p.land = 0.12; burst(p.x + p.w / 2, p.y + p.h, 3, '#ddd'); }
    if (p.land > 0) p.land -= dt;
    p.anim += Math.abs(p.vx) * dt * 0.12;

    for (const c of lvl.coins) {
      if (!c.got && Math.abs(c.x - (p.x + p.w / 2)) < 11 && Math.abs(c.y - (p.y + p.h / 2)) < 12) {
        c.got = true; collected++; burst(c.x, c.y, 6, '#ffd43b'); hud();
      }
    }
    for (const s of lvl.spikes) {
      if (p.x + p.w > s.x * T + 3 && p.x < s.x * T + T - 3 && p.y + p.h > s.y * T + 8 && p.y < s.y * T + T) return die('Spiked');
    }
    if (p.y > ROWS * T + 24) return die('You fell');
    const g2 = lvl.goal;
    if (p.x + p.w > g2.x && p.x < g2.x + g2.w && p.y + p.h > g2.y && p.y < g2.y + g2.h) return complete();
  }

  function burst(x, y, n, col) {
    for (let i = 0; i < n; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 90, life: 0.5 + Math.random() * 0.3, col });
  }

  // ---------- game flow ----------
  function setOverlay(show, title, text, btn, btn2) {
    const ov = $('overlay'); ov.hidden = !show;
    if (!show) return;
    $('ovTitle').textContent = title; $('ovText').textContent = text; $('ovBtn').textContent = btn;
    const b2 = $('ovBtn2'); b2.hidden = !btn2; if (btn2) b2.textContent = btn2;
    $('ovBtn').focus({ preventScroll: true });
  }
  function hud() {
    $('hudLevel').textContent = (li + 1) + ' ' + LEVELS[li].name;
    $('hudCoins').textContent = collected + '/' + lvl.coins.length;
    $('hudBest').textContent = fmt(best[li]);
    document.querySelectorAll('#levelNav .lvl').forEach((b, i) => { if (i === li) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function startLevel(i, autoplay) {
    li = i; build(i);
    if (autoplay) { state = 'play'; setOverlay(false); } else {
      state = 'ready';
      setOverlay(true, 'Level ' + (i + 1) + ': ' + LEVELS[i].name, 'Collect coins, avoid spikes and reach the flag. Best time ' + fmt(best[i]) + (best[i] ? ' s' : '') + '.', 'Start');
    }
  }
  function die(why) {
    state = 'dead'; burst(p.x + p.w / 2, p.y + p.h / 2, 18, '#ff6b6b');
    setOverlay(true, why + '!', 'Press R or Enter to try again.', 'Try again');
    say(why + '. Press R to restart.');
  }
  function complete() {
    state = 'complete';
    const isBest = best[li] == null || timer < best[li];
    if (isBest) { best[li] = timer; save(); }
    hud();
    const last = li === LEVELS.length - 1;
    setOverlay(true, 'Level complete!', 'Time ' + timer.toFixed(2) + ' s' + (isBest ? ' (new best!)' : '') + '. Coins ' + collected + '/' + lvl.coins.length + '.', last ? 'Play from level 1' : 'Next level', 'Replay');
    say('Level complete in ' + timer.toFixed(2) + ' seconds');
  }
  function primary() {
    if (state === 'ready' || state === 'dead') startLevel(li, true);
    else if (state === 'paused') { state = 'play'; setOverlay(false); }
    else if (state === 'complete') startLevel((li + 1) % LEVELS.length, true);
  }
  function togglePause() {
    if (state === 'play') { state = 'paused'; setOverlay(true, 'Paused', 'Take a breath.', 'Resume'); }
    else if (state === 'paused') primary();
  }

  // ---------- input ----------
  function syncInput() {
    input.left = keyHeld.left || touchHeld.left; input.right = keyHeld.right || touchHeld.right;
    input.jump = keyHeld.jump || touchHeld.jump;
  }
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump' };
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const onBtn = e.target && e.target.tagName === 'BUTTON';
    const k = KEYMAP[e.code];
    if (k && !(onBtn && (e.code === 'Space'))) {
      e.preventDefault();
      if (k === 'jump' && !keyHeld.jump && state === 'play') input.jumpEdge = true;
      keyHeld[k] = true; syncInput();
      if (state === 'ready' && k === 'jump') primary();
      return;
    }
    if (e.code === 'KeyR') { startLevel(li, true); say('Restarted'); }
    else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    else if (e.code === 'KeyN' && state === 'complete') primary();
    else if (e.code === 'Enter' && !onBtn && state !== 'play') { e.preventDefault(); primary(); }
  });
  document.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code]; if (k) { keyHeld[k] = false; syncInput(); }
  });
  window.addEventListener('blur', () => { keyHeld.left = keyHeld.right = keyHeld.jump = false; syncInput(); if (state === 'play') togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

  function bindTouch(id, name) {
    const b = $(id);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('down');
      if (name === 'jump' && !touchHeld.jump && state === 'play') input.jumpEdge = true;
      touchHeld[name] = true; syncInput();
      if (state === 'ready' && name === 'jump') primary();
    });
    const up = () => { touchHeld[name] = false; b.classList.remove('down'); syncInput(); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  bindTouch('tLeft', 'left'); bindTouch('tRight', 'right'); bindTouch('tJump', 'jump');

  $('ovBtn').addEventListener('click', primary);
  $('ovBtn2').addEventListener('click', () => startLevel(li, true));
  LEVELS.forEach((d, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'lvl'; b.textContent = String(i + 1); b.setAttribute('aria-label', 'Level ' + (i + 1) + ': ' + d.name);
    b.addEventListener('click', () => { b.blur(); startLevel(i, false); });
    $('levelNav').appendChild(b);
  });

  // ---------- rendering ----------
  function drawBackground(d) {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, d.sky[0]); g.addColorStop(1, d.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = d.hill[layer]; const f = 0.15 + layer * 0.2, base = 190 + layer * 24, amp = 40 - layer * 12;
      ctx.beginPath(); ctx.moveTo(0, VH);
      for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin((x + cam * f) / (60 + layer * 30) + layer * 2)));
      ctx.lineTo(VW, VH); ctx.fill();
    }
  }
  function drawTiles(d) {
    const c0 = Math.max(0, Math.floor(cam / T)), c1 = Math.min(lvl.w - 1, Math.floor((cam + VW) / T));
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
      if (!lvl.solid[r * lvl.w + c]) continue;
      const x = Math.round(c * T - cam), y = r * T;
      ctx.fillStyle = d.tile[0]; ctx.fillRect(x, y, T, T);
      ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + T - 2, T, 2); ctx.fillRect(x + T - 2, y, 2, T);
      if (r === 0 || !lvl.solid[(r - 1) * lvl.w + c]) { ctx.fillStyle = d.tile[1]; ctx.fillRect(x, y, T, 4); }
    }
  }
  function draw() {
    const d = lvl.d; ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackground(d); drawTiles(d);
    for (const s of lvl.spikes) {
      const x = Math.round(s.x * T - cam), y = s.y * T; if (x < -T || x > VW) continue;
      ctx.fillStyle = '#d9dde8'; ctx.beginPath(); ctx.moveTo(x, y + T); ctx.lineTo(x + T / 4, y + 6); ctx.lineTo(x + T / 2, y + T);
      ctx.lineTo(x + T * 0.75, y + 6); ctx.lineTo(x + T, y + T); ctx.fill();
      ctx.fillStyle = '#8f98ad'; ctx.fillRect(x, y + T - 2, T, 2);
    }
    for (const m of lvl.movers) {
      const x = Math.round(m.px - cam), y = Math.round(m.py);
      ctx.fillStyle = '#f08c00'; ctx.fillRect(x, y, m.pw, m.ph);
      ctx.fillStyle = '#ffd43b'; for (let k = 0; k < m.pw; k += 8) ctx.fillRect(x + k, y + 4, 4, 8);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + m.ph - 2, m.pw, 2);
    }
    const g = lvl.goal, gx = Math.round(g.x - cam);
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(gx + 2, g.y, 2, g.h);
    ctx.fillStyle = '#51cf66'; ctx.beginPath(); ctx.moveTo(gx + 4, g.y + 2); ctx.lineTo(gx + 15, g.y + 7); ctx.lineTo(gx + 4, g.y + 12); ctx.fill();
    const now = performance.now() / 1000;
    for (const c of lvl.coins) {
      if (c.got) continue; const x = Math.round(c.x - cam); if (x < -10 || x > VW + 10) continue;
      const w = Math.abs(Math.cos(now * 4 + c.x)) * 5 + 1, y = c.y + Math.sin(now * 3 + c.x) * 1.5;
      ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.ellipse(x, y, w, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#e67700'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (state !== 'dead') {
      const sq = p.land > 0 ? 1.15 : (p.vy < -50 ? 0.9 : 1), w = p.w * (2 - sq), h = p.h * sq;
      const x = Math.round(p.x - cam + (p.w - w) / 2), y = Math.round(p.y + p.h - h);
      ctx.fillStyle = '#e03131'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#fff'; const ex = p.face > 0 ? x + w - 5 : x + 1; ctx.fillRect(ex, y + 3, 4, 4);
      ctx.fillStyle = '#111'; ctx.fillRect(ex + (p.face > 0 ? 2 : 0), y + 4, 2, 2);
      if (p.ground && Math.abs(p.vx) > 20 && Math.floor(p.anim) % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(x, y + h - 2, w, 2); }
    }
    for (const q of particles) { ctx.globalAlpha = Math.max(0, q.life * 2); ctx.fillStyle = q.col; ctx.fillRect(Math.round(q.x - cam), Math.round(q.y), 2, 2); }
    ctx.globalAlpha = 1;
    $('hudTime').textContent = timer.toFixed(2);
  }

  // ---------- main loop (fixed timestep, variable render) ----------
  let last = 0, acc = 0;
  function frame(t) {
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    if (state === 'play') {
      acc += dt;
      while (acc >= DT && state === 'play') { physics(DT); acc -= DT; }
      const target = Math.max(0, Math.min(lvl.w * T - VW, p.x + p.w / 2 - VW / 2 + p.face * 24));
      cam += (target - cam) * (1 - Math.exp(-dt * 8));
    } else acc = 0;
    for (const q of particles) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; q.life -= dt; }
    particles = particles.filter((q) => q.life > 0);
    draw();
    requestAnimationFrame(frame);
  }

  load();
  startLevel(0, false);
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
