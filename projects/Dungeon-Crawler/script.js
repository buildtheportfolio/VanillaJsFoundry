(function (root) {
  'use strict';

  // ================= Core (pure, testable in Node) =================
  const MAP_W = 48, MAP_H = 32, FOV_RADIUS = 8;
  const WALL = 0, FLOOR = 1, STAIRS = 2;

  function hashString(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  // mulberry32 seeded from a string
  function makeRng(seedStr) {
    let a = hashString(String(seedStr));
    const next = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    next.pick = (arr) => arr[Math.floor(next() * arr.length)];
    return next;
  }

  const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  function bfsDistances(map, sx, sy, limit) {
    const { w, h, tiles } = map, d = new Int16Array(w * h).fill(-1);
    const q = [sx + sy * w]; d[q[0]] = 0;
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % w, y = (c / w) | 0, dv = d[c];
      if (limit && dv >= limit) continue;
      for (const [dx, dy] of DIRS4) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = nx + ny * w;
        if (tiles[n] === WALL || d[n] !== -1) continue;
        d[n] = dv + 1; q.push(n);
      }
    }
    return d;
  }

  // Rooms + L-shaped corridors. Rooms are chained in order so the map is connected by construction.
  function generate(seed, floor, w = MAP_W, h = MAP_H) {
    const rnd = makeRng(seed + ':floor:' + floor);
    const tiles = new Uint8Array(w * h);
    const rooms = [];
    for (let attempt = 0; attempt < 300 && rooms.length < 11; attempt++) {
      const rw = rnd.int(4, 10), rh = rnd.int(3, 6);
      const rx = rnd.int(1, w - rw - 2), ry = rnd.int(1, h - rh - 2);
      if (rooms.some((r) => rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y)) continue;
      rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
    }
    // Fallback: always at least two rooms
    if (rooms.length < 2) {
      rooms.length = 0;
      rooms.push({ x: 2, y: 2, w: 6, h: 4, cx: 5, cy: 4 }, { x: w - 10, y: h - 8, w: 6, h: 4, cx: w - 7, cy: h - 6 });
    }
    rooms.sort((a, b) => a.cx - b.cx);
    for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[x + y * w] = FLOOR;
    const carve = (x, y) => { tiles[x + y * w] = FLOOR; };
    const hline = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) carve(x, y); };
    const vline = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) carve(x, y); };
    const link = (a, b) => {
      if (rnd() < 0.5) { hline(a.cx, b.cx, a.cy); vline(a.cy, b.cy, b.cx); }
      else { vline(a.cy, b.cy, a.cx); hline(a.cx, b.cx, b.cy); }
    };
    for (let i = 1; i < rooms.length; i++) link(rooms[i - 1], rooms[i]);
    for (let i = 0; i < 2 && rooms.length > 3; i++) link(rnd.pick(rooms), rnd.pick(rooms)); // loops
    const map = { w, h, tiles, rooms, floor };
    const start = { x: rooms[0].cx, y: rooms[0].cy };
    const d = bfsDistances(map, start.x, start.y);
    let far = rooms[0], fd = -1;
    for (const r of rooms) { const v = d[r.cx + r.cy * w]; if (v > fd) { fd = v; far = r; } }
    map.start = start; map.stairs = { x: far.cx, y: far.cy };
    tiles[far.cx + far.cy * w] = STAIRS;
    return map;
  }

  // Every floor tile reachable from the start, and the stairs among them.
  function isConnected(map) {
    const d = bfsDistances(map, map.start.x, map.start.y);
    let floors = 0, reached = 0;
    for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] !== WALL) { floors++; if (d[i] >= 0) reached++; }
    return floors === reached && d[map.stairs.x + map.stairs.y * map.w] >= 0;
  }

  // Recursive shadowcasting (8 octants). Calls mark(x, y) for each lit tile.
  const MULT = [[1, 0, 0, -1, -1, 0, 0, 1], [0, 1, -1, 0, 0, -1, 1, 0], [0, 1, 1, 0, 0, -1, -1, 0], [1, 0, 0, 1, -1, 0, 0, -1]];
  function computeFov(map, cx, cy, radius, mark) {
    const { w, h, tiles } = map, r2 = radius * radius;
    const blocks = (x, y) => x < 0 || y < 0 || x >= w || y >= h || tiles[x + y * w] === WALL;
    mark(cx, cy);
    function cast(row, start, end, xx, xy, yx, yy) {
      if (start < end) return;
      let newStart = 0;
      for (let i = row; i <= radius; i++) {
        let dx = -i - 1, blocked = false;
        const dy = -i;
        while (dx <= 0) {
          dx++;
          const X = cx + dx * xx + dy * xy, Y = cy + dx * yx + dy * yy;
          // epsilon offsets keep shadow edges from splitting tiles inconsistently
          const lSlope = (dx - 0.5) / (dy + 0.5), rSlope = (dx + 0.5) / (dy - 0.5);
          if (start < rSlope - 1e-9) continue;
          if (end > lSlope + 1e-9) break;
          const wall = blocks(X, Y);
          if (dx * dx + dy * dy <= r2 && X >= 0 && Y >= 0 && X < w && Y < h) mark(X, Y);
          if (blocked) {
            if (wall) { newStart = rSlope; continue; }
            blocked = false; start = newStart;
          } else if (wall && i < radius) {
            blocked = true;
            cast(i + 1, start, lSlope, xx, xy, yx, yy);
            newStart = rSlope;
          }
        }
        if (blocked) break;
      }
    }
    for (let oct = 0; oct < 8; oct++) cast(1, 1.0, 0.0, MULT[0][oct], MULT[1][oct], MULT[2][oct], MULT[3][oct]);
  }

  // ================= Game data =================
  const MONSTERS = [
    { id: 'rat',      name: 'Giant Rat',   glyph: 'r', color: '#c9a27a', hp: 6,  atk: 2, def: 0, xp: 3,  min: 1, weight: 5, ai: 'erratic' },
    { id: 'goblin',   name: 'Goblin',      glyph: 'g', color: '#6fbf5f', hp: 12, atk: 4, def: 1, xp: 8,  min: 1, weight: 4, ai: 'chase' },
    { id: 'archer',   name: 'Skeleton Archer', glyph: 'a', color: '#d7d2c4', hp: 9, atk: 3, def: 0, xp: 10, min: 2, weight: 3, ai: 'ranged' },
    { id: 'ogre',     name: 'Ogre',        glyph: 'O', color: '#d0674a', hp: 30, atk: 8, def: 2, xp: 28, min: 3, weight: 2, ai: 'chase', slow: true }
  ];
  const WEAPONS = [['Rusty Dagger', 1], ['Short Sword', 2], ['Battle Axe', 3], ['War Hammer', 5], ['Runed Blade', 7]];
  const ARMORS = [['Leather Vest', 1], ['Chain Mail', 2], ['Plate Armor', 4], ['Dragon Scale', 6]];

  function makeItem(kind, tier) {
    switch (kind) {
      case 'potion': return { kind, name: 'Health Potion', heal: 12 };
      case 'greater': return { kind: 'potion', name: 'Greater Potion', heal: 30 };
      case 'elixir': return { kind, name: 'Elixir of Might', might: 1 };
      case 'weapon': { const [n, a] = WEAPONS[Math.min(tier, WEAPONS.length - 1)]; return { kind, name: n, atk: a }; }
      default: { const [n, d] = ARMORS[Math.min(tier, ARMORS.length - 1)]; return { kind: 'armor', name: n, def: d }; }
    }
  }
  const itemText = (it) => it.kind === 'potion' ? it.name + ' (heals ' + it.heal + ')' : it.kind === 'elixir' ? it.name + ' (+1 attack)' : it.kind === 'weapon' ? it.name + ' (+' + it.atk + ' atk)' : it.name + ' (+' + it.def + ' def)';

  // Place monsters, items and gold for a floor deterministically from the seed.
  function populate(map, seed) {
    const rnd = makeRng(seed + ':pop:' + map.floor), f = map.floor;
    const occupied = new Set([map.start.x + map.start.y * map.w, map.stairs.x + map.stairs.y * map.w]);
    const spot = (room) => {
      for (let i = 0; i < 30; i++) {
        const x = rnd.int(room.x, room.x + room.w - 1), y = rnd.int(room.y, room.y + room.h - 1), k = x + y * map.w;
        if (!occupied.has(k)) { occupied.add(k); return { x, y }; }
      }
      return null;
    };
    const others = map.rooms.slice(1);
    const monsters = [], items = [];
    const count = Math.min(14, 3 + Math.floor(f * 1.5));
    const pool = MONSTERS.filter((m) => m.min <= f);
    const total = pool.reduce((s, m) => s + m.weight, 0);
    for (let i = 0; i < count; i++) {
      let roll = rnd() * total, def = pool[0];
      for (const m of pool) { roll -= m.weight; if (roll <= 0) { def = m; break; } }
      const p = spot(rnd.pick(others)); if (!p) continue;
      const hp = Math.round(def.hp * (1 + 0.18 * (f - 1)));
      monsters.push({ def, x: p.x, y: p.y, hp, max: hp, atk: def.atk + Math.floor(f / 2), alert: 0, tick: 0 });
    }
    const nItems = 3 + rnd.int(0, 2);
    for (let i = 0; i < nItems; i++) {
      const p = spot(rnd.pick(map.rooms)); if (!p) continue;
      const r = rnd(), tier = Math.min(4, Math.floor((f - 1) / 2) + (rnd() < 0.3 ? 1 : 0));
      let item;
      if (r < 0.40) item = makeItem('potion');
      else if (r < 0.50) item = makeItem(f >= 3 ? 'greater' : 'potion');
      else if (r < 0.58) item = makeItem('elixir');
      else if (r < 0.80) item = makeItem('weapon', tier);
      else item = makeItem('armor', tier);
      items.push({ x: p.x, y: p.y, item });
    }
    for (let i = 0; i < 3; i++) { const p = spot(rnd.pick(map.rooms)); if (p) items.push({ x: p.x, y: p.y, gold: rnd.int(5, 12) * f }); }
    return { monsters, items };
  }

  const api = { makeRng, hashString, generate, isConnected, computeFov, bfsDistances, populate, WALL, FLOOR, STAIRS, MAP_W, MAP_H, FOV_RADIUS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document === 'undefined') return;

  // ================= Game + UI (browser only) =================
  const $ = (id) => document.getElementById(id);
  const canvas = $('view'), ctx = canvas.getContext('2d');
  const TILE = 32, VW = 21, VH = 15;
  const STORE_KEY = 'foundry-dungeon-crawler-best';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PACK_MAX = 8;
  let G = null, best = loadBest(), fx = [];

  function loadBest() { try { const v = JSON.parse(localStorage.getItem(STORE_KEY)); return v && typeof v.score === 'number' ? v : { score: 0 }; } catch (e) { return { score: 0 }; } }
  function saveBest(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  function randomSeed() { return Math.random().toString(36).slice(2, 8); }

  function newGame(seed) {
    G = { seed, floor: 1, turn: 0, kills: 0, gold: 0, xp: 0, lvl: 1, dead: false, killedBy: '',
      p: { x: 0, y: 0, hp: 30, max: 30, atk: 3, def: 0 }, weapon: null, armor: null, pack: [], log: [],
      rng: makeRng(seed + ':play') };
    enterFloor(1, true);
    $('summary').hidden = true;
    $('seed').value = seed;
    try { const u = new URL(location.href); u.searchParams.set('seed', seed); history.replaceState(null, '', u.toString()); } catch (e) { /* ignore */ }
    msg('You descend into the dungeon. Seed: ' + seed, 'info');
    refresh();
  }
  function enterFloor(n, first) {
    G.floor = n;
    G.map = generate(G.seed, n);
    const pop = populate(G.map, G.seed);
    G.monsters = pop.monsters; G.items = pop.items;
    G.seen = new Uint8Array(G.map.w * G.map.h); G.vis = new Uint8Array(G.map.w * G.map.h);
    G.p.x = G.map.start.x; G.p.y = G.map.start.y;
    if (!first) { const heal = Math.ceil(G.p.max * 0.25); G.p.hp = Math.min(G.p.max, G.p.hp + heal); msg('You reach floor ' + n + ' and catch your breath.', 'info'); }
    updateFov();
  }

  function msg(text, cls) {
    G.log.push({ text, cls: cls || '' });
    if (G.log.length > 80) G.log.shift();
    const ul = $('log'), li = document.createElement('li');
    li.textContent = text; if (cls) li.className = cls;
    ul.append(li);
    while (ul.children.length > 80) ul.firstChild.remove();
    ul.scrollTop = ul.scrollHeight;
  }

  const idx = (x, y) => x + y * G.map.w;
  const passable = (x, y) => x >= 0 && y >= 0 && x < G.map.w && y < G.map.h && G.map.tiles[idx(x, y)] !== WALL;
  const monsterAt = (x, y) => G.monsters.find((m) => m.x === x && m.y === y);
  const pAtk = () => G.p.atk + (G.weapon ? G.weapon.atk : 0);
  const pDef = () => G.p.def + (G.armor ? G.armor.def : 0);
  const roll = (lo, hi) => lo + Math.floor(G.rng() * (hi - lo + 1));
  const score = () => G.floor * 100 + G.kills * 10 + G.gold + G.lvl * 20;

  function updateFov() {
    G.vis.fill(0);
    computeFov(G.map, G.p.x, G.p.y, FOV_RADIUS, (x, y) => { const i = idx(x, y); G.vis[i] = 1; G.seen[i] = 1; });
  }

  // ---- Player actions ----
  function act(dx, dy) {
    if (!G || G.dead) return;
    const nx = G.p.x + dx, ny = G.p.y + dy, m = monsterAt(nx, ny);
    if (m) { attack(m); endTurn(); return; }
    if (!passable(nx, ny)) return;
    G.p.x = nx; G.p.y = ny;
    pickUp();
    if (G.map.tiles[idx(nx, ny)] === STAIRS) msg('Stairs lead down. Press > or Enter to descend.', 'info');
    endTurn();
  }
  function wait() { if (!G || G.dead) return; endTurn(); }
  function attack(m) {
    const dmg = Math.max(1, pAtk() + roll(-1, 1) - m.def.def);
    m.hp -= dmg; addFx(m.x, m.y, '#ffd75e');
    if (m.hp <= 0) {
      G.monsters = G.monsters.filter((o) => o !== m); G.kills++;
      msg('You slay the ' + m.def.name + ' (+' + m.def.xp + ' xp).', 'good');
      gainXp(m.def.xp);
    } else msg('You hit the ' + m.def.name + ' for ' + dmg + '.');
  }
  function gainXp(n) {
    G.xp += n;
    while (G.xp >= 10 + 8 * (G.lvl - 1)) {
      G.xp -= 10 + 8 * (G.lvl - 1); G.lvl++;
      G.p.max += 6; G.p.hp = Math.min(G.p.max, G.p.hp + 6);
      if (G.lvl % 2 === 0) G.p.atk++;
      if (G.lvl % 3 === 0) G.p.def++;
      msg('Level up! You are now level ' + G.lvl + '.', 'good');
    }
  }
  function pickUp() {
    const i = G.items.findIndex((o) => o.x === G.p.x && o.y === G.p.y);
    if (i < 0) return;
    const o = G.items[i];
    if (o.gold) { G.gold += o.gold; G.items.splice(i, 1); msg('You pick up ' + o.gold + ' gold.', 'good'); return; }
    if (G.pack.length >= PACK_MAX) { msg('Your pack is full. Use something to make room.', 'bad'); return; }
    G.pack.push(o.item); G.items.splice(i, 1);
    msg('You pick up a ' + o.item.name + '.', 'good');
  }
  function useItem(n) {
    if (!G || G.dead) return;
    const it = G.pack[n]; if (!it) return;
    if (it.kind === 'potion') {
      const before = G.p.hp; G.p.hp = Math.min(G.p.max, G.p.hp + it.heal);
      msg('You drink the ' + it.name + ' and recover ' + (G.p.hp - before) + ' HP.', 'good');
    } else if (it.kind === 'elixir') { G.p.atk += it.might; msg('Power surges through you. Attack +1.', 'good'); }
    else if (it.kind === 'weapon') { const old = G.weapon; G.weapon = it; msg('You wield the ' + it.name + '.', 'good'); G.pack.splice(n, 1); if (old) G.pack.push(old); endTurn(); return; }
    else { const old = G.armor; G.armor = it; msg('You put on the ' + it.name + '.', 'good'); G.pack.splice(n, 1); if (old) G.pack.push(old); endTurn(); return; }
    G.pack.splice(n, 1);
    endTurn();
  }
  function descend() {
    if (!G || G.dead) return;
    if (G.map.tiles[idx(G.p.x, G.p.y)] !== STAIRS) { msg('There are no stairs here.', 'info'); refresh(); return; }
    enterFloor(G.floor + 1, false);
    G.turn++;
    refresh();
  }

  // ---- Monster turn ----
  function hurtPlayer(m, verb) {
    const dmg = Math.max(1, m.atk + roll(-1, 1) - pDef());
    G.p.hp -= dmg; addFx(G.p.x, G.p.y, '#ff4d3d');
    msg('The ' + m.def.name + ' ' + verb + ' you for ' + dmg + '.', 'bad');
    if (G.p.hp <= 0) die(m.def.name);
  }
  function monstersAct() {
    const dist = bfsDistances(G.map, G.p.x, G.p.y, 30);
    for (const m of G.monsters.slice()) {
      if (G.dead) break;
      const sees = G.vis[idx(m.x, m.y)] === 1;
      if (sees) m.alert = 12; else if (m.alert > 0) m.alert--;
      m.tick++;
      if (m.def.slow && m.tick % 2) continue;
      const dx = G.p.x - m.x, dy = G.p.y - m.y, adj = Math.abs(dx) + Math.abs(dy) === 1;
      if (adj) { hurtPlayer(m, 'hits'); continue; }
      if (m.def.ai === 'ranged' && sees && Math.abs(dx) + Math.abs(dy) <= 6) { hurtPlayer(m, 'shoots'); continue; }
      if (m.def.ai === 'erratic' && (!sees || G.rng() < 0.3)) { wander(m); continue; }
      if (m.alert > 0) stepToward(m, dist); else if (G.rng() < 0.3) wander(m);
    }
  }
  function free(x, y) { return passable(x, y) && !monsterAt(x, y) && !(x === G.p.x && y === G.p.y); }
  function stepToward(m, dist) {
    let bx = -1, by = -1, bd = dist[idx(m.x, m.y)] < 0 ? 1e9 : dist[idx(m.x, m.y)];
    for (const [dx, dy] of DIRS4) {
      const x = m.x + dx, y = m.y + dy, d = free(x, y) ? dist[idx(x, y)] : -1;
      if (d >= 0 && d < bd) { bd = d; bx = x; by = y; }
    }
    if (bx >= 0) { m.x = bx; m.y = by; } else wander(m);
  }
  function wander(m) {
    const [dx, dy] = DIRS4[Math.floor(G.rng() * 4)];
    if (free(m.x + dx, m.y + dy)) { m.x += dx; m.y += dy; }
  }

  function endTurn() {
    G.turn++;
    monstersAct();
    updateFov();
    refresh();
  }
  function die(by) {
    G.dead = true; G.killedBy = by;
    msg('You died, slain by a ' + by + '.', 'bad');
    const sc = score(), isBest = sc > best.score;
    if (isBest) { best = { score: sc, floor: G.floor, seed: G.seed }; saveBest(best); }
    const list = $('sumList'); list.textContent = '';
    const rows = [['Slain by', by], ['Floor reached', G.floor], ['Level', G.lvl], ['Monsters slain', G.kills], ['Gold', G.gold], ['Turns', G.turn], ['Seed', G.seed], ['Score', sc + (isBest ? ' (new best!)' : '')]];
    for (const [k, v] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = String(v); list.append(dt, dd); }
    $('summary').hidden = false; $('retryBtn').focus();
  }

  // ---- UI ----
  function refresh() {
    $('hp').textContent = Math.max(0, G.p.hp) + '/' + G.p.max;
    $('hpBar').style.width = Math.max(0, G.p.hp / G.p.max * 100) + '%';
    $('floor').textContent = G.floor; $('lvl').textContent = G.lvl;
    $('ad').textContent = pAtk() + '/' + pDef(); $('gold').textContent = G.gold;
    $('best').textContent = best.score;
    $('equip').textContent = 'Weapon: ' + (G.weapon ? itemText(G.weapon) : 'fists') + '. Armor: ' + (G.armor ? itemText(G.armor) : 'none') + '.';
    $('packCount').textContent = '(' + G.pack.length + '/' + PACK_MAX + ')';
    const ol = $('pack'); ol.textContent = '';
    if (!G.pack.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Empty. Explore to find items.'; ol.append(li); }
    G.pack.forEach((it, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = (i + 1) + '. ' + itemText(it);
      b.addEventListener('click', () => useItem(i));
      li.append(b); ol.append(li);
    });
    $('stairBtn').disabled = G.dead || G.map.tiles[idx(G.p.x, G.p.y)] !== STAIRS;
  }
  function addFx(x, y, color) { if (!reduceMotion) fx.push({ x, y, color, t: 1 }); }

  function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!G) return;
    const { w, h, tiles } = G.map;
    const camX = Math.max(0, Math.min(w - VW, G.p.x - (VW >> 1))), camY = Math.max(0, Math.min(h - VH, G.p.y - (VH >> 1)));
    ctx.font = 'bold 22px ui-monospace,Consolas,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let sy = 0; sy < VH; sy++) for (let sx = 0; sx < VW; sx++) {
      const x = camX + sx, y = camY + sy, i = x + y * w;
      if (!G.seen[i]) continue;
      const vis = G.vis[i] === 1, t = tiles[i];
      const lit = vis ? 1 - Math.hypot(x - G.p.x, y - G.p.y) / (FOV_RADIUS + 3) : 0;
      const px = sx * TILE, py = sy * TILE;
      if (t === WALL) ctx.fillStyle = vis ? 'hsl(25,12%,' + (24 + lit * 20) + '%)' : '#1f1c1b';
      else ctx.fillStyle = vis ? 'hsl(30,16%,' + (14 + lit * 20) + '%)' : '#12100f';
      ctx.fillRect(px, py, TILE, TILE);
      if (t === WALL && vis) { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(px, py + TILE - 5, TILE, 5); }
      if (t === STAIRS) { ctx.fillStyle = vis ? '#f0d36b' : '#6b5f33'; ctx.fillText('>', px + TILE / 2, py + TILE / 2 + 1); }
    }
    for (const o of G.items) {
      const i = o.x + o.y * w; if (!G.seen[i]) continue;
      const sx = o.x - camX, sy = o.y - camY; if (sx < 0 || sy < 0 || sx >= VW || sy >= VH) continue;
      ctx.fillStyle = G.vis[i] ? (o.gold ? '#f0c53a' : o.item.kind === 'potion' ? '#e0569a' : o.item.kind === 'elixir' ? '#a56af0' : '#8fc4ff') : '#555';
      ctx.fillText(o.gold ? '$' : o.item.kind === 'potion' ? '!' : o.item.kind === 'elixir' ? '?' : o.item.kind === 'weapon' ? '/' : '[', sx * TILE + TILE / 2, sy * TILE + TILE / 2 + 1);
    }
    for (const m of G.monsters) {
      if (!G.vis[m.x + m.y * w]) continue;
      const sx = m.x - camX, sy = m.y - camY; if (sx < 0 || sy < 0 || sx >= VW || sy >= VH) continue;
      ctx.fillStyle = m.def.color; ctx.fillText(m.def.glyph, sx * TILE + TILE / 2, sy * TILE + TILE / 2 + 1);
      ctx.fillStyle = '#400'; ctx.fillRect(sx * TILE + 4, sy * TILE + TILE - 5, TILE - 8, 3);
      ctx.fillStyle = '#e04a3a'; ctx.fillRect(sx * TILE + 4, sy * TILE + TILE - 5, (TILE - 8) * m.hp / m.max, 3);
    }
    ctx.fillStyle = G.dead ? '#a33' : '#fff'; ctx.fillText(G.dead ? 'x' : '@', (G.p.x - camX) * TILE + TILE / 2, (G.p.y - camY) * TILE + TILE / 2 + 1);
    for (const f of fx) { ctx.globalAlpha = f.t * 0.55; ctx.fillStyle = f.color; ctx.fillRect((f.x - camX) * TILE, (f.y - camY) * TILE, TILE, TILE); f.t -= 0.08; }
    ctx.globalAlpha = 1; fx = fx.filter((f) => f.t > 0);
  }
  function loop() { draw(); requestAnimationFrame(loop); }

  // ---- Input ----
  const KEYMAP = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0] };
  document.addEventListener('keydown', (ev) => {
    const tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (tag === 'BUTTON' && (ev.key === 'Enter' || ev.key === ' ')) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (KEYMAP[k]) { ev.preventDefault(); act(KEYMAP[k][0], KEYMAP[k][1]); return; }
    if (k === '.' || k === ' ' || k === '5') { ev.preventDefault(); wait(); return; }
    if (k === '>' || k === 'Enter') { ev.preventDefault(); descend(); return; }
    if (/^[1-8]$/.test(k)) { useItem(Number(k) - 1); }
  });
  document.querySelectorAll('.dpad [data-dx]').forEach((b) => b.addEventListener('click', () => act(Number(b.dataset.dx), Number(b.dataset.dy))));
  $('waitBtn').addEventListener('click', wait);
  $('stairBtn').addEventListener('click', descend);
  canvas.addEventListener('pointerdown', (ev) => {
    if (!G || G.dead) return;
    const r = canvas.getBoundingClientRect();
    const camX = Math.max(0, Math.min(G.map.w - VW, G.p.x - (VW >> 1))), camY = Math.max(0, Math.min(G.map.h - VH, G.p.y - (VH >> 1)));
    const tx = camX + Math.floor((ev.clientX - r.left) / r.width * VW), ty = camY + Math.floor((ev.clientY - r.top) / r.height * VH);
    const dx = tx - G.p.x, dy = ty - G.p.y;
    if (dx === 0 && dy === 0) { if (G.map.tiles[idx(tx, ty)] === STAIRS) descend(); else wait(); return; }
    if (Math.abs(dx) >= Math.abs(dy)) act(Math.sign(dx), 0); else act(0, Math.sign(dy));
  });
  function start(seed) { newGame((seed || '').trim() || randomSeed()); canvas.focus(); }
  $('goBtn').addEventListener('click', () => start($('seed').value));
  $('seed').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); start($('seed').value); } });
  $('retryBtn').addEventListener('click', () => start(G.seed));
  $('newBtn').addEventListener('click', () => start(randomSeed()));
  $('shareBtn').addEventListener('click', () => {
    const u = new URL(location.href); u.searchParams.set('seed', G.seed);
    const text = u.toString(), note = $('shareMsg');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => { note.textContent = 'Link copied. Same seed, same dungeon.'; }, () => { note.textContent = 'Copy failed. Share the seed: ' + G.seed; });
    } else note.textContent = 'Share this seed: ' + G.seed;
  });

  let initial = '';
  try { initial = new URL(location.href).searchParams.get('seed') || ''; } catch (e) { /* ignore */ }
  newGame(initial.slice(0, 40) || randomSeed());
  requestAnimationFrame(loop);
  window.__dc = { state: () => G, act, descend };
})(typeof window !== 'undefined' ? window : globalThis);
