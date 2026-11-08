(() => {
  'use strict';
  const N = 20;
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const scoreEl = $('score'), bestEl = $('best'), lenEl = $('length');
  const overlay = $('overlay'), ovTitle = $('ovTitle'), ovMsg = $('ovMsg'), startBtn = $('startBtn');
  const speedSel = $('speed'), modeSel = $('mode'), pauseBtn = $('pauseBtn'), live = $('live');
  const DELAY = { 1: 190, 2: 140, 3: 100, 4: 72, 5: 50 };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };

  let snake, dir, queue, food, score, state = 'idle', timer = null;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };
  const bestKey = () => 'foundry.snake.best.' + modeSel.value + '.' + speedSel.value;
  const loadBest = () => { bestEl.textContent = parseInt(store.get(bestKey()), 10) || 0; };
  const announce = t => { live.textContent = t; };

  function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = 'right'; queue = []; score = 0;
    placeFood(); updateStats();
  }
  function placeFood() {
    const taken = new Set(snake.map(s => s.x + ',' + s.y));
    const free = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!taken.has(x + ',' + y)) free.push({ x, y });
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }
  function updateStats() { scoreEl.textContent = score; lenEl.textContent = snake.length; }

  // Pending-direction queue: each key press is validated against the last
  // queued (not the current) direction, so rapid double-taps can't reverse.
  function turn(d) {
    if (state !== 'running') return;
    const last = queue.length ? queue[queue.length - 1] : dir;
    const [lx, ly] = DIRS[last], [nx, ny] = DIRS[d];
    if (d === last || (lx + nx === 0 && ly + ny === 0)) return;
    if (queue.length < 3) queue.push(d);
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const [dx, dy] = DIRS[dir];
    let nx = snake[0].x + dx, ny = snake[0].y + dy;
    if (modeSel.value === 'wrap') { nx = (nx + N) % N; ny = (ny + N) % N; }
    else if (nx < 0 || ny < 0 || nx >= N || ny >= N) return gameOver('You hit the wall.');
    const eating = food && nx === food.x && ny === food.y;
    const body = eating ? snake : snake.slice(0, -1); // tail moves away unless growing
    if (body.some(s => s.x === nx && s.y === ny)) return gameOver('You bit yourself.');
    snake.unshift({ x: nx, y: ny });
    if (eating) {
      score += 10 * parseInt(speedSel.value, 10);
      placeFood();
      if (!food) { updateStats(); return gameOver('You filled the board!'); }
    } else snake.pop();
    updateStats(); draw();
  }

  function gameOver(reason) {
    stop(); state = 'over'; draw();
    const best = parseInt(store.get(bestKey()), 10) || 0;
    let msg = reason + ' Score ' + score + '.';
    if (score > best) { store.set(bestKey(), String(score)); msg += ' New high score!'; loadBest(); }
    ovTitle.textContent = 'Game over'; ovMsg.textContent = msg; startBtn.textContent = 'Play again';
    overlay.hidden = false; pauseBtn.disabled = true; announce(msg); startBtn.focus();
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function run() { stop(); timer = setInterval(step, DELAY[speedSel.value]); }

  function start() {
    reset(); state = 'running'; overlay.hidden = true; pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause'; draw(); run(); announce('Game started');
  }
  function togglePause() {
    if (state === 'running') {
      state = 'paused'; stop(); pauseBtn.textContent = 'Resume';
      ovTitle.textContent = 'Paused'; ovMsg.textContent = 'Press Space or P to resume.'; startBtn.textContent = 'Resume';
      overlay.hidden = false; announce('Paused'); startBtn.focus();
    } else if (state === 'paused') {
      state = 'running'; overlay.hidden = true; pauseBtn.textContent = 'Pause'; run(); announce('Resumed');
    }
  }

  function css(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function draw() {
    const c = canvas.width / N;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = css('--panel'); ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = css('--grid'); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < N; i++) { ctx.moveTo(i * c, 0); ctx.lineTo(i * c, canvas.height); ctx.moveTo(0, i * c); ctx.lineTo(canvas.width, i * c); }
    ctx.stroke();
    if (food) { ctx.fillStyle = css('--food'); ctx.beginPath(); ctx.arc((food.x + .5) * c, (food.y + .5) * c, c * .38, 0, Math.PI * 2); ctx.fill(); }
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? css('--head') : css('--snake');
      ctx.fillRect(s.x * c + 1, s.y * c + 1, c - 2, c - 2);
    });
  }

  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const d = KEYS[e.key];
    if (d) { if (state === 'running') { e.preventDefault(); turn(d); } return; }
    if ((e.key === ' ' || e.key === 'p' || e.key === 'P') && (state === 'running' || state === 'paused')) {
      const tag = e.target.tagName;
      if (e.key === ' ' && (tag === 'BUTTON' || tag === 'SELECT')) return;
      if (tag === 'SELECT') return;
      e.preventDefault(); togglePause();
    }
  });

  // Swipe
  let t0 = null;
  canvas.addEventListener('pointerdown', e => { t0 = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', e => {
    if (!t0 || state !== 'running') return;
    const dx = e.clientX - t0.x, dy = e.clientY - t0.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    t0 = { x: e.clientX, y: e.clientY };
  });
  const endSwipe = () => { t0 = null; };
  canvas.addEventListener('pointerup', endSwipe);
  canvas.addEventListener('pointercancel', endSwipe);

  startBtn.addEventListener('click', () => { if (state === 'paused') togglePause(); else start(); });
  pauseBtn.addEventListener('click', togglePause);
  function saveSettings() { store.set('foundry.snake.settings', JSON.stringify({ s: speedSel.value, m: modeSel.value })); }
  function settingChanged() {
    loadBest();
    if (state === 'running' || state === 'paused') {
      stop(); state = 'idle'; reset(); draw();
      overlay.hidden = false; pauseBtn.disabled = true; pauseBtn.textContent = 'Pause';
      ovTitle.textContent = 'Settings changed'; ovMsg.textContent = 'Press start for a new game.'; startBtn.textContent = 'Start game';
    }
    saveSettings();
  }
  speedSel.addEventListener('change', settingChanged);
  modeSel.addEventListener('change', settingChanged);
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'running') togglePause(); });

  try {
    const s = JSON.parse(store.get('foundry.snake.settings') || 'null');
    if (s && DELAY[s.s]) speedSel.value = s.s;
    if (s && (s.m === 'wrap' || s.m === 'walls')) modeSel.value = s.m;
  } catch (e) { /* ignore corrupt settings */ }
  pauseBtn.disabled = true;
  loadBest(); reset(); draw();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);
})();
