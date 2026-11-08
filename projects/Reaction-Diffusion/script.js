(function () {
  'use strict';

  /*CORE-START*/
  // Gray-Scott core: pure functions, no DOM.
  function makeGrid(n) {
    return { n: n, a: new Float32Array(n * n), b: new Float32Array(n * n), a2: new Float32Array(n * n), b2: new Float32Array(n * n) };
  }

  function buildNeighbours(n, wrap) {
    var lo = new Int32Array(n), hi = new Int32Array(n);
    for (var i = 0; i < n; i++) {
      if (wrap) { lo[i] = (i - 1 + n) % n; hi[i] = (i + 1) % n; }
      else { lo[i] = i > 0 ? i - 1 : 0; hi[i] = i < n - 1 ? i + 1 : n - 1; }
    }
    return { lo: lo, hi: hi };
  }

  // One explicit Euler step (dt = 1) with a 9-point Laplacian (0.2 adjacent, 0.05 diagonal, -1 centre).
  // Writes into a2/b2 then swaps the buffers.
  function stepGrid(g, nb, f, k, da, db) {
    var n = g.n, A = g.a, B = g.b, A2 = g.a2, B2 = g.b2, lo = nb.lo, hi = nb.hi;
    for (var y = 0; y < n; y++) {
      var r0 = lo[y] * n, r1 = y * n, r2 = hi[y] * n;
      for (var x = 0; x < n; x++) {
        var xl = lo[x], xr = hi[x], i = r1 + x;
        var a = A[i], b = B[i];
        var lapA = -a + 0.2 * (A[r1 + xl] + A[r1 + xr] + A[r0 + x] + A[r2 + x]) +
          0.05 * (A[r0 + xl] + A[r0 + xr] + A[r2 + xl] + A[r2 + xr]);
        var lapB = -b + 0.2 * (B[r1 + xl] + B[r1 + xr] + B[r0 + x] + B[r2 + x]) +
          0.05 * (B[r0 + xl] + B[r0 + xr] + B[r2 + xl] + B[r2 + xr]);
        var abb = a * b * b;
        var na = a + da * lapA - abb + f * (1 - a);
        var nbv = b + db * lapB + abb - (k + f) * b;
        // clamp to [0,1]; the comparison form also maps NaN to 0
        A2[i] = na > 0 ? (na < 1 ? na : 1) : 0;
        B2[i] = nbv > 0 ? (nbv < 1 ? nbv : 1) : 0;
      }
    }
    g.a = A2; g.a2 = A; g.b = B2; g.b2 = B;
  }

  function clearGrid(g) { g.a.fill(1); g.b.fill(0); }

  function stamp(g, cx, cy, r, erase, wrap) {
    var n = g.n, r2 = r * r;
    for (var dy = -r; dy <= r; dy++) {
      for (var dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        var x = cx + dx, y = cy + dy;
        if (wrap) { x = (x % n + n) % n; y = (y % n + n) % n; }
        else if (x < 0 || y < 0 || x >= n || y >= n) continue;
        var i = y * n + x;
        if (erase) { g.b[i] = 0; g.a[i] = 1; }
        else { g.b[i] = 1; g.a[i] = 0.5; }
      }
    }
  }

  function seedCentre(g) {
    clearGrid(g);
    var n = g.n, c = n >> 1, s = Math.max(5, Math.round(n / 12));
    stamp(g, c, c, s, false, true);
    stamp(g, c - n / 4 | 0, c - n / 5 | 0, s >> 1, false, true);
    stamp(g, c + n / 4 | 0, c + n / 6 | 0, s >> 1, false, true);
    stamp(g, c + n / 5 | 0, c - n / 3 | 0, s >> 1, false, true);
    // deterministic jitter so symmetric seeds break symmetry
    var seed = 12345;
    for (var i = 0; i < g.b.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      if (g.b[i] > 0) g.b[i] = 0.7 + 0.3 * (seed / 4294967296);
    }
  }

  function seedRandom(g, rnd) {
    clearGrid(g);
    var n = g.n, count = 10 + Math.floor(rnd() * 14);
    for (var j = 0; j < count; j++) {
      stamp(g, Math.floor(rnd() * n), Math.floor(rnd() * n), 2 + Math.floor(rnd() * Math.max(3, n / 40)), false, true);
    }
  }
  /*CORE-END*/

  var PRESETS = [
    { name: 'Mitosis', f: 0.0367, k: 0.0625 },
    { name: 'Coral', f: 0.0545, k: 0.062 },
    { name: 'Spots', f: 0.03, k: 0.062 },
    { name: 'Maze', f: 0.029, k: 0.057 },
    { name: 'Worms', f: 0.078, k: 0.061 },
    { name: 'Solitons', f: 0.03, k: 0.06 },
    { name: 'Waves', f: 0.014, k: 0.054 },
    { name: 'U-skate', f: 0.062, k: 0.0609 }
  ];

  // Palettes: colour stops from low B (0) to high B (1).
  var PALETTES = [
    { name: 'Bioluminescent', stops: [[0, '#02030a'], [0.25, '#0b2a5b'], [0.55, '#10b5a8'], [0.8, '#8ff7c6'], [1, '#ffffff']] },
    { name: 'Magma', stops: [[0, '#000004'], [0.25, '#3b0f70'], [0.5, '#b73779'], [0.75, '#fc8961'], [1, '#fcfdbf']] },
    { name: 'Ocean', stops: [[0, '#03045e'], [0.35, '#0077b6'], [0.7, '#90e0ef'], [1, '#f1fbff']] },
    { name: 'Lichen', stops: [[0, '#10150a'], [0.35, '#3d5a1e'], [0.7, '#c9d36a'], [1, '#fff6d6']] },
    { name: 'Ultraviolet', stops: [[0, '#05010f'], [0.3, '#4a0e9c'], [0.6, '#ff2fb3'], [0.85, '#ffd24a'], [1, '#ffffff']] },
    { name: 'Monochrome', stops: [[0, '#000000'], [1, '#ffffff']] },
    { name: 'Ink', stops: [[0, '#f4efe3'], [0.5, '#7a6f5d'], [1, '#14110c']] }
  ];

  // Approximate Pearson map
  var F_MIN = 0, F_MAX = 0.1, K_MIN = 0.03, K_MAX = 0.075;
  var REGION_COLOURS = ['#5ef0d0', '#ff6bcb', '#ffd166', '#6aa8ff', '#b28dff', '#ff8a5b', '#8ee060', '#e9eefc'];
  var STORE_KEY = 'foundry.reactionDiffusion.v1';

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('sim');
  var ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }

  if (!ctx || !window.ImageData || !window.Float32Array) {
    $('loading').hidden = true;
    $('error').hidden = false;
    return;
  }

  var state = {
    f: 0.0367, k: 0.0625, da: 1, db: 0.5,
    steps: 8, brush: 8, size: 256, palette: 0, preset: 'Mitosis', wrap: true, erase: false
  };
  var running = true, wasRunningBeforeHide = false, iterations = 0;
  var grid, nbrs, img, pix32, lut = new Uint32Array(256);
  var painting = false, paintErase = false, lastPt = null;

  function clampNum(v, lo, hi, d) {
    v = Number(v);
    return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return;
      state.f = clampNum(s.f, 0, 0.1, state.f);
      state.k = clampNum(s.k, 0.03, 0.075, state.k);
      state.da = clampNum(s.da, 0.1, 1.2, state.da);
      state.db = clampNum(s.db, 0.05, 1.2, state.db);
      state.steps = Math.round(clampNum(s.steps, 1, 24, state.steps));
      state.brush = Math.round(clampNum(s.brush, 1, 30, state.brush));
      state.palette = Math.round(clampNum(s.palette, 0, PALETTES.length - 1, 0));
      state.size = [128, 256, 384].indexOf(s.size) >= 0 ? s.size : 256;
      state.preset = typeof s.preset === 'string' ? s.preset : 'Custom';
      state.wrap = s.wrap !== false;
    } catch (e) { /* storage blocked or corrupt: use defaults */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // ---------- Palette LUT ----------
  function hexToRgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function buildLut(p) {
    var stops = p.stops.map(function (s) { return { t: s[0], c: hexToRgb(s[1]) }; });
    for (var i = 0; i < 256; i++) {
      var t = i / 255, j = 0;
      while (j < stops.length - 2 && t > stops[j + 1].t) j++;
      var s0 = stops[j], s1 = stops[j + 1];
      var u = Math.min(1, Math.max(0, (t - s0.t) / (s1.t - s0.t || 1)));
      var r = Math.round(s0.c[0] + (s1.c[0] - s0.c[0]) * u);
      var g = Math.round(s0.c[1] + (s1.c[1] - s0.c[1]) * u);
      var b = Math.round(s0.c[2] + (s1.c[2] - s0.c[2]) * u);
      lut[i] = (255 << 24) | (b << 16) | (g << 8) | r; // little-endian RGBA
    }
    $('swatch').style.background = 'linear-gradient(90deg,' + p.stops.map(function (s) { return s[1] + ' ' + Math.round(s[0] * 100) + '%'; }).join(',') + ')';
  }

  var littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

  function render() {
    var B = grid.b, n = grid.n * grid.n;
    if (littleEndian) {
      for (var i = 0; i < n; i++) {
        var v = (B[i] * 640) | 0; // B rarely exceeds ~0.4, stretch for contrast
        pix32[i] = lut[v > 255 ? 255 : v];
      }
    } else {
      var d = img.data;
      for (var j = 0; j < n; j++) {
        var w = (B[j] * 640) | 0, c = lut[w > 255 ? 255 : w];
        d[j * 4] = c & 255; d[j * 4 + 1] = (c >> 8) & 255; d[j * 4 + 2] = (c >> 16) & 255; d[j * 4 + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // ---------- Grid management ----------
  function initGrid(n, mode) {
    canvas.width = n; canvas.height = n;
    grid = makeGrid(n);
    nbrs = buildNeighbours(n, state.wrap);
    img = ctx.createImageData(n, n);
    pix32 = new Uint32Array(img.data.buffer);
    iterations = 0;
    if (mode === 'random') seedRandom(grid, Math.random); else seedCentre(grid);
    render();
    updateStats();
  }

  function guardNaN() {
    // sample-based safety net; step clamps already map NaN to 0
    var i = (grid.n * grid.n) >> 1;
    if (!(grid.a[i] >= 0) || !(grid.b[i] >= 0)) { clearGrid(grid); }
  }

  // ---------- Loop ----------
  var frames = 0, fpsT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!fpsT) fpsT = t;
    if (running) {
      for (var s = 0; s < state.steps; s++) stepGrid(grid, nbrs, state.f, state.k, state.da, state.db);
      iterations += state.steps;
      guardNaN();
      render();
      frames++;
    }
    if (t - fpsT >= 500) {
      $('fps').textContent = running ? String(Math.round(frames * 1000 / (t - fpsT))) : '0';
      $('iter').textContent = iterations.toLocaleString();
      frames = 0; fpsT = t;
    }
  }
  function updateStats() { $('iter').textContent = iterations.toLocaleString(); }

  function setRunning(r) {
    running = r;
    $('play').textContent = r ? 'Pause' : 'Play';
    $('pausedBadge').hidden = r;
    if (!r) $('fps').textContent = '0';
  }
  function singleStep() {
    stepGrid(grid, nbrs, state.f, state.k, state.da, state.db);
    iterations++;
    render(); updateStats();
  }

  // ---------- Painting ----------
  function gridPoint(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - r.left) / r.width * grid.n),
      y: Math.floor((e.clientY - r.top) / r.height * grid.n)
    };
  }
  function paintAt(p) {
    var erase = paintErase;
    if (lastPt) {
      var dx = p.x - lastPt.x, dy = p.y - lastPt.y;
      var steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, state.brush / 2)));
      for (var s = 1; s <= steps; s++) stamp(grid, Math.round(lastPt.x + dx * s / steps), Math.round(lastPt.y + dy * s / steps), state.brush, erase, state.wrap);
    } else stamp(grid, p.x, p.y, state.brush, erase, state.wrap);
    lastPt = p;
    if (!running) render();
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    painting = true;
    paintErase = state.erase || e.button === 2 || e.pointerType === 'pen' && e.buttons === 32;
    lastPt = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    paintAt(gridPoint(e));
  });
  canvas.addEventListener('pointermove', function (e) {
    if (painting) { e.preventDefault(); paintAt(gridPoint(e)); }
  });
  function endPaint() { painting = false; lastPt = null; }
  canvas.addEventListener('pointerup', endPaint);
  canvas.addEventListener('pointercancel', endPaint);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---------- Controls ----------
  function fmt(v, d) { return v.toFixed(d); }
  function syncUi() {
    $('f').value = state.f; $('fOut').textContent = fmt(state.f, 4);
    $('k').value = state.k; $('kOut').textContent = fmt(state.k, 4);
    $('da').value = state.da; $('daOut').textContent = fmt(state.da, 2);
    $('db').value = state.db; $('dbOut').textContent = fmt(state.db, 2);
    $('steps').value = state.steps; $('stepsOut').textContent = String(state.steps);
    $('brush').value = state.brush; $('brushOut').textContent = String(state.brush);
    $('size').value = String(state.size);
    $('palette').value = String(state.palette);
    $('wrap').checked = state.wrap;
    $('erase').checked = state.erase;
    $('presetName').textContent = 'Preset: ' + state.preset;
    var btns = $('presets').children;
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].textContent === state.preset));
    $('mapInfo').textContent = 'f ' + fmt(state.f, 4) + ', k ' + fmt(state.k, 4) + ' - ' + regionName(state.f, state.k);
    drawMap();
  }

  function setFK(f, k, presetName) {
    state.f = clampNum(f, 0, 0.1, 0.0367);
    state.k = clampNum(k, 0.03, 0.075, 0.0625);
    state.preset = presetName || 'Custom';
    syncUi(); save();
  }

  function bindRange(id, key, digits, custom) {
    $(id).addEventListener('input', function () {
      state[key] = clampNum($(id).value, Number($(id).min), Number($(id).max), state[key]);
      if (custom) state.preset = 'Custom';
      syncUi(); save();
    });
  }
  bindRange('f', 'f', 4, true);
  bindRange('k', 'k', 4, true);
  bindRange('da', 'da', 2, true);
  bindRange('db', 'db', 2, true);
  bindRange('steps', 'steps', 0, false);
  bindRange('brush', 'brush', 0, false);

  PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.name;
    b.title = 'f ' + p.f + ', k ' + p.k;
    b.addEventListener('click', function () {
      state.da = 1; state.db = 0.5;
      setFK(p.f, p.k, p.name);
    });
    $('presets').appendChild(b);
  });

  PALETTES.forEach(function (p, i) {
    var o = document.createElement('option');
    o.value = String(i); o.textContent = p.name;
    $('palette').appendChild(o);
  });
  $('palette').addEventListener('change', function () {
    state.palette = clampNum($('palette').value, 0, PALETTES.length - 1, 0) | 0;
    buildLut(PALETTES[state.palette]); render(); save();
  });
  $('size').addEventListener('change', function () {
    state.size = Number($('size').value) || 256;
    initGrid(state.size, 'centre'); save();
  });
  $('wrap').addEventListener('change', function () {
    state.wrap = $('wrap').checked;
    nbrs = buildNeighbours(grid.n, state.wrap); save();
  });
  $('erase').addEventListener('change', function () { state.erase = $('erase').checked; });

  $('play').addEventListener('click', function () { setRunning(!running); });
  $('stepBtn').addEventListener('click', function () { setRunning(false); singleStep(); });
  $('reset').addEventListener('click', function () { initGrid(state.size, 'centre'); });
  $('clear').addEventListener('click', function () { clearGrid(grid); iterations = 0; render(); updateStats(); });
  $('random').addEventListener('click', function () { initGrid(state.size, 'random'); });
  $('export').addEventListener('click', function () {
    var out = document.createElement('canvas');
    var scale = Math.max(1, Math.round(1024 / grid.n));
    out.width = grid.n * scale; out.height = grid.n * scale;
    var oc = out.getContext('2d');
    if (!oc) return;
    oc.imageSmoothingEnabled = false;
    oc.drawImage(canvas, 0, 0, out.width, out.height);
    out.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'reaction-diffusion-f' + state.f.toFixed(4) + '-k' + state.k.toFixed(4) + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }, 'image/png');
  });

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target && e.target.tagName;
    if (t === 'SELECT' || t === 'TEXTAREA') return;
    if (t === 'INPUT' && e.target.type !== 'checkbox' && e.target.type !== 'range') return;
    if ((t === 'BUTTON' || t === 'INPUT') && e.key === ' ') return; // focused control handles its own activation
    var key = e.key.toLowerCase();
    if (key === ' ') { e.preventDefault(); setRunning(!running); }
    else if (key === 'r') { initGrid(state.size, 'centre'); }
    else if (key === 's') { setRunning(false); singleStep(); }
    else if (key === 'e') { state.erase = !state.erase; $('erase').checked = state.erase; }
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { wasRunningBeforeHide = running; if (running) setRunning(false); }
    else if (wasRunningBeforeHide) { setRunning(true); wasRunningBeforeHide = false; }
  });

  // ---------- Parameter map ----------
  var mapCanvas = $('map'), mctx = mapCanvas.getContext('2d'), mapBase = null;
  function kSaddle(f) { return Math.sqrt(f) / 2 - f; }
  // Classification in (f, offset-from-saddle-node-curve) space, nearest preset wins.
  function classify(f, k) {
    var d = k - kSaddle(f);
    if (d > 0.009 || d < -0.022 || f < 0.005 || f > 0.095) return -1;
    var best = -1, bd = 1e9;
    for (var i = 0; i < PRESETS.length; i++) {
      var pf = PRESETS[i].f, pd = PRESETS[i].k - kSaddle(pf);
      var df = (f - pf) / 0.1, dd = (d - pd) / 0.03;
      var dist = df * df + dd * dd;
      if (dist < bd) { bd = dist; best = i; }
    }
    return best;
  }
  function regionName(f, k) {
    var c = classify(f, k);
    return c < 0 ? 'mostly uniform / dies out' : 'near ' + PRESETS[c].name;
  }
  function buildMapBase() {
    var w = mapCanvas.width, h = mapCanvas.height;
    mapBase = document.createElement('canvas'); mapBase.width = w; mapBase.height = h;
    var c = mapBase.getContext('2d'), im = c.createImageData(w, h);
    var cols = REGION_COLOURS.map(hexToRgb);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var f = F_MIN + (x + 0.5) / w * (F_MAX - F_MIN);
        var k = K_MAX - (y + 0.5) / h * (K_MAX - K_MIN);
        var cl = classify(f, k), i = (y * w + x) * 4;
        if (cl < 0) { im.data[i] = 14; im.data[i + 1] = 17; im.data[i + 2] = 32; }
        else {
          var d = k - kSaddle(f), shade = 0.45 + 0.35 * Math.min(1, Math.max(0, (d + 0.022) / 0.031));
          im.data[i] = cols[cl][0] * shade; im.data[i + 1] = cols[cl][1] * shade; im.data[i + 2] = cols[cl][2] * shade;
        }
        im.data[i + 3] = 255;
      }
    }
    c.putImageData(im, 0, 0);
  }
  function mapXY(f, k) {
    return { x: (f - F_MIN) / (F_MAX - F_MIN) * mapCanvas.width, y: (K_MAX - k) / (K_MAX - K_MIN) * mapCanvas.height };
  }
  function drawMap() {
    if (!mapBase) buildMapBase();
    mctx.drawImage(mapBase, 0, 0);
    mctx.font = '10px system-ui, sans-serif';
    mctx.textAlign = 'center';
    PRESETS.forEach(function (p) {
      var q = mapXY(p.f, p.k);
      mctx.fillStyle = 'rgba(255,255,255,0.85)';
      mctx.beginPath(); mctx.arc(q.x, q.y, 2, 0, 6.2832); mctx.fill();
      mctx.fillStyle = 'rgba(255,255,255,0.8)';
      mctx.fillText(p.name, Math.min(mapCanvas.width - 24, Math.max(24, q.x)), q.y - 6);
    });
    var m = mapXY(state.f, state.k);
    mctx.lineWidth = 2; mctx.strokeStyle = '#000';
    mctx.beginPath(); mctx.arc(m.x, m.y, 7, 0, 6.2832); mctx.stroke();
    mctx.lineWidth = 1.5; mctx.strokeStyle = '#fff';
    mctx.beginPath(); mctx.arc(m.x, m.y, 7, 0, 6.2832); mctx.stroke();
  }
  var mapDrag = false;
  function mapPick(e) {
    var r = mapCanvas.getBoundingClientRect();
    var u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    var v = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setFK(F_MIN + u * (F_MAX - F_MIN), K_MAX - v * (K_MAX - K_MIN), 'Custom');
  }
  mapCanvas.addEventListener('pointerdown', function (e) {
    e.preventDefault(); mapDrag = true;
    try { mapCanvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    mapPick(e);
  });
  mapCanvas.addEventListener('pointermove', function (e) { if (mapDrag) mapPick(e); });
  mapCanvas.addEventListener('pointerup', function () { mapDrag = false; });
  mapCanvas.addEventListener('pointercancel', function () { mapDrag = false; });

  // ---------- Boot ----------
  load();
  buildLut(PALETTES[state.palette]);
  initGrid(state.size, 'centre');
  syncUi();

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    // Pre-grow a pattern so the still frame is meaningful, then start paused.
    for (var w = 0; w < 400; w++) stepGrid(grid, nbrs, state.f, state.k, state.da, state.db);
    iterations = 400; render(); updateStats();
    setRunning(false);
  } else {
    setRunning(true);
  }
  $('loading').hidden = true;
  requestAnimationFrame(frame);
})();
