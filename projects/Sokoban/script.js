'use strict';

/*
 * Sokoban. Legend:  # wall   @ player   + player on goal   $ crate
 *                   * crate on goal   . goal   (space) floor
 * Every level below is verified solvable by a BFS solver (see the Node test
 * that requires this file and runs `solve` on each level).
 */
const LEVELS = __LEVELS__;

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/* ---------- pure game logic (also used by the Node solvability test) ---------- */
function parseLevel(rows) {
  const h = rows.length;
  const w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  const walls = new Uint8Array(w * h);
  const goals = new Uint8Array(w * h);
  const boxes = [];
  let player = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x] || ' ';
      const i = y * w + x;
      if (c === '#') walls[i] = 1;
      if (c === '.' || c === '*' || c === '+') goals[i] = 1;
      if (c === '$' || c === '*') boxes.push(i);
      if (c === '@' || c === '+') player = i;
    }
  }
  return { w: w, h: h, walls: walls, goals: goals, boxes: boxes, player: player };
}

/* Try to move; returns null if blocked, else {player, boxes, pushed:boxIndex|-1, from} (does not mutate). */
function tryMove(lv, player, boxes, dx, dy) {
  const w = lv.w, h = lv.h;
  const px = player % w, py = (player / w) | 0;
  const nx = px + dx, ny = py + dy;
  if (nx < 0 || ny < 0 || nx >= w || ny >= h) return null;
  const ni = ny * w + nx;
  if (lv.walls[ni]) return null;
  const bi = boxes.indexOf(ni);
  if (bi < 0) return { player: ni, boxes: boxes, pushed: -1 };
  const bx = nx + dx, by = ny + dy;
  if (bx < 0 || by < 0 || bx >= w || by >= h) return null;
  const bn = by * w + bx;
  if (lv.walls[bn] || boxes.indexOf(bn) >= 0) return null;
  const nb = boxes.slice();
  nb[bi] = bn;
  return { player: ni, boxes: nb, pushed: bi };
}

function isSolved(lv, boxes) {
  for (let i = 0; i < boxes.length; i++) if (!lv.goals[boxes[i]]) return false;
  return true;
}

/* Breadth-first solver. Returns a string of u/d/l/r moves, or null if unsolvable
   (or undefined if the node limit was hit). */
function solve(rows, limit) {
  const lv = parseLevel(rows);
  const names = [['u', 0, -1], ['d', 0, 1], ['l', -1, 0], ['r', 1, 0]];
  const max = limit || 2000000;
  const sortNum = function (a, b) { return a - b; };
  const startBoxes = lv.boxes.slice().sort(sortNum);
  const keyOf = function (p, b) { return p + ':' + b.join(','); };
  const startKey = keyOf(lv.player, startBoxes);
  if (isSolved(lv, startBoxes)) return '';
  const parent = new Map();
  parent.set(startKey, null);
  let queue = [[lv.player, startBoxes]];
  let qi = 0;
  while (qi < queue.length) {
    if (qi > max) return undefined;
    const cur = queue[qi++];
    const curKey = keyOf(cur[0], cur[1]);
    for (let d = 0; d < 4; d++) {
      const r = tryMove(lv, cur[0], cur[1], names[d][1], names[d][2]);
      if (!r) continue;
      let nb = r.boxes;
      if (r.pushed >= 0) nb = nb.slice().sort(sortNum);
      const k = keyOf(r.player, nb);
      if (parent.has(k)) continue;
      parent.set(k, [curKey, names[d][0]]);
      if (isSolved(lv, nb)) {
        let out = '';
        let kk = k;
        while (parent.get(kk)) { const e = parent.get(kk); out = e[1] + out; kk = e[0]; }
        return out;
      }
      queue.push([r.player, nb]);
    }
  }
  return null;
}

/* ---------- UI ---------- */
function initUI() {
  const $ = function (id) { return document.getElementById(id); };
  const boardEl = $('board'), wrapEl = $('boardWrap');
  const statusEl = $('status'), winEl = $('win');
  const STORE = 'foundry.sokoban.v1';

  let save = { done: {}, best: {}, current: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE));
    if (raw && typeof raw === 'object') {
      save.done = raw.done && typeof raw.done === 'object' ? raw.done : {};
      save.best = raw.best && typeof raw.best === 'object' ? raw.best : {};
      save.current = Number.isInteger(raw.current) && raw.current >= 0 && raw.current < LEVELS.length ? raw.current : 0;
    }
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* ignore */ }
  }

  let lv, player, boxes, moves, pushes, undoStack, redoStack, cells, won, levelIndex;

  function loadLevel(i) {
    levelIndex = i;
    lv = parseLevel(LEVELS[i]);
    player = lv.player;
    boxes = lv.boxes.slice();
    moves = 0; pushes = 0; undoStack = []; redoStack = []; won = false;
    save.current = i;
    persist();
    winEl.hidden = true;
    buildBoard();
    refresh();
    renderLevels();
    say('Level ' + (i + 1) + ' of ' + LEVELS.length + ': ' + boxes.length + (boxes.length === 1 ? ' crate' : ' crates') + '.');
  }

  function buildBoard() {
    while (boardEl.firstChild) boardEl.removeChild(boardEl.firstChild);
    boardEl.style.gridTemplateColumns = 'repeat(' + lv.w + ', var(--cs))';
    cells = [];
    // outside area = void: flood fill from borders through non-wall cells would
    // mark reachable floor; anything unreachable and not wall is void.
    const inside = reachable();
    for (let i = 0; i < lv.w * lv.h; i++) {
      const d = document.createElement('div');
      d.className = 'c ' + (lv.walls[i] ? 'wall' : inside[i] ? 'floor' : 'void');
      if (lv.goals[i]) d.classList.add('goal');
      boardEl.appendChild(d);
      cells.push(d);
    }
    fit();
  }

  function reachable() {
    const seen = new Uint8Array(lv.w * lv.h);
    const st = [lv.player];
    seen[lv.player] = 1;
    while (st.length) {
      const i = st.pop(), x = i % lv.w, y = (i / lv.w) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        const nx = x + d[0], ny = y + d[1];
        if (nx < 0 || ny < 0 || nx >= lv.w || ny >= lv.h) return;
        const ni = ny * lv.w + nx;
        if (seen[ni] || lv.walls[ni]) return;
        seen[ni] = 1; st.push(ni);
      });
    }
    return seen;
  }

  function fit() {
    if (!lv) return;
    const avail = Math.max(120, wrapEl.clientWidth - 22);
    const cs = Math.max(16, Math.min(48, Math.floor(avail / lv.w)));
    boardEl.style.setProperty('--cs', cs + 'px');
  }

  function say(t) { statusEl.textContent = t; }

  function refresh() {
    for (let i = 0; i < cells.length; i++) cells[i].classList.remove('box', 'player');
    boxes.forEach(function (b) { cells[b].classList.add('box'); });
    cells[player].classList.add('player');
    $('levelNum').textContent = String(levelIndex + 1);
    $('moves').textContent = String(moves);
    $('pushes').textContent = String(pushes);
    const b = save.best[levelIndex];
    $('best').textContent = b ? String(b) : '–';
    $('undo').disabled = !undoStack.length;
    $('redo').disabled = !redoStack.length;
    const on = boxes.filter(function (x) { return lv.goals[x]; }).length;
    boardEl.setAttribute('aria-label', 'Sokoban board, ' + on + ' of ' + boxes.length + ' crates on goals');
  }

  function step(dir) {
    if (won) return;
    const d = DIRS[dir];
    const r = tryMove(lv, player, boxes, d[0], d[1]);
    if (!r) { say('Blocked.'); return; }
    undoStack.push({ player: player, boxes: boxes, pushed: r.pushed >= 0 });
    redoStack = [];
    player = r.player; boxes = r.boxes;
    moves++;
    if (r.pushed >= 0) pushes++;
    refresh();
    say(r.pushed >= 0 ? 'Pushed a crate.' : '');
    if (isSolved(lv, boxes)) complete();
  }

  function complete() {
    won = true;
    save.done[levelIndex] = true;
    const prev = save.best[levelIndex];
    const record = !prev || moves < prev;
    if (record) save.best[levelIndex] = moves;
    persist();
    $('winText').textContent = moves + ' moves, ' + pushes + ' pushes' + (record ? ' (new best!)' : '');
    $('winNext').hidden = levelIndex >= LEVELS.length - 1;
    winEl.hidden = false;
    renderLevels();
    refresh();
    say('Level ' + (levelIndex + 1) + ' cleared in ' + moves + ' moves.');
    (levelIndex >= LEVELS.length - 1 ? $('winAgain') : $('winNext')).focus();
  }

  function undo() {
    if (!undoStack.length) return;
    const s = undoStack.pop();
    redoStack.push({ player: player, boxes: boxes, pushed: s.pushed });
    player = s.player; boxes = s.boxes;
    moves = Math.max(0, moves - 1);
    if (s.pushed) pushes = Math.max(0, pushes - 1);
    won = false; winEl.hidden = true;
    refresh(); say('Undid a move.');
  }

  function redo() {
    if (!redoStack.length) return;
    const s = redoStack.pop();
    undoStack.push({ player: player, boxes: boxes, pushed: s.pushed });
    player = s.player; boxes = s.boxes;
    moves++;
    if (s.pushed) pushes++;
    refresh(); say('Redid a move.');
    if (isSolved(lv, boxes)) complete();
  }

  function renderLevels() {
    const grid = $('levelGrid');
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    let n = 0;
    LEVELS.forEach(function (_, i) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lv';
      b.textContent = String(i + 1);
      const done = !!save.done[i];
      if (done) { b.classList.add('done'); n++; }
      if (i === levelIndex) b.setAttribute('aria-current', 'true');
      b.setAttribute('aria-label', 'Level ' + (i + 1) + (done ? ', completed' : ''));
      b.addEventListener('click', function () { loadLevel(i); });
      grid.appendChild(b);
    });
    $('progress').textContent = '(' + n + '/' + LEVELS.length + ' solved)';
  }

  /* input */
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
  };
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = KEYS[e.key];
    if (dir) { e.preventDefault(); step(dir); return; }
    const k = e.key.toLowerCase();
    if (k === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
    else if (k === 'z' || k === 'u') { e.preventDefault(); undo(); }
    else if (k === 'y') { e.preventDefault(); redo(); }
    else if (k === 'r') { e.preventDefault(); loadLevel(levelIndex); }
    else if (k === 'n' && levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1);
    else if (k === 'p' && levelIndex > 0) loadLevel(levelIndex - 1);
  });

  document.querySelectorAll('.pad button').forEach(function (b) {
    b.addEventListener('click', function () { step(b.dataset.dir); });
  });
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('restart').addEventListener('click', function () { loadLevel(levelIndex); });
  $('winNext').addEventListener('click', function () { loadLevel(levelIndex + 1); });
  $('winAgain').addEventListener('click', function () { loadLevel(levelIndex); });
  $('resetProgress').addEventListener('click', function () {
    save = { done: {}, best: {}, current: 0 };
    persist();
    loadLevel(0);
    say('Saved progress cleared.');
  });

  /* swipe */
  let t0 = null;
  wrapEl.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  wrapEl.addEventListener('touchend', function (e) {
    if (!t0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - t0.x, dy = t.clientY - t0.y;
    t0 = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) step(dx > 0 ? 'right' : 'left');
    else step(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  window.addEventListener('resize', fit);
  loadLevel(save.current);
  window.__sokoban = { step: step, get state() { return { moves: moves, pushes: pushes, level: levelIndex, won: won }; } };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUI);
  else initUI();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVELS: LEVELS, parseLevel: parseLevel, tryMove: tryMove, isSolved: isSolved, solve: solve };
}
