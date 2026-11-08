(() => {
  'use strict';

  /* ---------- constants ---------- */
  const COLS = 10, ROWS = 22, HIDDEN = 2, VIS = 20;
  const STEP = 1 / 60;
  const DAS = 0.16, ARR = 0.04;
  const LOCK_DELAY = 0.5, MAX_LOCK_RESETS = 15;
  const CLEAR_T = 0.35;
  const STORE_KEY = 'foundry-tetris-v1';
  const MUTE_KEY = 'foundry-tetris-muted';

  const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const COLORS = {
    I: '#22d3ee', O: '#facc15', T: '#a78bfa', S: '#4ade80',
    Z: '#f87171', J: '#60a5fa', L: '#fb923c'
  };
  const BASE = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  function rotCW(m) {
    const n = m.length;
    return m.map((_, r) => m.map((__, c) => m[n - 1 - c][r]));
  }
  const SHAPES = {};
  TYPES.forEach(t => {
    const a = [BASE[t]];
    for (let i = 1; i < 4; i++) a.push(rotCW(a[i - 1]));
    SHAPES[t] = a;
  });

  // SRS kick offsets, written as [dx, dy] with y pointing up (as in the guideline); flipped when applied.
  const KICK_JLSTZ = {
    '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
  };
  const KICK_I = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
  };

  /* ---------- DOM ---------- */
  const $ = id => document.getElementById(id);
  const boardCv = $('boardCv'), holdCv = $('holdCv'), nextCv = $('nextCv');
  const boardCtx = boardCv.getContext('2d');
  const holdCtx = holdCv.getContext('2d');
  const nextCtx = nextCv.getContext('2d');
  const wrap = $('boardWrap'), overlay = $('overlay'), toastEl = $('toast');
  const els = {
    score: $('scoreEl'), high: $('highEl'), lines: $('linesEl'),
    bestLines: $('bestLinesEl'), level: $('levelEl')
  };
  const ovTitle = $('ovTitle'), ovMsg = $('ovMsg'), ovSub = $('ovSub'), ovBtn = $('ovBtn'), ovHint = $('ovHint');
  const pauseBtn = $('pauseBtn'), muteBtn = $('muteBtn');
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  /* ---------- persistence ---------- */
  let high = 0, bestLines = 0, muted = true;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      high = Math.max(0, Number(d.high) || 0);
      bestLines = Math.max(0, Number(d.bestLines) || 0);
    }
  } catch (e) { /* storage unavailable */ }
  try {
    const m = localStorage.getItem(MUTE_KEY);
    if (m !== null) muted = m === '1';
  } catch (e) { /* storage unavailable */ }
  function saveStats() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ high, bestLines })); } catch (e) { /* ignore */ }
  }

  /* ---------- audio ---------- */
  let actx = null, audioFailed = false;
  function ensureAudio() {
    if (actx || audioFailed) return actx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { audioFailed = true; return null; }
      actx = new AC();
    } catch (e) { audioFailed = true; actx = null; }
    return actx;
  }
  function beep(freq, dur, type, vol, delay) {
    if (muted) return;
    const a = ensureAudio();
    if (!a) return;
    try {
      if (a.state === 'suspended' && a.resume) a.resume();
      const t0 = a.currentTime + (delay || 0);
      const o = a.createOscillator(), g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol || 0.04, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore audio errors */ }
  }
  const sfx = {
    rotate: () => beep(520, 0.04, 'square', 0.025),
    lock: () => beep(150, 0.08, 'triangle', 0.06),
    hold: () => beep(380, 0.07, 'sine', 0.05),
    drop: () => beep(110, 0.12, 'triangle', 0.08),
    clear: n => {
      const seq = [523, 659, 784, 1047];
      for (let i = 0; i < Math.min(4, n + (n === 4 ? 0 : 1)); i++) beep(seq[i], 0.12, 'square', 0.04, i * 0.06);
    },
    over: () => [392, 330, 262, 196].forEach((f, i) => beep(f, 0.22, 'sawtooth', 0.04, i * 0.16))
  };
  function renderMute() {
    muteBtn.textContent = 'Sound: ' + (muted ? 'off' : 'on');
    muteBtn.setAttribute('aria-pressed', String(muted));
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    renderMute();
    if (!muted) { sfx.hold(); }
  }

  /* ---------- game state ---------- */
  let board, queue, piece, holdType, canHold;
  let score, lines, level, combo, b2b;
  let state = 'ready'; // ready | playing | paused | over
  let acc, lockTimer, lockResets, lowest;
  let clearTimer = 0, clearingRows = [];
  let shakeT = 0;
  let newBest = false;
  const held = { left: false, right: false, down: false };
  let dirOrder = [], repeatDir = 0, das = 0, arr = 0;
  let previewDirty = true;

  function emptyBoard() {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function refill() {
    while (queue.length < 7) queue.push(...shuffle(TYPES.slice()));
  }

  function resetGame() {
    board = emptyBoard();
    queue = [];
    refill();
    piece = null; holdType = null; canHold = true;
    score = 0; lines = 0; level = 1; combo = -1; b2b = false;
    clearTimer = 0; clearingRows = []; shakeT = 0; newBest = false;
    held.left = held.right = held.down = false;
    dirOrder = []; repeatDir = 0; das = 0; arr = 0;
    previewDirty = true;
  }

  function collides(type, rot, x, y) {
    const m = SHAPES[type][rot];
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (!m[r][c]) continue;
        const bx = x + c, by = y + r;
        if (bx < 0 || bx >= COLS || by < 0 || by >= ROWS) return true;
        if (board[by][bx]) return true;
      }
    }
    return false;
  }
  const grounded = () => collides(piece.type, piece.rot, piece.x, piece.y + 1);

  function spawn(forced) {
    const type = forced || queue.shift();
    refill();
    previewDirty = true;
    piece = { type, rot: 0, x: type === 'O' ? 4 : 3, y: 0 };
    acc = 0; lockTimer = 0; lockResets = 0;
    if (collides(type, 0, piece.x, piece.y)) {
      gameOver();
      return;
    }
    if (!grounded()) piece.y++;
    lowest = piece.y;
  }

  function secPerRow() {
    return Math.pow(0.8 - (level - 1) * 0.007, level - 1);
  }

  /* ---------- piece actions ---------- */
  function afterMove() {
    if (grounded()) {
      if (lockResets < MAX_LOCK_RESETS) { lockTimer = 0; lockResets++; }
    } else {
      lockTimer = 0;
    }
  }
  function tryMove(dx, dy) {
    if (!piece || state !== 'playing' || clearTimer > 0) return false;
    if (collides(piece.type, piece.rot, piece.x + dx, piece.y + dy)) return false;
    piece.x += dx; piece.y += dy;
    if (piece.y > lowest) { lowest = piece.y; lockResets = 0; }
    afterMove();
    return true;
  }
  function rotate(dir) {
    if (!piece || state !== 'playing' || clearTimer > 0) return false;
    if (piece.type === 'O') return false;
    const from = piece.rot, to = (from + dir + 4) % 4;
    const list = (piece.type === 'I' ? KICK_I : KICK_JLSTZ)[from + '>' + to];
    for (const [dx, dy] of list) {
      const nx = piece.x + dx, ny = piece.y - dy;
      if (!collides(piece.type, to, nx, ny)) {
        piece.rot = to; piece.x = nx; piece.y = ny;
        if (piece.y > lowest) { lowest = piece.y; lockResets = 0; }
        afterMove();
        sfx.rotate();
        return true;
      }
    }
    return false;
  }
  function softStep() {
    if (tryMove(0, 1)) { score += 1; acc = 0; return true; }
    return false;
  }
  function hardDrop() {
    if (!piece || state !== 'playing' || clearTimer > 0) return;
    let n = 0;
    while (!grounded()) { piece.y++; n++; }
    score += n * 2;
    if (n > 0) shakeT = 0.14;
    sfx.drop();
    lockPiece();
  }
  function doHold() {
    if (!piece || !canHold || state !== 'playing' || clearTimer > 0) return;
    const t = piece.type;
    if (holdType) { const h = holdType; holdType = t; spawn(h); }
    else { holdType = t; spawn(); }
    canHold = false;
    previewDirty = true;
    sfx.hold();
  }

  function ghostY() {
    let y = piece.y;
    while (!collides(piece.type, piece.rot, piece.x, y + 1)) y++;
    return y;
  }

  function lockPiece() {
    const m = SHAPES[piece.type][piece.rot];
    const ti = TYPES.indexOf(piece.type) + 1;
    let above = true;
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m.length; c++) {
        if (!m[r][c]) continue;
        const by = piece.y + r;
        board[by][piece.x + c] = ti;
        if (by >= HIDDEN) above = false;
      }
    }
    sfx.lock();
    piece.locked = true;
    canHold = true;
    const full = [];
    for (let r = 0; r < ROWS; r++) if (board[r].every(v => v)) full.push(r);
    if (above && !full.length) { piece = null; gameOver(); return; }
    if (full.length) {
      const n = full.length;
      let base = [0, 100, 300, 500, 800][n];
      combo++;
      const labels = [];
      if (n === 4) {
        if (b2b) { base = Math.floor(base * 1.5); labels.push('Back-to-back'); }
        b2b = true;
        labels.unshift('Tetris!');
      } else {
        b2b = false;
        labels.push(['', 'Single', 'Double', 'Triple'][n]);
      }
      score += base * level + (combo > 0 ? 50 * combo * level : 0);
      if (combo > 0) labels.push('Combo x' + combo);
      lines += n;
      const newLevel = Math.min(30, Math.floor(lines / 10) + 1);
      if (newLevel > level) { level = newLevel; labels.push('Level ' + level); }
      showToast(labels.join(' / '));
      sfx.clear(n);
      piece = null;
      clearingRows = full;
      if (reduceMotion.matches) finishClear();
      else clearTimer = CLEAR_T;
    } else {
      combo = -1;
      spawn();
    }
  }
  function finishClear() {
    const set = new Set(clearingRows);
    const kept = board.filter((_, i) => !set.has(i));
    while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(0));
    board = kept;
    clearingRows = [];
    clearTimer = 0;
    spawn();
  }

  /* ---------- flow ---------- */
  function startGame() {
    resetGame();
    state = 'playing';
    hideOverlay();
    spawn();
    ensureAudio();
    if (!muted) sfx.hold();
  }
  function gameOver() {
    state = 'over';
    held.left = held.right = held.down = false;
    if (score > high) { high = score; newBest = true; }
    if (lines > bestLines) { bestLines = lines; newBest = true; }
    saveStats();
    sfx.over();
    showOverlay('over');
  }
  function pauseGame() {
    if (state !== 'playing') return;
    state = 'paused';
    held.left = held.right = held.down = false;
    showOverlay('paused');
  }
  function resumeGame() {
    if (state !== 'paused') return;
    state = 'playing';
    hideOverlay();
  }
  function togglePause() {
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resumeGame();
  }

  function showOverlay(mode) {
    overlay.hidden = false;
    if (mode === 'ready') {
      ovTitle.textContent = 'Tetris';
      ovMsg.textContent = 'Stack the blocks and clear lines.';
      ovSub.textContent = high ? 'High score ' + high.toLocaleString() : '';
      ovBtn.textContent = 'Start game';
      ovHint.textContent = 'Press Enter to start';
    } else if (mode === 'paused') {
      ovTitle.textContent = 'Paused';
      ovMsg.textContent = 'Take a breath.';
      ovSub.textContent = '';
      ovBtn.textContent = 'Resume';
      ovHint.textContent = 'Press P or Esc to resume';
    } else {
      ovTitle.textContent = 'Game over';
      ovMsg.textContent = newBest ? 'New personal best!' : 'The stack reached the top.';
      ovSub.textContent = 'Score ' + score.toLocaleString() + ' / Lines ' + lines;
      ovBtn.textContent = 'Play again';
      ovHint.textContent = 'Press Enter to play again';
    }
    pauseBtn.textContent = state === 'paused' ? 'Resume' : 'Pause';
    try { ovBtn.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function hideOverlay() {
    overlay.hidden = true;
    pauseBtn.textContent = 'Pause';
    if (document.activeElement && document.activeElement.blur && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  }

  let toastTimer = 0;
  function showToast(text) {
    if (!text) return;
    toastEl.textContent = text;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1200);
  }

  /* ---------- input ---------- */
  function currentDir() {
    for (let i = dirOrder.length - 1; i >= 0; i--) {
      if (held[dirOrder[i]]) return dirOrder[i] === 'left' ? -1 : 1;
    }
    return 0;
  }
  function press(act) {
    if (act === 'pause') { togglePause(); return; }
    if (state !== 'playing') return;
    switch (act) {
      case 'left':
      case 'right':
        held[act] = true;
        dirOrder = dirOrder.filter(d => d !== act);
        dirOrder.push(act);
        repeatDir = currentDir(); das = 0; arr = 0;
        tryMove(repeatDir, 0);
        break;
      case 'down': held.down = true; break;
      case 'cw': rotate(1); break;
      case 'ccw': rotate(-1); break;
      case 'drop': hardDrop(); break;
      case 'hold': doHold(); break;
    }
  }
  function release(act) {
    if (act in held) held[act] = false;
  }

  const KEYMAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down',
    ArrowUp: 'cw', KeyX: 'cw', KeyZ: 'ccw', ControlLeft: 'ccw', ControlRight: 'ccw',
    KeyC: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold', Space: 'drop'
  };
  document.addEventListener('keydown', e => {
    if (e.altKey || e.metaKey) return;
    const code = e.code;
    const onButton = e.target && e.target.tagName === 'BUTTON';
    if (code === 'KeyP' || code === 'Escape') {
      if (e.repeat) return;
      if (state === 'playing' || state === 'paused') { e.preventDefault(); togglePause(); }
      return;
    }
    if (code === 'KeyM') { if (!e.repeat) toggleMute(); return; }
    if (state === 'ready' || state === 'over') {
      if (code === 'Enter' && !onButton) { e.preventDefault(); startGame(); }
      return;
    }
    if (state === 'paused') {
      if (code === 'Enter' && !onButton) { e.preventDefault(); resumeGame(); }
      return;
    }
    const act = KEYMAP[code];
    if (!act) return;
    e.preventDefault();
    if (e.repeat) return;
    if (onButton && document.activeElement) document.activeElement.blur();
    press(act);
  });
  document.addEventListener('keyup', e => {
    const act = KEYMAP[e.code];
    if (act) release(act);
  });

  // on-screen buttons
  document.querySelectorAll('#pad .btn').forEach(btn => {
    const act = btn.dataset.act;
    const holdable = act === 'left' || act === 'right' || act === 'down';
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.classList.add('is-down');
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      press(act);
    });
    const up = () => { btn.classList.remove('is-down'); if (holdable) release(act); };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    });
    btn.addEventListener('keyup', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
      }
    });
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  // swipe gestures on the board
  let tp = null;
  boardCv.addEventListener('pointerdown', e => {
    if (state !== 'playing') return;
    e.preventDefault();
    try { boardCv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    tp = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), cx: 0, moved: false };
  });
  boardCv.addEventListener('pointermove', e => {
    if (!tp || e.pointerId !== tp.id || state !== 'playing') return;
    const unit = cell * 0.9;
    const want = Math.trunc((e.clientX - tp.x) / unit);
    while (tp.cx < want) { tryMove(1, 0); tp.cx++; tp.moved = true; }
    while (tp.cx > want) { tryMove(-1, 0); tp.cx--; tp.moved = true; }
  });
  function endSwipe(e, cancelled) {
    if (!tp || e.pointerId !== tp.id) return;
    const s = tp; tp = null;
    if (cancelled || state !== 'playing') return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    const dt = Math.max(1, performance.now() - s.t);
    const dist = Math.hypot(dx, dy);
    if (!s.moved && dist < 10 && dt < 350) { rotate(1); return; }
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > cell * 1.5) {
      if (dy < 0) { doHold(); return; }
      if (dy / dt > 0.5) hardDrop();
      else for (let i = 0, n = Math.floor(dy / cell); i < n; i++) if (!softStep()) break;
    }
  }
  boardCv.addEventListener('pointerup', e => endSwipe(e, false));
  boardCv.addEventListener('pointercancel', e => endSwipe(e, true));

  ovBtn.addEventListener('click', () => {
    if (state === 'paused') resumeGame(); else startGame();
  });
  pauseBtn.addEventListener('click', () => {
    pauseBtn.blur();
    if (state === 'ready' || state === 'over') return;
    togglePause();
  });
  muteBtn.addEventListener('click', () => { muteBtn.blur(); toggleMute(); });

  function autoPause() { if (state === 'playing') pauseGame(); }
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });

  /* ---------- update ---------- */
  function update(dt) {
    if (shakeT > 0) shakeT -= dt;
    if (state !== 'playing') return;
    if (clearTimer > 0) {
      clearTimer -= dt;
      if (clearTimer <= 0) finishClear();
      return;
    }
    if (!piece) return;

    // horizontal auto-repeat
    const dir = currentDir();
    if (dir !== repeatDir) { repeatDir = dir; das = 0; arr = 0; }
    else if (dir) {
      das += dt;
      if (das >= DAS) {
        arr += dt;
        while (arr >= ARR) {
          arr -= ARR;
          if (!tryMove(dir, 0)) { arr = 0; break; }
        }
      }
    }
    if (!piece) return;

    // gravity
    const spr = secPerRow();
    const soft = held.down;
    const rate = soft ? Math.max(20 / spr, 20) : 1 / spr;
    if (!grounded()) {
      acc += rate * dt;
      let guard = 0;
      while (acc >= 1 && guard++ < 40) {
        if (grounded()) { acc = 0; break; }
        piece.y++;
        acc -= 1;
        if (soft) score += 1;
        if (piece.y > lowest) { lowest = piece.y; lockResets = 0; }
      }
    }
    if (grounded()) {
      lockTimer += dt;
      if (lockTimer >= LOCK_DELAY) lockPiece();
    } else {
      lockTimer = 0;
    }
  }

  /* ---------- rendering ---------- */
  let cell = 24, dpr = 1, pc = 18;

  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function drawCell(c, x, y, s, color, alpha) {
    c.globalAlpha = alpha === undefined ? 1 : alpha;
    c.fillStyle = color;
    rr(c, x + 0.5, y + 0.5, s - 1, s - 1, s * 0.18);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.28)';
    rr(c, x + 0.5 + s * 0.08, y + 0.5 + s * 0.08, s - 1 - s * 0.16, (s - 1) * 0.3, s * 0.1);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(x + 0.5 + s * 0.1, y + s - 0.5 - s * 0.16, s - 1 - s * 0.2, s * 0.1);
    c.globalAlpha = 1;
  }
  function drawGhostCell(c, x, y, s, color) {
    c.globalAlpha = 0.14;
    c.fillStyle = color;
    rr(c, x + 1, y + 1, s - 2, s - 2, s * 0.16);
    c.fill();
    c.globalAlpha = 0.7;
    c.strokeStyle = color;
    c.lineWidth = Math.max(1, s * 0.07);
    c.stroke();
    c.globalAlpha = 1;
  }

  function setupCanvas(cv, ctx, w, h) {
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
    cv.width = Math.max(1, Math.round(w * dpr));
    cv.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function layout() {
    dpr = Math.max(1, window.devicePixelRatio || 1);
    const vw = window.innerWidth, vh = window.innerHeight;
    const desktop = vw > 820;
    const availW = desktop ? vw - 32 - 170 - 210 - 32 : vw - 32;
    const availH = desktop ? vh - 130 : vh - 340;
    cell = Math.floor(Math.min(availW / COLS, availH / VIS, 40));
    cell = Math.max(desktop ? 18 : 15, cell);
    const bw = cell * COLS, bh = cell * VIS;
    wrap.style.width = bw + 'px';
    wrap.style.height = bh + 'px';
    setupCanvas(boardCv, boardCtx, bw, bh);
    pc = desktop ? 22 : 12;
    setupCanvas(holdCv, holdCtx, pc * 4, pc * 3);
    if (desktop) setupCanvas(nextCv, nextCtx, pc * 4, pc * 3 * 3);
    else setupCanvas(nextCv, nextCtx, pc * 4 * 3, pc * 3);
    previewDirty = true;
  }

  function drawPreviewPiece(ctx, type, ox, oy, slotW, slotH, s, alpha) {
    const m = SHAPES[type][0];
    let minR = 9, maxR = -1, minC = 9, maxC = -1;
    for (let r = 0; r < m.length; r++) for (let c = 0; c < m.length; c++) {
      if (m[r][c]) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
    }
    const w = (maxC - minC + 1) * s, h = (maxR - minR + 1) * s;
    const x0 = ox + (slotW - w) / 2, y0 = oy + (slotH - h) / 2;
    for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
      if (m[r][c]) drawCell(ctx, Math.round(x0 + (c - minC) * s), Math.round(y0 + (r - minR) * s), s, COLORS[type], alpha);
    }
  }
  function drawPreviews() {
    previewDirty = false;
    const hw = holdCv.width / dpr, hh = holdCv.height / dpr;
    holdCtx.clearRect(0, 0, hw, hh);
    if (holdType) drawPreviewPiece(holdCtx, holdType, 0, 0, hw, hh, pc * 0.9, canHold ? 1 : 0.4);
    const nw = nextCv.width / dpr, nh = nextCv.height / dpr;
    nextCtx.clearRect(0, 0, nw, nh);
    const horiz = nw > nh;
    for (let i = 0; i < 3; i++) {
      const t = queue[i];
      if (!t) continue;
      if (horiz) drawPreviewPiece(nextCtx, t, i * pc * 4, 0, pc * 4, nh, pc * 0.9, 1);
      else drawPreviewPiece(nextCtx, t, 0, i * pc * 3, nw, pc * 3, pc * 0.9, 1);
    }
  }

  function drawBoard() {
    const c = boardCtx, s = cell, W = COLS * s, H = VIS * s;
    c.save();
    c.clearRect(0, 0, W, H);
    if (shakeT > 0 && !reduceMotion.matches) {
      c.translate((Math.random() - 0.5) * 3, Math.min(4, shakeT * 30));
    }
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0c1024');
    bg.addColorStop(1, '#070914');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i < COLS; i++) { c.moveTo(i * s + 0.5, 0); c.lineTo(i * s + 0.5, H); }
    for (let j = 1; j < VIS; j++) { c.moveTo(0, j * s + 0.5); c.lineTo(W, j * s + 0.5); }
    c.stroke();

    const p = clearTimer > 0 ? 1 - clearTimer / CLEAR_T : 0;
    for (let r = HIDDEN; r < ROWS; r++) {
      const clearing = clearingRows.indexOf(r) !== -1;
      for (let col = 0; col < COLS; col++) {
        const v = board[r][col];
        if (!v) continue;
        const y = (r - HIDDEN) * s;
        if (clearing) {
          const sc = 1 - p;
          const ss = s * Math.max(0.05, sc);
          drawCell(c, col * s + (s - ss) / 2, y + (s - ss) / 2, ss, '#ffffff', 0.5 + 0.5 * sc);
        } else {
          drawCell(c, col * s, y, s, COLORS[TYPES[v - 1]]);
        }
      }
    }

    if (piece && state !== 'over') {
      const m = SHAPES[piece.type][piece.rot];
      const color = COLORS[piece.type];
      if (state === 'playing') {
        const gy = ghostY();
        if (gy !== piece.y) {
          for (let r = 0; r < m.length; r++) for (let col = 0; col < m.length; col++) {
            if (m[r][col] && gy + r >= HIDDEN) drawGhostCell(c, (piece.x + col) * s, (gy + r - HIDDEN) * s, s, color);
          }
        }
      }
      const glow = grounded() ? Math.min(1, lockTimer / LOCK_DELAY) : 0;
      for (let r = 0; r < m.length; r++) for (let col = 0; col < m.length; col++) {
        if (m[r][col] && piece.y + r >= HIDDEN) {
          drawCell(c, (piece.x + col) * s, (piece.y + r - HIDDEN) * s, s, color, 1 - glow * 0.35);
        }
      }
    }
    c.restore();
  }

  let last = { score: -1, high: -1, lines: -1, best: -1, level: -1 };
  function updateStats() {
    const hs = Math.max(high, score);
    const bl = Math.max(bestLines, lines);
    if (last.score !== score) { els.score.textContent = score.toLocaleString(); last.score = score; }
    if (last.high !== hs) { els.high.textContent = hs.toLocaleString(); last.high = hs; }
    if (last.lines !== lines) { els.lines.textContent = String(lines); last.lines = lines; }
    if (last.best !== bl) { els.bestLines.textContent = String(bl); last.best = bl; }
    if (last.level !== level) { els.level.textContent = String(level); last.level = level; }
  }

  /* ---------- main loop ---------- */
  let prev = 0, accT = 0;
  function frame(now) {
    if (!prev) prev = now;
    let dt = (now - prev) / 1000;
    prev = now;
    if (dt > 0.1) dt = 0.1;
    accT += dt;
    while (accT >= STEP) { update(STEP); accT -= STEP; }
    if (previewDirty) drawPreviews();
    drawBoard();
    updateStats();
    requestAnimationFrame(frame);
  }

  let resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(layout);
  });

  /* ---------- init ---------- */
  resetGame();
  renderMute();
  layout();
  showOverlay('ready');
  requestAnimationFrame(frame);
})();
