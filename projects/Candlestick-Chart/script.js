(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('chart'), wrap = $('chartWrap'), tip = $('tip');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) { $('empty').hidden = false; return; }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var BASE_OPEN = 9 * 3600 + 30 * 60; // simulated clock starts 09:30:00
  var HISTORY = 1800;                 // seconds of pre-generated history
  var TICKS_PER_SEC = 10;
  var MAX_BASE = 20000;
  var PAD_R = 64, PAD_B = 22, PAD_T = 8, VOL_FRAC = 0.2;

  // ---------- storage ----------
  function load(k, d) { try { var v = localStorage.getItem('candles.' + k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('candles.' + k, String(v)); } catch (e) { /* storage blocked */ } }

  // ---------- seeded RNG (mulberry32) + gaussian ----------
  function makeRng(seed) {
    var a = seed >>> 0;
    function next() {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function gauss() { var u = 0, v = 0; while (u === 0) u = next(); v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    return { next: next, gauss: gauss };
  }

  // ---------- market state ----------
  var rng, price, drift, simT, base, version, ticks, sessionOpen;
  function startMarket(seed) {
    rng = makeRng(seed);
    price = 100; drift = 0; simT = 0; base = []; version = 0; ticks = [];
    var n = HISTORY * TICKS_PER_SEC;
    for (var i = 0; i < n; i++) stepTick(true);
    sessionOpen = base.length ? base[0].o : price;
  }
  function stepTick(silent) {
    drift = drift * 0.98 + rng.gauss() * 0.004;
    var vol = 0.045 * (1 + 0.6 * Math.abs(Math.sin(simT / 140)));
    var prev = price;
    price = Math.max(1, price * (1 + (drift + rng.gauss() * vol) / 100));
    price = Math.round(price * 100) / 100;
    var size = Math.max(1, Math.round(Math.abs(rng.gauss()) * 40 + 5 + Math.abs(price - prev) * 120));
    var sec = Math.floor(simT + 1e-9);
    var last = base[base.length - 1];
    if (!last || last.t !== sec) {
      base.push({ t: sec, o: prev, h: Math.max(prev, price), l: Math.min(prev, price), c: price, v: size });
      if (base.length > MAX_BASE) base.shift();
    } else {
      if (price > last.h) last.h = price;
      if (price < last.l) last.l = price;
      last.c = price; last.v += size;
    }
    simT += 1 / TICKS_PER_SEC; version++;
    if (!silent) { ticks.push({ t: simT, p: price, s: size, up: price >= prev }); if (ticks.length > 10) ticks.shift(); }
  }

  // ---------- aggregation ----------
  var tf = 5, aggCache = null, aggKey = '';
  function aggregate() {
    var key = tf + ':' + version;
    if (key === aggKey) return aggCache;
    var out = [], cur = null;
    for (var i = 0; i < base.length; i++) {
      var b = base[i], bucket = Math.floor(b.t / tf) * tf;
      if (!cur || cur.t !== bucket) { cur = { t: bucket, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }; out.push(cur); }
      else { if (b.h > cur.h) cur.h = b.h; if (b.l < cur.l) cur.l = b.l; cur.c = b.c; cur.v += b.v; }
    }
    aggCache = out; aggKey = key;
    return out;
  }
  var maCache = { key: '', sma: null, ema: null };
  function movingAverages(c) {
    var key = tf + ':' + version;
    if (maCache.key === key) return maCache;
    var N = 20, sma = new Array(c.length), ema = new Array(c.length), sum = 0, k = 2 / (N + 1), e = 0;
    for (var i = 0; i < c.length; i++) {
      sum += c[i].c; if (i >= N) sum -= c[i - N].c;
      sma[i] = i >= N - 1 ? sum / N : null;
      e = i === 0 ? c[0].c : c[i].c * k + e * (1 - k);
      ema[i] = i >= N - 1 ? e : null;
    }
    maCache = { key: key, sma: sma, ema: ema };
    return maCache;
  }

  // ---------- view (data space: time x price) ----------
  var view = { tEnd: 0, span: 300, follow: true };
  var W = 0, H = 0, dpr = 1, plotW = 0, plotH = 0, priceH = 0, volH = 0;
  var pointer = null; // {x,y} in css px, or null
  var showSma = false, showEma = false, paused = false;
  var colors = {};

  function minSpan() { return tf * 8; }
  function maxSpan() { return Math.max(tf * 400, 60); }
  function latestEnd() { var c = aggregate(); return c.length ? c[c.length - 1].t + tf : 0; }
  function followEnd() { return latestEnd() + view.span * 0.08; }
  function clampView() {
    view.span = Math.min(maxSpan(), Math.max(minSpan(), view.span));
    var c = aggregate(), maxEnd = followEnd(), minEnd = (c.length ? c[0].t : 0) + view.span * 0.2;
    if (view.tEnd >= maxEnd) { view.tEnd = maxEnd; view.follow = true; }
    else if (view.tEnd < minEnd) view.tEnd = minEnd;
  }
  function xOfT(t) { return (t - (view.tEnd - view.span)) / view.span * plotW; }
  function tOfX(x) { return view.tEnd - view.span + x / plotW * view.span; }

  function zoomAt(factor, x) {
    var tc = tOfX(x), ns = Math.min(maxSpan(), Math.max(minSpan(), view.span * factor));
    if (view.follow) { view.span = ns; view.tEnd = followEnd(); }
    else { var left = tc - x / plotW * ns; view.span = ns; view.tEnd = left + ns; }
    clampView(); requestDraw();
  }
  function panBy(dt) { view.tEnd += dt; view.follow = false; clampView(); requestDraw(); }
  function goLatest() { view.follow = true; view.tEnd = followEnd(); clampView(); requestDraw(); say('Following latest candle'); }

  // ---------- drawing ----------
  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    ['up', 'down', 'grid', 'sma', 'ema', 'ink', 'muted', 'panel', 'line', 'accent'].forEach(function (n) { colors[n] = cs.getPropertyValue('--' + n).trim(); });
  }
  function resize() {
    var r = wrap.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = Math.max(200, Math.floor(r.width)); H = Math.max(200, Math.floor(r.height));
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    plotW = W - PAD_R; plotH = H - PAD_B - PAD_T;
    volH = plotH * VOL_FRAC; priceH = plotH - volH - 6;
    if (view.follow) view.tEnd = followEnd();
    requestDraw();
  }
  function niceStep(range, target) {
    var raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }
  function fmtTime(t, withSec) {
    var s = Math.floor(t) + BASE_OPEN, h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, sc = s % 60;
    var z = function (n) { return (n < 10 ? '0' : '') + n; };
    return z(h) + ':' + z(m) + (withSec ? ':' + z(sc) : '');
  }

  var drawQueued = false;
  function requestDraw() { if (drawQueued) return; drawQueued = true; requestAnimationFrame(function () { drawQueued = false; draw(); }); }

  var vis = { first: 0, last: -1, lo: 0, hi: 1, candles: [] };
  function yP(p) { return PAD_T + (vis.hi - p) / (vis.hi - vis.lo) * priceH; }
  function pOfY(y) { return vis.hi - (y - PAD_T) / priceH * (vis.hi - vis.lo); }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var c = aggregate(); vis.candles = c;
    if (view.follow) view.tEnd = followEnd();
    var tl = view.tEnd - view.span;
    var first = 0, lastI = c.length - 1;
    while (first < c.length && c[first].t + tf < tl) first++;
    while (lastI >= 0 && c[lastI].t > view.tEnd) lastI--;
    vis.first = first; vis.last = lastI;
    var lo = Infinity, hi = -Infinity, vmax = 1, i;
    for (i = first; i <= lastI; i++) { if (c[i].l < lo) lo = c[i].l; if (c[i].h > hi) hi = c[i].h; if (c[i].v > vmax) vmax = c[i].v; }
    if (!isFinite(lo)) { lo = price - 1; hi = price + 1; }
    var pad = (hi - lo) * 0.1 || 0.5; lo -= pad; hi += pad;
    vis.lo = lo; vis.hi = hi;

    // grid + price axis
    ctx.font = '11px ui-monospace, Consolas, monospace'; ctx.textBaseline = 'middle';
    var step = niceStep(hi - lo, Math.max(3, priceH / 60)), v0 = Math.ceil(lo / step) * step, v;
    ctx.lineWidth = 1; ctx.strokeStyle = colors.grid; ctx.fillStyle = colors.muted; ctx.textAlign = 'left';
    ctx.beginPath();
    for (v = v0; v < hi; v += step) { var y = Math.round(yP(v)) + 0.5; ctx.moveTo(0, y); ctx.lineTo(plotW, y); }
    ctx.stroke();
    for (v = v0; v < hi; v += step) ctx.fillText(v.toFixed(step < 1 ? 2 : 0), plotW + 6, yP(v));
    // time axis
    var tstep = niceStep(view.span, Math.max(3, plotW / 90));
    var tsteps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    for (i = 0; i < tsteps.length; i++) if (tsteps[i] >= tstep) { tstep = tsteps[i]; break; }
    ctx.textAlign = 'center'; ctx.beginPath();
    var t;
    for (t = Math.ceil(tl / tstep) * tstep; t < view.tEnd; t += tstep) {
      var x = Math.round(xOfT(t)) + 0.5; if (x < 0 || x > plotW) continue;
      ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + plotH);
    }
    ctx.stroke();
    for (t = Math.ceil(tl / tstep) * tstep; t < view.tEnd; t += tstep) {
      var xx = xOfT(t); if (xx < 20 || xx > plotW - 20) continue;
      ctx.fillText(fmtTime(t, tstep < 60), xx, H - PAD_B / 2);
    }

    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, plotW, H - PAD_B); ctx.clip();
    // candles + volume
    var cw = Math.max(1, tf / view.span * plotW), bw = Math.max(1, Math.floor(cw * 0.7)), vBase = PAD_T + plotH;
    for (i = first; i <= lastI; i++) {
      var k = c[i], cx = xOfT(k.t + tf / 2), up = k.c >= k.o, col = up ? colors.up : colors.down;
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1;
      var vh = k.v / vmax * volH; ctx.globalAlpha = 0.45; ctx.fillRect(Math.round(cx - bw / 2), vBase - vh, bw, vh); ctx.globalAlpha = 1;
      var px = Math.round(cx) + 0.5;
      ctx.beginPath(); ctx.moveTo(px, yP(k.h)); ctx.lineTo(px, yP(k.l)); ctx.stroke();
      var yo = yP(k.o), yc = yP(k.c), top = Math.min(yo, yc), bh = Math.max(1, Math.abs(yo - yc));
      ctx.fillRect(Math.round(cx - bw / 2), top, bw, bh);
    }
    // moving averages
    var ma = movingAverages(c);
    var line = function (arr, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); var started = false;
      for (var j = Math.max(0, first - 1); j <= Math.min(c.length - 1, lastI + 1); j++) {
        if (arr[j] == null) continue;
        var lx = xOfT(c[j].t + tf / 2), ly = yP(arr[j]);
        if (!started) { ctx.moveTo(lx, ly); started = true; } else ctx.lineTo(lx, ly);
      }
      ctx.stroke();
    };
    if (showSma) line(ma.sma, colors.sma);
    if (showEma) line(ma.ema, colors.ema);
    ctx.restore();

    // last price line
    var ly2 = yP(price);
    if (ly2 > PAD_T && ly2 < PAD_T + priceH) {
      var lastC = c[c.length - 1], upNow = lastC ? lastC.c >= lastC.o : true, lcol = upNow ? colors.up : colors.down;
      ctx.setLineDash([4, 4]); ctx.strokeStyle = lcol; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, ly2); ctx.lineTo(plotW, ly2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = lcol; ctx.fillRect(plotW, ly2 - 9, PAD_R, 18);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(price.toFixed(2), plotW + 6, ly2);
    }
    // crosshair
    if (pointer && pointer.x >= 0 && pointer.x <= plotW && pointer.y >= PAD_T && pointer.y <= PAD_T + plotH) {
      ctx.strokeStyle = colors.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath();
      ctx.moveTo(Math.round(pointer.x) + 0.5, PAD_T); ctx.lineTo(Math.round(pointer.x) + 0.5, PAD_T + plotH);
      if (pointer.y <= PAD_T + priceH) { ctx.moveTo(0, Math.round(pointer.y) + 0.5); ctx.lineTo(plotW, Math.round(pointer.y) + 0.5); }
      ctx.stroke(); ctx.setLineDash([]);
      if (pointer.y <= PAD_T + priceH) {
        ctx.fillStyle = colors.ink; ctx.fillRect(plotW, pointer.y - 9, PAD_R, 18);
        ctx.fillStyle = colors.panel; ctx.textAlign = 'left'; ctx.fillText(pOfY(pointer.y).toFixed(2), plotW + 6, pointer.y);
      }
      updateTip();
    } else tip.hidden = true;
    updateQuote();
  }

  function candleAtX(x) {
    var t = tOfX(x), c = vis.candles, idx = Math.floor(t / tf) * tf, lo = 0, hi = c.length - 1;
    while (lo <= hi) { var m = (lo + hi) >> 1; if (c[m].t === idx) return m; if (c[m].t < idx) lo = m + 1; else hi = m - 1; }
    return -1;
  }
  function updateTip() {
    var i = candleAtX(pointer.x);
    if (i < 0) { tip.hidden = true; return; }
    var k = vis.candles[i], chg = k.c - k.o;
    tip.textContent = fmtTime(k.t, true) + '  (' + tfLabel() + ')\nO ' + k.o.toFixed(2) + '  H ' + k.h.toFixed(2) + '\nL ' + k.l.toFixed(2) + '  C ' + k.c.toFixed(2) + '\nVol ' + k.v + '  ' + (chg >= 0 ? '+' : '') + chg.toFixed(2);
    tip.hidden = false;
    var tw = tip.offsetWidth, th = tip.offsetHeight, tx = pointer.x + 14, ty = pointer.y + 14;
    if (tx + tw > W - 4) tx = pointer.x - tw - 14;
    if (ty + th > H - 4) ty = pointer.y - th - 14;
    tip.style.left = Math.max(4, tx) + 'px'; tip.style.top = Math.max(4, ty) + 'px';
  }
  function tfLabel() { return tf >= 60 ? (tf / 60) + 'm' : tf + 's'; }

  // ---------- quote + log ----------
  var logItems = [];
  (function buildLog() {
    var ol = $('tickLog');
    for (var i = 0; i < 10; i++) {
      var li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('span');
      li.appendChild(a); li.appendChild(b); ol.appendChild(li); logItems.push({ li: li, a: a, b: b });
    }
  })();
  function updateLog() {
    for (var i = 0; i < logItems.length; i++) {
      var tk = ticks[ticks.length - 1 - i], it = logItems[i];
      if (!tk) { it.a.textContent = '–'; it.b.textContent = ''; it.li.className = ''; continue; }
      it.a.textContent = fmtTime(tk.t, true) + '.' + Math.floor((tk.t % 1) * 10 + 1e-6);
      it.b.textContent = tk.p.toFixed(2) + ' x' + tk.s;
      it.li.className = tk.up ? 'up' : 'down';
    }
  }
  function updateQuote() {
    var lp = $('lastPrice'), ch = $('chg'), d = price - sessionOpen, pct = d / sessionOpen * 100;
    lp.textContent = price.toFixed(2);
    ch.textContent = (d >= 0 ? '+' : '') + d.toFixed(2) + ' (' + (d >= 0 ? '+' : '') + pct.toFixed(2) + '%)';
    ch.className = 'chg ' + (d >= 0 ? 'up' : 'down'); lp.className = 'price ' + (d >= 0 ? 'up' : 'down');
  }
  var statusEl = $('status');
  function say(msg) { statusEl.textContent = msg; }

  // ---------- feed loop ----------
  var timer = null;
  function onTick() { stepTick(false); if (view.follow) view.tEnd = followEnd(); else clampView(); }
  function startFeed() {
    if (timer) clearInterval(timer);
    var every = reduced.matches ? 1000 : 100, per = reduced.matches ? TICKS_PER_SEC : 1;
    timer = setInterval(function () {
      if (paused) return;
      for (var i = 0; i < per; i++) onTick();
      updateLog(); requestDraw();
    }, every);
  }

  // ---------- controls ----------
  function setTf(n, announce) {
    tf = n; aggKey = ''; maCache.key = '';
    var btns = document.querySelectorAll('#tfGroup button');
    for (var i = 0; i < btns.length; i++) { var on = Number(btns[i].dataset.tf) === n; btns[i].setAttribute('aria-checked', String(on)); btns[i].tabIndex = on ? 0 : -1; }
    view.span = tf * 60; view.follow = true; view.tEnd = followEnd(); clampView();
    save('tf', n); requestDraw();
    if (announce) say('Timeframe ' + tfLabel());
  }
  document.querySelectorAll('#tfGroup button').forEach(function (b) {
    b.addEventListener('click', function () { setTf(Number(b.dataset.tf), true); });
    b.addEventListener('keydown', function (e) {
      var btns = Array.prototype.slice.call(document.querySelectorAll('#tfGroup button')), i = btns.indexOf(b), d = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') d = -1; else return;
      e.preventDefault(); var n = btns[(i + d + btns.length) % btns.length]; n.focus(); setTf(Number(n.dataset.tf), true);
    });
  });
  $('smaToggle').addEventListener('change', function (e) { showSma = e.target.checked; save('sma', showSma ? 1 : 0); say('SMA 20 ' + (showSma ? 'on' : 'off')); requestDraw(); });
  $('emaToggle').addEventListener('change', function (e) { showEma = e.target.checked; save('ema', showEma ? 1 : 0); say('EMA 20 ' + (showEma ? 'on' : 'off')); requestDraw(); });
  function setPaused(p) { paused = p; var b = $('pauseBtn'); b.textContent = p ? 'Resume' : 'Pause'; b.setAttribute('aria-pressed', String(p)); say(p ? 'Feed paused' : 'Feed resumed'); }
  $('pauseBtn').addEventListener('click', function () { setPaused(!paused); });
  $('latestBtn').addEventListener('click', goLatest);
  function restart() {
    var s = parseInt($('seedInput').value, 10);
    if (!(s >= 1 && s <= 999999)) { s = 42; $('seedInput').value = 42; }
    save('seed', s); $('seedLabel').textContent = s;
    startMarket(s); view.follow = true; setTf(tf, false); updateLog(); say('Feed restarted with seed ' + s);
  }
  $('restartBtn').addEventListener('click', restart);

  // ---------- pointer interaction ----------
  var pts = {}, dragLast = null, pinchDist = 0;
  function local(e) { var r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  canvas.addEventListener('pointerdown', function (e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    pts[e.pointerId] = local(e);
    var ids = Object.keys(pts);
    if (ids.length === 1) dragLast = pts[e.pointerId].x;
    if (ids.length === 2) pinchDist = Math.abs(pts[ids[0]].x - pts[ids[1]].x);
    if (e.pointerType === 'mouse') pointer = local(e);
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = local(e);
    if (pts[e.pointerId]) {
      pts[e.pointerId] = p;
      var ids = Object.keys(pts);
      if (ids.length >= 2) {
        var d = Math.abs(pts[ids[0]].x - pts[ids[1]].x), mid = (pts[ids[0]].x + pts[ids[1]].x) / 2;
        if (pinchDist > 5 && d > 5) zoomAt(pinchDist / d, mid);
        pinchDist = d; pointer = null;
      } else {
        var dx = p.x - dragLast; dragLast = p.x;
        if (dx) panBy(-dx / plotW * view.span);
        pointer = { x: p.x, y: p.y };
      }
    } else pointer = p;
    requestDraw();
  });
  function endPtr(e) {
    delete pts[e.pointerId];
    var ids = Object.keys(pts);
    if (ids.length === 1) dragLast = pts[ids[0]].x;
    pinchDist = 0;
    if (e.pointerType !== 'mouse') { pointer = null; requestDraw(); }
  }
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !pts[e.pointerId]) { pointer = null; requestDraw(); } });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault(); var p = local(e);
    zoomAt(Math.exp(e.deltaY * 0.0015), Math.min(plotW, Math.max(0, p.x)));
  }, { passive: false });
  canvas.addEventListener('keydown', function (e) {
    var k = e.key, handled = true;
    if (k === 'ArrowLeft') panBy(-view.span * 0.1);
    else if (k === 'ArrowRight') panBy(view.span * 0.1);
    else if (k === '+' || k === '=') zoomAt(0.8, plotW / 2);
    else if (k === '-' || k === '_') zoomAt(1.25, plotW / 2);
    else if (k === ' ') setPaused(!paused);
    else if (k === 'Home' || k === 'End') goLatest();
    else handled = false;
    if (handled) e.preventDefault();
  });

  // ---------- init ----------
  function init() {
    var seed = parseInt(load('seed', '42'), 10); if (!(seed >= 1 && seed <= 999999)) seed = 42;
    $('seedInput').value = seed; $('seedLabel').textContent = seed;
    showSma = load('sma', '0') === '1'; showEma = load('ema', '0') === '1';
    $('smaToggle').checked = showSma; $('emaToggle').checked = showEma;
    var t = parseInt(load('tf', '5'), 10); if ([1, 5, 15, 60].indexOf(t) < 0) t = 5;
    readColors(); startMarket(seed); setTf(t, false); updateLog(); resize(); startFeed();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { readColors(); requestDraw(); });
  reduced.addEventListener('change', startFeed);
  init();
})();
