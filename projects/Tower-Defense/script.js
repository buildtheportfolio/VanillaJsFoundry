(() => {
  'use strict';

  // ---------- Data ----------
  const COLS = 16, ROWS = 10, CELL = 60;
  const SPAWN = { x: 0, y: 5 }, EXIT = { x: COLS - 1, y: 5 };
  const STORE_KEY = 'foundry-tower-defense-best';
  const START_GOLD = 150, START_LIVES = 20, SELL_RATE = 0.7, MAX_LEVEL = 4;

  const TOWERS = {
    arrow:  { name: 'Archer', key: '1', cost: 50,  dmg: 12, range: 2.8, rate: 2.2,  speed: 9,  color: '#d9a233', desc: 'Fast and cheap.' },
    cannon: { name: 'Cannon', key: '2', cost: 100, dmg: 30, range: 2.6, rate: 0.7,  speed: 6,  color: '#c4553b', splash: 1.1, desc: 'Area damage.' },
    frost:  { name: 'Frost',  key: '3', cost: 80,  dmg: 5,  range: 2.4, rate: 1.2,  speed: 8,  color: '#46aedb', slow: 0.5, slowT: 1.8, desc: 'Slows enemies.' },
    sniper: { name: 'Sniper', key: '4', cost: 150, dmg: 70, range: 5.5, rate: 0.45, speed: 16, color: '#8d63d8', desc: 'Long range.' }
  };
  const TOWER_KEYS = Object.keys(TOWERS);

  const ENEMIES = {
    grunt:  { name: 'Grunt',  hp: 40,   speed: 1.0, reward: 6,  r: 0.28, dmg: 1, color: '#6aa84f' },
    runner: { name: 'Runner', hp: 26,   speed: 2.0, reward: 6,  r: 0.24, dmg: 1, color: '#e5b93c' },
    tank:   { name: 'Tank',   hp: 200,  speed: 0.6, reward: 16, r: 0.36, dmg: 2, color: '#7a7f8a' },
    swarm:  { name: 'Swarm',  hp: 14,   speed: 1.5, reward: 2,  r: 0.19, dmg: 1, color: '#d9694a' },
    flyer:  { name: 'Flyer',  hp: 55,   speed: 1.2, reward: 10, r: 0.27, dmg: 1, color: '#b784e6', flying: true },
    boss:   { name: 'Boss',   hp: 1100, speed: 0.5, reward: 90, r: 0.44, dmg: 5, color: '#2d2d34' }
  };

  // Data-driven waves. Each group spawns `n` enemies, `gap` seconds apart, after `delay` seconds.
  const WAVES = [
    { hpMul: 1.0, groups: [{ t: 'grunt', n: 6, gap: 1.0 }] },
    { hpMul: 1.1, groups: [{ t: 'grunt', n: 9, gap: 0.9 }] },
    { hpMul: 1.1, groups: [{ t: 'swarm', n: 14, gap: 0.4 }, { t: 'grunt', n: 4, gap: 1.0, delay: 7 }] },
    { hpMul: 1.2, groups: [{ t: 'runner', n: 9, gap: 0.7 }] },
    { hpMul: 1.3, groups: [{ t: 'tank', n: 2, gap: 3.0 }, { t: 'grunt', n: 8, gap: 0.8, delay: 2 }] },
    { hpMul: 1.4, groups: [{ t: 'flyer', n: 6, gap: 1.2 }, { t: 'swarm', n: 10, gap: 0.4, delay: 4 }] },
    { hpMul: 1.5, groups: [{ t: 'runner', n: 10, gap: 0.5 }, { t: 'tank', n: 3, gap: 2.5, delay: 3 }] },
    { hpMul: 1.7, groups: [{ t: 'grunt', n: 14, gap: 0.6 }, { t: 'flyer', n: 6, gap: 1.0, delay: 4 }] },
    { hpMul: 1.9, groups: [{ t: 'tank', n: 5, gap: 2.0 }, { t: 'swarm', n: 20, gap: 0.3, delay: 5 }] },
    { hpMul: 2.1, groups: [{ t: 'boss', n: 1, gap: 1 }, { t: 'grunt', n: 10, gap: 0.8, delay: 4 }] },
    { hpMul: 2.3, groups: [{ t: 'runner', n: 16, gap: 0.4 }, { t: 'flyer', n: 8, gap: 0.9, delay: 3 }] },
    { hpMul: 2.6, groups: [{ t: 'tank', n: 7, gap: 1.6 }, { t: 'runner', n: 10, gap: 0.5, delay: 6 }] },
    { hpMul: 2.9, groups: [{ t: 'swarm', n: 30, gap: 0.25 }, { t: 'flyer', n: 10, gap: 0.8, delay: 5 }, { t: 'tank', n: 4, gap: 2, delay: 8 }] },
    { hpMul: 3.3, groups: [{ t: 'boss', n: 2, gap: 8 }, { t: 'runner', n: 14, gap: 0.5, delay: 3 }] },
    { hpMul: 3.8, groups: [{ t: 'boss', n: 2, gap: 5 }, { t: 'tank', n: 8, gap: 1.4, delay: 2 }, { t: 'flyer', n: 12, gap: 0.7, delay: 6 }] }
  ];

  // ---------- Helpers ----------
  const $ = (id) => document.getElementById(id);
  const canvas = $('board'), ctx = canvas.getContext('2d');
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const dist2 = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  function loadBest() { try { return parseInt(localStorage.getItem(STORE_KEY), 10) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(STORE_KEY, String(v)); } catch (e) { /* storage blocked */ } }

  // ---------- State ----------
  let towers, grid, enemies, projectiles, floaters, queue, field;
  let gold, lives, wave, best, time, over, paused, speed;
  let buildType = null, selected = null, cursor = { x: 4, y: 4 }, lastTouchCell = null, showCursor = false;
  const theme = {};

  function reset() {
    towers = []; grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    enemies = []; projectiles = []; floaters = []; queue = [];
    gold = START_GOLD; lives = START_LIVES; wave = 0; time = 0; over = false; paused = false;
    buildType = null; selected = null;
    field = computeField(null);
    $('overlay').hidden = true;
    $('pauseBtn').setAttribute('aria-pressed', 'false');
    updateAll();
    say('New game. Place towers, then send the first wave.');
  }

  // ---------- Pathfinding (BFS flow field from the exit) ----------
  function computeField(extra) {
    const d = new Int16Array(COLS * ROWS).fill(-1);
    const q = [[EXIT.x, EXIT.y]]; d[EXIT.y * COLS + EXIT.x] = 0;
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i], base = d[y * COLS + x];
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!inBounds(nx, ny) || grid[ny][nx]) continue;
        if (extra && extra.x === nx && extra.y === ny) continue;
        if (d[ny * COLS + nx] !== -1) continue;
        d[ny * COLS + nx] = base + 1; q.push([nx, ny]);
      }
    }
    return d;
  }
  const fieldAt = (f, x, y) => (inBounds(x, y) ? f[y * COLS + x] : -1);

  function nextCell(cx, cy) {
    const cur = fieldAt(field, cx, cy);
    if (cur <= 0) return null;
    let best = null, bv = cur;
    for (const [dx, dy] of DIRS) {
      const v = fieldAt(field, cx + dx, cy + dy);
      if (v >= 0 && v < bv) { bv = v; best = { x: cx + dx, y: cy + dy }; }
    }
    return best;
  }

  // Returns '' if placement is legal, otherwise a reason.
  function placementProblem(x, y) {
    if (!inBounds(x, y)) return 'Out of bounds.';
    if (grid[y][x]) return 'Cell is occupied.';
    if ((x === SPAWN.x && y === SPAWN.y) || (x === EXIT.x && y === EXIT.y)) return 'Cannot build on the entrance or exit.';
    for (const e of enemies) {
      if (e.flying) continue;
      if ((e.tx === x && e.ty === y) || (e.cx === x && e.cy === y)) return 'An enemy is on that cell.';
    }
    const f = computeField({ x, y });
    if (fieldAt(f, SPAWN.x, SPAWN.y) < 0) return 'That would block the path completely.';
    for (const e of enemies) if (!e.flying && fieldAt(f, e.tx, e.ty) < 0) return 'That would trap an enemy.';
    return '';
  }

  function routeFromSpawn() {
    const pts = [{ x: SPAWN.x, y: SPAWN.y }];
    let c = { x: SPAWN.x, y: SPAWN.y };
    for (let i = 0; i < COLS * ROWS; i++) { c = nextCell(c.x, c.y); if (!c) break; pts.push(c); }
    return pts;
  }

  // ---------- Tower stats ----------
  function stats(t) {
    const b = TOWERS[t.type], L = t.level - 1;
    return {
      dmg: b.dmg * (1 + 0.65 * L), range: b.range + 0.25 * L, rate: b.rate * (1 + 0.15 * L),
      speed: b.speed, splash: b.splash ? b.splash + 0.15 * L : 0,
      slow: b.slow ? Math.max(0.2, b.slow - 0.08 * L) : 0, slowT: b.slowT || 0
    };
  }
  const upgradeCost = (t) => Math.round(TOWERS[t.type].cost * 0.8 * t.level);
  const sellValue = (t) => Math.floor(t.invested * SELL_RATE);
  const MODES = [['first', 'First (closest to exit)'], ['last', 'Last (furthest from exit)'], ['strong', 'Strongest'], ['close', 'Closest to tower']];

  // ---------- Enemies ----------
  function spawn(type, hpMul) {
    const d = ENEMIES[type];
    enemies.push({ type, d, hp: d.hp * hpMul, max: d.hp * hpMul, speed: d.speed, flying: !!d.flying, r: d.r,
      x: SPAWN.x + 0.5, y: SPAWN.y + 0.5, cx: SPAWN.x, cy: SPAWN.y, tx: SPAWN.x, ty: SPAWN.y, slowT: 0, slowF: 1 });
  }
  function remaining(e) {
    if (e.flying) return Math.abs(EXIT.x + 0.5 - e.x);
    const f = fieldAt(field, e.tx, e.ty);
    return Math.max(0, f) + dist2(e.x, e.y, e.tx + 0.5, e.ty + 0.5);
  }
  function stepEnemy(e, dt) {
    if (e.slowT > 0) e.slowT -= dt;
    let move = e.speed * (e.slowT > 0 ? e.slowF : 1) * dt;
    if (e.flying) {
      e.x += move;
      if (e.x >= EXIT.x + 0.5) leak(e);
      return;
    }
    let guard = 6;
    while (move > 0 && guard-- > 0) {
      const tx = e.tx + 0.5, ty = e.ty + 0.5, d = dist2(e.x, e.y, tx, ty);
      if (d <= move) {
        e.x = tx; e.y = ty; move -= d; e.cx = e.tx; e.cy = e.ty;
        if (e.cx === EXIT.x && e.cy === EXIT.y) { leak(e); return; }
        const n = nextCell(e.cx, e.cy);
        if (!n) return;
        e.tx = n.x; e.ty = n.y;
      } else { e.x += (tx - e.x) / d * move; e.y += (ty - e.y) / d * move; move = 0; }
    }
  }
  function leak(e) {
    if (e.dead) return;
    e.dead = true; lives = Math.max(0, lives - e.d.dmg);
    say(e.d.name + ' got through! Lives: ' + lives);
    flashT = 0.25;
    updateHud();
    if (lives <= 0) endGame(false);
  }
  // Where will this enemy be after `t` seconds, following the live flow field?
  function predict(e, t) {
    let dist = e.speed * (e.slowT > 0 ? e.slowF : 1) * t;
    if (e.flying) return { x: Math.min(EXIT.x + 0.5, e.x + dist), y: e.y };
    let x = e.x, y = e.y, cx = e.tx, cy = e.ty;
    for (let i = 0; i < 80; i++) {
      const tx = cx + 0.5, ty = cy + 0.5, d = dist2(x, y, tx, ty);
      if (d >= dist) return d === 0 ? { x, y } : { x: x + (tx - x) / d * dist, y: y + (ty - y) / d * dist };
      dist -= d; x = tx; y = ty;
      const n = nextCell(cx, cy);
      if (!n) break;
      cx = n.x; cy = n.y;
    }
    return { x, y };
  }
  // Iteratively solve for the intercept point so the projectile meets the moving enemy.
  function leadAim(px, py, e, speedP) {
    let t = dist2(px, py, e.x, e.y) / speedP, p = { x: e.x, y: e.y };
    for (let i = 0; i < 5; i++) { p = predict(e, t); t = dist2(px, py, p.x, p.y) / speedP; }
    return { x: p.x, y: p.y, t };
  }

  // ---------- Towers ----------
  function pickTarget(t, s) {
    const tx = t.x + 0.5, ty = t.y + 0.5;
    let best = null, bv = 0;
    for (const e of enemies) {
      if (e.dead) continue;
      const d = dist2(tx, ty, e.x, e.y);
      if (d > s.range + e.r) continue;
      let v;
      switch (t.mode) {
        case 'last': v = remaining(e); break;
        case 'strong': v = e.hp; break;
        case 'close': v = -d; break;
        default: v = -remaining(e);
      }
      if (t.type === 'frost' && e.slowT > 0.5) v -= 1e6; // prefer enemies not yet slowed
      if (!best || v > bv) { best = e; bv = v; }
    }
    return best;
  }
  function stepTower(t, dt) {
    t.cool -= dt;
    if (t.cool > 0) return;
    const s = stats(t), tgt = pickTarget(t, s);
    if (!tgt) return;
    const px = t.x + 0.5, py = t.y + 0.5, aim = leadAim(px, py, tgt, s.speed);
    const len = dist2(px, py, aim.x, aim.y) || 1;
    t.angle = Math.atan2(aim.y - py, aim.x - px);
    projectiles.push({ x: px, y: py, vx: (aim.x - px) / len * s.speed, vy: (aim.y - py) / len * s.speed,
      life: aim.t + 0.2, dmg: s.dmg, splash: s.splash, slow: s.slow, slowT: s.slowT, color: TOWERS[t.type].color });
    t.cool = 1 / s.rate;
  }
  function hit(p, e) {
    if (p.splash) {
      for (const o of enemies) if (!o.dead && dist2(p.x, p.y, o.x, o.y) <= p.splash + o.r) damage(o, p.dmg);
      floaters.push({ x: p.x, y: p.y, ring: p.splash, life: 0.3, max: 0.3, color: p.color });
    } else if (e) {
      damage(e, p.dmg);
      if (p.slow) { e.slowF = Math.min(e.slowF, p.slow); e.slowT = p.slowT; }
    }
  }
  function damage(e, d) {
    e.hp -= d;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; gold += e.d.reward;
      floaters.push({ x: e.x, y: e.y, text: '+' + e.d.reward, life: 0.8, max: 0.8, color: '#e8b923' });
      updateHud();
    }
  }
  function stepProjectile(p, dt) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    for (const e of enemies) {
      if (e.dead) continue;
      if (dist2(p.x, p.y, e.x, e.y) <= e.r + 0.12) { hit(p, e); p.done = true; return; }
    }
    if (p.life <= 0) { if (p.splash) hit(p, null); p.done = true; }
  }

  // ---------- Waves ----------
  function sendWave() {
    if (over || wave >= WAVES.length) return;
    const w = WAVES[wave]; wave++;
    for (const g of w.groups) for (let i = 0; i < g.n; i++) queue.push({ at: time + (g.delay || 0) + i * g.gap, type: g.t, hpMul: w.hpMul });
    queue.sort((a, b) => a.at - b.at);
    if (wave > best) { best = wave; saveBest(best); }
    say('Wave ' + wave + ' incoming.');
    updateAll();
  }

  // ---------- Simulation ----------
  const DT = 1 / 60;
  let flashT = 0;
  function tick() {
    time += DT;
    while (queue.length && queue[0].at <= time) { const q = queue.shift(); spawn(q.type, q.hpMul); }
    for (const e of enemies) if (!e.dead) stepEnemy(e, DT);
    for (const t of towers) stepTower(t, DT);
    for (const p of projectiles) stepProjectile(p, DT);
    for (const f of floaters) f.life -= DT;
    enemies = enemies.filter((e) => !e.dead);
    projectiles = projectiles.filter((p) => !p.done);
    floaters = floaters.filter((f) => f.life > 0);
    if (!over && wave >= WAVES.length && !queue.length && !enemies.length) endGame(true);
  }

  function endGame(won) {
    over = true;
    $('ovTitle').textContent = won ? 'Victory!' : 'Defeated';
    $('ovText').textContent = won ? 'You held the line through all ' + WAVES.length + ' waves.' : 'You reached wave ' + wave + '. Best wave: ' + best + '.';
    $('overlay').hidden = false; $('ovBtn').focus();
    updateSendBtn();
    say(won ? 'Victory!' : 'Game over at wave ' + wave + '.');
  }

  // ---------- Actions ----------
  function say(msg) { $('live').textContent = msg; }
  function tryPlace(x, y) {
    if (over) return;
    const def = TOWERS[buildType];
    if (gold < def.cost) { say('Not enough gold for ' + def.name + '.'); return; }
    const why = placementProblem(x, y);
    if (why) { say(why); return; }
    const t = { type: buildType, x, y, level: 1, mode: 'first', cool: 0, angle: 0, invested: def.cost };
    towers.push(t); grid[y][x] = t; gold -= def.cost;
    field = computeField(null);
    selected = t;
    say(def.name + ' placed. Route recalculated.');
    updateAll();
  }
  function selectAt(x, y) {
    selected = inBounds(x, y) && grid[y][x] ? grid[y][x] : null;
    updateAll();
  }
  function upgrade() {
    const t = selected; if (!t || over || t.level >= MAX_LEVEL) return;
    const c = upgradeCost(t);
    if (gold < c) { say('Need ' + c + ' gold to upgrade.'); return; }
    gold -= c; t.invested += c; t.level++;
    say(TOWERS[t.type].name + ' upgraded to level ' + t.level + '.');
    updateAll();
  }
  function sell() {
    const t = selected; if (!t || over) return;
    gold += sellValue(t); grid[t.y][t.x] = null;
    towers = towers.filter((o) => o !== t); selected = null;
    field = computeField(null);
    say('Tower sold. Route recalculated.');
    updateAll();
  }
  function cycleMode() {
    if (!selected) return;
    const i = MODES.findIndex((m) => m[0] === selected.mode);
    selected.mode = MODES[(i + 1) % MODES.length][0];
    say('Targeting: ' + MODES.find((m) => m[0] === selected.mode)[1]);
    updateSel();
  }
  function setSpeed(n) {
    speed = n;
    document.querySelectorAll('.speeds button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === n)));
    say('Speed x' + n);
  }
  function togglePause() {
    if (over) return;
    paused = !paused;
    $('pauseBtn').setAttribute('aria-pressed', String(paused));
    say(paused ? 'Paused' : 'Resumed');
  }
  function chooseType(k) {
    buildType = buildType === k ? null : k;
    if (buildType) selected = null;
    updateAll();
    if (buildType) say(TOWERS[k].name + ' selected, cost ' + TOWERS[k].cost + '.');
  }

  // ---------- UI ----------
  function updateHud() {
    $('gold').textContent = gold; $('lives').textContent = lives;
    $('wave').textContent = wave + '/' + WAVES.length; $('best').textContent = best;
    document.querySelectorAll('#shop button').forEach((b) => { b.disabled = gold < TOWERS[b.dataset.type].cost; });
  }
  function updateSendBtn() {
    const b = $('sendBtn'), done = wave >= WAVES.length;
    b.disabled = done || over;
    b.firstChild.textContent = done ? 'All waves sent ' : 'Send wave ' + (wave + 1) + ' ';
  }
  function buildShop() {
    const shop = $('shop');
    for (const k of TOWER_KEYS) {
      const d = TOWERS[k], b = document.createElement('button');
      b.type = 'button'; b.dataset.type = k; b.setAttribute('aria-pressed', 'false');
      b.title = d.desc;
      const nm = document.createElement('span'); nm.className = 'nm';
      const dot = document.createElement('span'); dot.className = 'dot'; dot.style.background = d.color;
      const kb = document.createElement('kbd'); kb.textContent = d.key;
      nm.append(dot, document.createTextNode(d.name + ' '), kb);
      const c = document.createElement('span'); c.className = 'cost'; c.textContent = d.cost + ' gold - ' + d.desc;
      b.append(nm, c);
      b.addEventListener('click', () => chooseType(k));
      shop.append(b);
    }
  }
  function updateSel() {
    document.querySelectorAll('#shop button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === buildType)));
    const box = $('sel'); box.textContent = '';
    const t = selected;
    const line = (txt) => { const p = document.createElement('p'); p.textContent = txt; box.append(p); return p; };
    if (!t) { line(buildType ? 'Click the board to place a ' + TOWERS[buildType].name + '.' : 'Click a tower to inspect, upgrade or sell it.').className = 'muted'; return; }
    const s = stats(t), d = TOWERS[t.type];
    line(d.name + ' - level ' + t.level + (t.level >= MAX_LEVEL ? ' (max)' : ''));
    line('Damage ' + s.dmg.toFixed(0) + ', range ' + s.range.toFixed(2) + ', ' + s.rate.toFixed(2) + ' shots/s' + (s.splash ? ', splash ' + s.splash.toFixed(2) : '') + (s.slow ? ', slows to ' + Math.round(s.slow * 100) + '%' : ''));
    const lab = document.createElement('label'); lab.textContent = 'Targeting ';
    const sel = document.createElement('select');
    for (const [v, n] of MODES) { const o = document.createElement('option'); o.value = v; o.textContent = n; if (v === t.mode) o.selected = true; sel.append(o); }
    sel.addEventListener('change', () => { t.mode = sel.value; say('Targeting: ' + sel.options[sel.selectedIndex].text); });
    lab.append(sel); box.append(lab);
    const row = document.createElement('div'); row.className = 'row';
    const up = document.createElement('button'); up.type = 'button';
    up.textContent = t.level >= MAX_LEVEL ? 'Max level' : 'Upgrade (' + upgradeCost(t) + ')';
    up.disabled = t.level >= MAX_LEVEL || gold < upgradeCost(t) || over;
    up.addEventListener('click', upgrade);
    const sl = document.createElement('button'); sl.type = 'button'; sl.textContent = 'Sell (+' + sellValue(t) + ')';
    sl.addEventListener('click', sell);
    row.append(up, sl); box.append(row);
  }
  function updateAll() { updateHud(); updateSendBtn(); updateSel(); }

  // ---------- Rendering ----------
  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    for (const k of ['--g1', '--g2', '--tower-base', '--bad', '--accent']) theme[k] = cs.getPropertyValue(k).trim();
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 ? theme['--g1'] : theme['--g2'];
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
    const route = routeFromSpawn();
    ctx.strokeStyle = theme['--accent']; ctx.globalAlpha = 0.5; ctx.lineWidth = 4; ctx.setLineDash([8, 10]); ctx.lineCap = 'round';
    ctx.beginPath();
    route.forEach((c, i) => { const px = (c.x + 0.5) * CELL, py = (c.y + 0.5) * CELL; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); });
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(80,170,90,.55)'; ctx.fillRect(SPAWN.x * CELL, SPAWN.y * CELL, CELL, CELL);
    ctx.fillStyle = 'rgba(200,70,60,.55)'; ctx.fillRect(EXIT.x * CELL, EXIT.y * CELL, CELL, CELL);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('IN', (SPAWN.x + 0.5) * CELL, (SPAWN.y + 0.5) * CELL); ctx.fillText('OUT', (EXIT.x + 0.5) * CELL, (EXIT.y + 0.5) * CELL);

    if (selected) rangeRing(selected.x, selected.y, stats(selected).range, theme['--accent']);
    if (buildType && showCursor) {
      const why = placementProblem(cursor.x, cursor.y), ok = !why && gold >= TOWERS[buildType].cost;
      rangeRing(cursor.x, cursor.y, TOWERS[buildType].range, ok ? theme['--accent'] : theme['--bad']);
      ctx.fillStyle = ok ? 'rgba(80,170,90,.25)' : 'rgba(200,70,60,.35)'; ctx.fillRect(cursor.x * CELL, cursor.y * CELL, CELL, CELL);
      ctx.globalAlpha = 0.6; drawTower({ type: buildType, x: cursor.x, y: cursor.y, level: 1, angle: 0 }); ctx.globalAlpha = 1;
    } else if (showCursor) {
      ctx.strokeStyle = theme['--accent']; ctx.lineWidth = 2; ctx.strokeRect(cursor.x * CELL + 2, cursor.y * CELL + 2, CELL - 4, CELL - 4);
    }
    for (const t of towers) drawTower(t);
    for (const e of enemies) drawEnemy(e);
    for (const p of projectiles) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x * CELL, p.y * CELL, p.splash ? 6 : 4, 0, 7); ctx.fill(); }
    for (const f of floaters) {
      const a = Math.max(0, f.life / f.max);
      ctx.globalAlpha = a;
      if (f.ring) { ctx.strokeStyle = f.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x * CELL, f.y * CELL, f.ring * CELL * (1.1 - a * 0.5), 0, 7); ctx.stroke(); }
      else { ctx.fillStyle = f.color; ctx.font = 'bold 14px system-ui,sans-serif'; ctx.fillText(f.text, f.x * CELL, (f.y - (1 - a) * 0.6) * CELL - 12); }
      ctx.globalAlpha = 1;
    }
    if (flashT > 0) { ctx.fillStyle = 'rgba(220,40,40,' + Math.min(0.3, flashT) + ')'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (paused && !over) {
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 44px system-ui,sans-serif'; ctx.fillText('Paused', canvas.width / 2, canvas.height / 2);
    }
  }
  function rangeRing(x, y, r, color) {
    ctx.beginPath(); ctx.arc((x + 0.5) * CELL, (y + 0.5) * CELL, r * CELL, 0, 7);
    ctx.fillStyle = color; ctx.globalAlpha = 0.12; ctx.fill(); ctx.globalAlpha = 0.7; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
  }
  function drawTower(t) {
    const cx = (t.x + 0.5) * CELL, cy = (t.y + 0.5) * CELL, d = TOWERS[t.type];
    ctx.fillStyle = theme['--tower-base']; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fill();
    ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t.angle || 0);
    ctx.fillStyle = '#222'; ctx.fillRect(0, -3, t.type === 'sniper' ? 26 : 19, 6); ctx.restore();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < t.level; i++) { ctx.beginPath(); ctx.arc(cx - (t.level - 1) * 4 + i * 8, cy + 27, 2.4, 0, 7); ctx.fill(); }
  }
  function drawEnemy(e) {
    const px = e.x * CELL, py = e.y * CELL, r = e.r * CELL;
    if (e.flying) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(px, py + 12, r, r * 0.5, 0, 0, 7); ctx.fill(); }
    ctx.fillStyle = e.d.color; ctx.beginPath();
    if (e.flying) { ctx.moveTo(px + r, py); ctx.lineTo(px - r, py - r); ctx.lineTo(px - r * 0.5, py); ctx.lineTo(px - r, py + r); ctx.closePath(); }
    else ctx.arc(px, py, r, 0, 7);
    ctx.fill();
    if (e.slowT > 0) { ctx.strokeStyle = '#46aedb'; ctx.lineWidth = 3; ctx.stroke(); }
    const w = Math.max(20, r * 2);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(px - w / 2, py - r - 9, w, 4);
    ctx.fillStyle = '#4ccf5d'; ctx.fillRect(px - w / 2, py - r - 9, w * Math.max(0, e.hp / e.max), 4);
  }

  // ---------- Input ----------
  function cellFromEvent(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: Math.floor((ev.clientX - r.left) / r.width * COLS), y: Math.floor((ev.clientY - r.top) / r.height * ROWS) };
  }
  function activate(x, y) { if (buildType) tryPlace(x, y); else selectAt(x, y); }
  canvas.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    const c = cellFromEvent(ev); if (inBounds(c.x, c.y)) { cursor = c; showCursor = true; }
  });
  canvas.addEventListener('pointerleave', (ev) => { if (ev.pointerType !== 'touch') showCursor = false; });
  canvas.addEventListener('pointerdown', (ev) => {
    const c = cellFromEvent(ev); if (!inBounds(c.x, c.y)) return;
    ev.preventDefault();
    if (ev.pointerType === 'touch' && buildType) {
      // Touch: first tap previews the spot, second tap on the same cell builds.
      const same = lastTouchCell && lastTouchCell.x === c.x && lastTouchCell.y === c.y;
      cursor = c; showCursor = true;
      if (!same) { lastTouchCell = c; say(placementProblem(c.x, c.y) || 'Tap again to build.'); return; }
      lastTouchCell = null; tryPlace(c.x, c.y); return;
    }
    cursor = c; showCursor = true; lastTouchCell = null;
    activate(c.x, c.y);
  });
  document.addEventListener('keydown', (ev) => {
    const tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const k = ev.key, onCanvas = ev.target === canvas;
    const n = TOWER_KEYS.findIndex((t) => TOWERS[t].key === k);
    if (n >= 0) { chooseType(TOWER_KEYS[n]); showCursor = true; return; }
    if (onCanvas && k.startsWith('Arrow')) {
      ev.preventDefault(); showCursor = true;
      cursor = { x: Math.max(0, Math.min(COLS - 1, cursor.x + (k === 'ArrowRight') - (k === 'ArrowLeft'))), y: Math.max(0, Math.min(ROWS - 1, cursor.y + (k === 'ArrowDown') - (k === 'ArrowUp'))) };
      const t = grid[cursor.y][cursor.x];
      say('Cell ' + (cursor.x + 1) + ', ' + (cursor.y + 1) + (t ? ': ' + TOWERS[t.type].name + ' level ' + t.level : ''));
      return;
    }
    if (onCanvas && (k === 'Enter' || k === ' ')) { ev.preventDefault(); showCursor = true; activate(cursor.x, cursor.y); return; }
    switch (k.toLowerCase()) {
      case 'n': sendWave(); break;
      case 'p': togglePause(); break;
      case 'u': upgrade(); break;
      case 's': sell(); break;
      case 't': cycleMode(); break;
      case 'f': setSpeed(speed % 3 + 1); break;
      case 'escape': buildType = null; selected = null; updateAll(); break;
      default:
    }
  });
  $('sendBtn').addEventListener('click', sendWave);
  $('pauseBtn').addEventListener('click', togglePause);
  $('ovBtn').addEventListener('click', () => { reset(); canvas.focus(); });
  document.querySelectorAll('.speeds button').forEach((b) => b.addEventListener('click', () => setSpeed(Number(b.dataset.speed))));

  // ---------- Main loop ----------
  let last = performance.now(), acc = 0;
  function frame(now) {
    const real = Math.min(0.1, (now - last) / 1000); last = now;
    if (flashT > 0) flashT -= real;
    if (!paused && !over) {
      acc += real * speed;
      let n = 0;
      while (acc >= DT && n++ < 30) { tick(); acc -= DT; if (over) break; }
      if (acc > DT * 30) acc = 0;
    }
    draw();
    requestAnimationFrame(frame);
  }

  best = loadBest(); speed = 1;
  readTheme();
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', readTheme);
  }
  buildShop(); reset();
  requestAnimationFrame(frame);
  // Read-only helpers used by automated checks.
  window.__td = { state: () => ({ gold, lives, wave, towers: towers.length, enemies: enemies.length, over }), placementProblem, routeFromSpawn,
    addGold: (n) => { gold += n; updateHud(); },
    place: (k, x, y) => { buildType = k; tryPlace(x, y); } };
})();
