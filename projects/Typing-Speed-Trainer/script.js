(() => {
  'use strict';
  const WORDS = ('the be of and a to in he have it that for they with as not on she at by this we you do but from or which one would all will there say who make when can more if no man out other so what time up go about than into could state only new year some take come these know see use get like then first any work now may such give over think most even find day also after way many must look before great back through long where much should well people down own just because good each those feel seem how high too place little world very still nation hand old life tell write become here show house both between need mean call develop under last right move thing general school never same another begin while number part turn real leave might want point form off child few small since against ask late home interest large person end open public follow during present without again hold govern around possible head consider word program problem however lead system set order eye plan run keep face fact group play stand increase early course change help line').split(/\s+/);
  const PASSAGES = [
    'The quick brown fox jumps over the lazy dog while the morning fog lifts slowly from the quiet valley. Every good typist knows that rhythm matters more than raw speed, so keep your hands relaxed and let the words flow.',
    'A journey of a thousand miles begins with a single step. Practice a little each day, and before long the keys will feel like an extension of your fingers, not a puzzle to be solved one letter at a time.',
    'JavaScript runs in every browser, which makes it one of the most widely used languages in the world. With a few lines of code you can respond to a click, draw on a canvas, or store a note for later.',
    'Rain tapped against the window as she opened the old notebook. Between faded pages lay pressed flowers, ticket stubs, and a map with a small red cross marking a place she had almost forgotten.',
    'Good software is built in small, careful steps: write a test, make it pass, then tidy up. Whenever the code feels confusing, stop, take a breath, and explain the problem out loud in plain words.'
  ];
  const $ = id => document.getElementById(id);
  const textEl = $('text'), input = $('input'), stage = $('stage'), hint = $('focusHint');
  const wpmEl = $('wpm'), accEl = $('acc'), timeEl = $('time'), timeLbl = $('timeLbl');
  const live = $('live'), liveCtx = live.getContext('2d');
  const graph = $('graph');
  const results = $('results'), statusEl = $('status');
  const histBody = $('histBody'), histTable = $('histTable'), histEmpty = $('histEmpty');
  const modeBtns = [...document.querySelectorAll('.mode')];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  };

  let mode = '30', target = '', spans = [], typed = '', phase = 'idle'; // idle | running | done
  let keys = 0, errKeys = 0, startT = 0, ticker = null, samples = [], prevLen = 0, curIdx = -1, passageIdx = -1;

  const rnd = n => Math.floor(Math.random() * n);
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function randomWords(n) {
    const out = []; let last = '';
    while (out.length < n) { const w = WORDS[rnd(WORDS.length)]; if (w !== last) { out.push(w); last = w; } }
    return out.join(' ');
  }
  function addSpans(str) {
    const frag = document.createDocumentFragment();
    for (const ch of str) { const s = document.createElement('span'); s.textContent = ch; spans.push(s); frag.appendChild(s); }
    textEl.appendChild(frag);
  }

  function loadText(keepPassage) {
    textEl.textContent = ''; spans = []; typed = ''; prevLen = 0; curIdx = -1; input.value = '';
    if (mode === 'passage') {
      if (!keepPassage || passageIdx < 0) { let i; do { i = rnd(PASSAGES.length); } while (PASSAGES.length > 1 && i === passageIdx); passageIdx = i; }
      target = PASSAGES[passageIdx];
    } else target = randomWords(60);
    addSpans(target); setCursor(0); textEl.scrollTop = 0;
  }

  function setCursor(i) {
    if (curIdx >= 0 && spans[curIdx]) spans[curIdx].classList.remove('cur');
    curIdx = i;
    const s = spans[i];
    if (s) {
      s.classList.add('cur');
      const lh = 32, top = s.offsetTop;
      if (top > textEl.scrollTop + lh * 2 - 1) textEl.scrollTop = top - lh;
      else if (top < textEl.scrollTop) textEl.scrollTop = top;
    }
  }

  function reset(keepPassage) {
    clearInterval(ticker); ticker = null; phase = 'idle'; keys = 0; errKeys = 0; samples = [];
    loadText(keepPassage);
    wpmEl.textContent = '0'; accEl.textContent = '100%';
    timeLbl.textContent = mode === 'passage' ? 'Elapsed' : 'Time left';
    timeEl.textContent = mode === 'passage' ? '0' : mode;
    results.hidden = true; textEl.classList.remove('running');
    drawLive(); focusInput();
  }

  function focusInput() { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }

  function correctCount() { let c = 0; for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) c++; return c; }
  const elapsed = () => (performance.now() - startT) / 1000;
  function wpmAt(t) { return t > 0 ? (correctCount() / 5) / (t / 60) : 0; }
  function accuracy() { return keys ? Math.max(0, (keys - errKeys) / keys * 100) : 100; }

  function render() {
    const lo = Math.max(0, Math.min(prevLen, typed.length) - 1), hi = Math.min(spans.length, Math.max(prevLen, typed.length) + 1);
    for (let i = lo; i < hi; i++) {
      const s = spans[i];
      s.className = i >= typed.length ? '' : (typed[i] === target[i] ? 'ok' : 'bad');
      if (i === curIdx) s.classList.add('cur');
    }
    prevLen = typed.length; setCursor(Math.min(typed.length, spans.length - 1));
    if (mode !== 'passage' && typed.length > target.length - 80) { const more = ' ' + randomWords(40); target += more; addSpans(more); }
  }

  function tick() {
    const t = elapsed();
    const w = wpmAt(Math.max(t, 1));
    wpmEl.textContent = Math.round(w); accEl.textContent = Math.round(accuracy()) + '%';
    if (mode === 'passage') timeEl.textContent = Math.floor(t);
    else timeEl.textContent = Math.max(0, Math.ceil(+mode - t));
    while (samples.length < Math.floor(t)) samples.push(wpmAt(samples.length + 1));
    drawLive();
    if (mode !== 'passage' && t >= +mode) finish(+mode);
  }

  function begin() {
    phase = 'running'; startT = performance.now(); textEl.classList.add('running');
    ticker = setInterval(tick, 100);
  }

  input.addEventListener('beforeinput', e => {
    if (phase === 'done') { e.preventDefault(); return; }
    if (/^insertFromPaste|^insertFromDrop|^insertFromYank|^insertReplacementText|^historyUndo|^historyRedo/.test(e.inputType) || e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') e.preventDefault();
  });
  input.addEventListener('input', () => {
    if (phase === 'done') { input.value = typed; return; }
    let v = input.value.replace(/\n/g, '');
    if (v.length > target.length) v = v.slice(0, target.length);
    if (phase === 'idle' && v.length) begin();
    // Count new keystrokes (growth only); each wrong char typed is a permanent error mark.
    if (v.length > typed.length && v.startsWith(typed)) {
      for (let i = typed.length; i < v.length; i++) { keys++; if (v[i] !== target[i]) errKeys++; }
    }
    typed = v; if (input.value !== v) input.value = v;
    render();
    if (mode === 'passage' && typed.length >= target.length) finish(elapsed());
  });
  ['paste', 'drop', 'cut'].forEach(ev => input.addEventListener(ev, e => e.preventDefault()));
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); reset(true); return; }
    if (e.key === 'Enter') e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && 'vxzy'.includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') e.preventDefault();
  });
  input.addEventListener('focus', () => stage.classList.add('focused'));
  input.addEventListener('blur', () => stage.classList.remove('focused'));
  stage.addEventListener('click', focusInput);
  stage.addEventListener('mousedown', e => { if (e.target !== input) { e.preventDefault(); focusInput(); } });

  // Typing anywhere on the page focuses the input.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.activeElement !== input) { reset(true); return; }
    if (e.key === 'Enter' && phase === 'done' && !(e.target.tagName === 'BUTTON')) { e.preventDefault(); reset(false); return; }
    if (document.activeElement === input || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (phase !== 'done') focusInput();
  });

  function finish(secs) {
    if (phase === 'done') return;
    phase = 'done'; clearInterval(ticker); ticker = null; textEl.classList.remove('running');
    secs = Math.max(secs, 0.1);
    const w = wpmAt(secs), acc = accuracy();
    while (samples.length < Math.floor(secs)) samples.push(wpmAt(samples.length + 1));
    samples.push(w); // final point at the exact end
    wpmEl.textContent = Math.round(w); accEl.textContent = Math.round(acc) + '%';
    if (mode !== 'passage') timeEl.textContent = '0';
    $('rWpm').textContent = Math.round(w); $('rAcc').textContent = Math.round(acc) + '%';
    $('rChars').textContent = correctCount() + ' / ' + typed.length; $('rErr').textContent = errKeys;
    const hist = loadHist(); const prevBest = hist.filter(h => h.mode === mode).reduce((m, h) => Math.max(m, h.wpm), 0);
    $('rBest').textContent = Math.round(w) > prevBest && hist.some(h => h.mode === mode) ? 'New personal best for this mode!' : '';
    hist.unshift({ t: Date.now(), mode, wpm: Math.round(w), acc: Math.round(acc), secs: Math.round(secs) });
    store.set('foundry.typing.history', JSON.stringify(hist.slice(0, 30)));
    renderHist();
    results.hidden = false; drawGraph(); drawLive();
    statusEl.textContent = 'Finished. ' + Math.round(w) + ' words per minute at ' + Math.round(acc) + ' percent accuracy.';
    input.blur(); results.focus({ preventScroll: false });
  }

  // ---- charts ----
  function drawSeries(ctx, c, data, opts) {
    const W = c.width, H = c.height, padL = opts.axes ? 40 : 6, padR = 10, padT = 10, padB = opts.axes ? 28 : 6;
    ctx.clearRect(0, 0, W, H);
    const max = Math.max(20, ...data) * 1.15, n = Math.max(opts.n || data.length, 2);
    const x = i => padL + (W - padL - padR) * (n === 1 ? 0 : i / (n - 1)), y = v => padT + (H - padT - padB) * (1 - v / max);
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = css('--muted'); ctx.strokeStyle = css('--grid'); ctx.lineWidth = 1;
    if (opts.axes) {
      const step = max > 120 ? 40 : max > 60 ? 20 : 10;
      for (let v = 0; v <= max; v += step) { ctx.beginPath(); ctx.moveTo(padL, y(v)); ctx.lineTo(W - padR, y(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v, padL - 6, y(v) + 4); }
      ctx.textAlign = 'center';
      const every = n > 40 ? 10 : n > 20 ? 5 : n > 8 ? 2 : 1;
      for (let i = 0; i < n; i += every) ctx.fillText((i + 1) + 's', x(i), H - 8);
    }
    if (data.length < 2) { if (!opts.axes) { ctx.textAlign = 'left'; ctx.fillText('WPM over time appears as you type', 10, H / 2 + 4); } return; }
    ctx.beginPath(); data.forEach((v, i) => i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v)));
    ctx.strokeStyle = css('--line'); ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.lineTo(x(data.length - 1), y(0)); ctx.lineTo(x(0), y(0)); ctx.closePath();
    ctx.globalAlpha = .15; ctx.fillStyle = css('--line'); ctx.fill(); ctx.globalAlpha = 1;
    if (opts.axes) { data.forEach((v, i) => { ctx.beginPath(); ctx.arc(x(i), y(v), 3, 0, 7); ctx.fillStyle = css('--line'); ctx.fill(); }); }
  }
  function drawLive() { drawSeries(liveCtx, live, samples, { axes: false }); }
  function drawGraph() { drawSeries(graph.getContext('2d'), graph, samples, { axes: true }); }

  // ---- history ----
  function loadHist() {
    try { const a = JSON.parse(store.get('foundry.typing.history') || '[]'); return Array.isArray(a) ? a.filter(h => h && typeof h.wpm === 'number') : []; } catch (e) { return []; }
  }
  function renderHist() {
    const hist = loadHist();
    histBody.textContent = '';
    histTable.hidden = !hist.length; histEmpty.hidden = !!hist.length; $('clearHist').disabled = !hist.length;
    for (const h of hist.slice(0, 12)) {
      const tr = document.createElement('tr');
      const d = new Date(h.t);
      const cells = [d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
        h.mode === 'passage' ? 'Passage (' + h.secs + 's)' : h.mode + ' s', String(h.wpm), h.acc + '%'];
      for (const c of cells) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }
      histBody.appendChild(tr);
    }
  }
  $('clearHist').addEventListener('click', () => { store.set('foundry.typing.history', '[]'); renderHist(); });

  // ---- controls ----
  function setMode(m) {
    mode = m; store.set('foundry.typing.mode', m);
    modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    reset(false);
  }
  modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('restart').addEventListener('click', () => reset(true));
  $('next').addEventListener('click', () => reset(false));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { drawLive(); if (!results.hidden) drawGraph(); });

  const saved = store.get('foundry.typing.mode');
  if (['15', '30', '60', 'passage'].includes(saved)) mode = saved;
  modeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  renderHist(); reset(false);
})();
