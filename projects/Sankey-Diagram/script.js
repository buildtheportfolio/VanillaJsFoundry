(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('chart'), stage = $('stage'), tip = $('tip'), statusEl = $('status');
  var PALETTE = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1', '#76b7b2', '#edc948', '#9c755f', '#ff9da7', '#7f7f7f'];
  var NODE_W = 14, NODE_PAD = 12, MARGIN = { l: 8, r: 8, t: 10, b: 10 }, MIN_W = 560;

  // ---------- sample datasets ----------
  function ds(links) { return JSON.stringify({ links: links.map(function (l) { return { source: l[0], target: l[1], value: l[2] }; }) }, null, 2); }
  var SAMPLES = {
    energy: { label: 'Energy flow (TWh)', json: ds([
      ['Coal', 'Electricity', 120], ['Gas', 'Electricity', 180], ['Nuclear', 'Electricity', 95], ['Wind', 'Electricity', 70], ['Solar', 'Electricity', 45], ['Hydro', 'Electricity', 60],
      ['Gas', 'Heat', 140], ['Coal', 'Heat', 30], ['Oil', 'Transport', 210], ['Oil', 'Heat', 25],
      ['Electricity', 'Residential', 150], ['Electricity', 'Commercial', 130], ['Electricity', 'Industry', 190], ['Electricity', 'Losses', 100],
      ['Heat', 'Residential', 110], ['Heat', 'Industry', 85]]) },
    traffic: { label: 'Website funnel (visits)', json: ds([
      ['Search', 'Landing page', 5200], ['Social', 'Landing page', 2300], ['Email', 'Landing page', 1400], ['Direct', 'Landing page', 1900],
      ['Landing page', 'Browse', 6900], ['Landing page', 'Bounce', 3900],
      ['Browse', 'Product page', 4600], ['Browse', 'Exit', 2300],
      ['Product page', 'Cart', 1800], ['Product page', 'Exit', 2800],
      ['Cart', 'Purchase', 1100], ['Cart', 'Abandoned', 700]]) },
    budget: { label: 'Household budget (USD / month)', json: ds([
      ['Salary', 'Income', 4200], ['Side projects', 'Income', 900], ['Dividends', 'Income', 150],
      ['Income', 'Housing', 1700], ['Income', 'Food', 800], ['Income', 'Transport', 450], ['Income', 'Savings', 1100], ['Income', 'Leisure', 600], ['Income', 'Other', 600],
      ['Housing', 'Rent', 1400], ['Housing', 'Utilities', 300],
      ['Food', 'Groceries', 560], ['Food', 'Dining out', 240],
      ['Savings', 'Index funds', 700], ['Savings', 'Emergency fund', 400]]) },
    loop: { label: 'Cycle (invalid, shows the error)', json: ds([['A', 'B', 5], ['B', 'C', 4], ['C', 'A', 3], ['A', 'D', 2]]) }
  };

  // ---------- storage ----------
  function load(k, d) { try { var v = localStorage.getItem('sankey.' + k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('sankey.' + k, v); } catch (e) { /* blocked */ } }
  function say(m) { statusEl.textContent = m; }

  // ---------- validation ----------
  function validate(text) {
    var errs = [], data;
    if (!text.trim()) return { errs: ['Paste some JSON first.'] };
    try { data = JSON.parse(text); }
    catch (e) {
      var m = /position (\d+)/.exec(e.message), where = '';
      if (m) { var before = text.slice(0, +m[1]).split('\n'); where = ' (line ' + before.length + ', column ' + (before[before.length - 1].length + 1) + ')'; }
      return { errs: ['Invalid JSON: ' + e.message.replace(/ in JSON at position.*$/, '') + where] };
    }
    if (!data || typeof data !== 'object' || !Array.isArray(data.links)) return { errs: ['Expected an object with a "links" array.'] };
    if (!data.links.length) return { errs: ['"links" is empty: add at least one link.'] };
    if (data.links.length > 400) return { errs: ['Too many links (limit 400).'] };
    var nodes = {}, order = [];
    function addNode(id, name) { if (!nodes[id]) { nodes[id] = { id: id, name: name || id }; order.push(id); } else if (name) nodes[id].name = name; }
    if (data.nodes !== undefined) {
      if (!Array.isArray(data.nodes)) errs.push('"nodes" must be an array.');
      else data.nodes.forEach(function (n, i) {
        if (!n || typeof n.id !== 'string' || !n.id) { errs.push('nodes[' + i + ']: needs a string "id".'); return; }
        if (nodes[n.id]) { errs.push('nodes[' + i + ']: duplicate id "' + n.id + '".'); return; }
        addNode(n.id, typeof n.name === 'string' ? n.name : n.id);
      });
    }
    var links = [];
    data.links.forEach(function (l, i) {
      var p = 'links[' + i + ']';
      if (!l || typeof l.source !== 'string' || typeof l.target !== 'string' || !l.source || !l.target) { errs.push(p + ': needs string "source" and "target".'); return; }
      if (typeof l.value !== 'number' || !isFinite(l.value) || l.value <= 0) { errs.push(p + ': "value" must be a number greater than 0.'); return; }
      if (l.source === l.target) { errs.push(p + ': "' + l.source + '" links to itself.'); return; }
      if (data.nodes !== undefined && Array.isArray(data.nodes)) {
        if (!nodes[l.source]) { errs.push(p + ': unknown source "' + l.source + '".'); return; }
        if (!nodes[l.target]) { errs.push(p + ': unknown target "' + l.target + '".'); return; }
      } else { addNode(l.source); addNode(l.target); }
      links.push({ source: l.source, target: l.target, value: l.value });
    });
    if (errs.length) return { errs: errs.slice(0, 12) };
    if (order.length > 80) return { errs: ['Too many nodes (limit 80).'] };
    // cycle detection (DFS with colours)
    var adj = {}, color = {}, stack = [], cycle = null;
    order.forEach(function (id) { adj[id] = []; color[id] = 0; });
    links.forEach(function (l) { adj[l.source].push(l.target); });
    function dfs(u) {
      color[u] = 1; stack.push(u);
      for (var i = 0; i < adj[u].length && !cycle; i++) {
        var v = adj[u][i];
        if (color[v] === 1) cycle = stack.slice(stack.indexOf(v)).concat(v);
        else if (color[v] === 0) dfs(v);
      }
      stack.pop(); color[u] = 2;
    }
    for (var i = 0; i < order.length && !cycle; i++) if (color[order[i]] === 0) dfs(order[i]);
    if (cycle) return { errs: ['Cycle detected: ' + cycle.map(function (id) { return nodes[id].name; }).join(' → ') + '. Sankey diagrams must be acyclic.'] };
    return { errs: [], nodes: order.map(function (id) { return nodes[id]; }), links: links };
  }

  // ---------- layout ----------
  var model = null; // {nodes, links, W, H, cols}
  function buildModel(spec, W, H) {
    var byId = {}, nodes = spec.nodes.map(function (n, i) { var o = { id: n.id, name: n.name, index: i, inL: [], outL: [], layer: 0, y: 0, h: 0, x: 0, color: PALETTE[i % PALETTE.length] }; byId[n.id] = o; return o; });
    var links = spec.links.map(function (l, i) { var o = { i: i, source: byId[l.source], target: byId[l.target], value: l.value, w: 0, sy: 0, ty: 0 }; o.source.outL.push(o); o.target.inL.push(o); return o; });
    nodes.forEach(function (n) {
      var a = 0, b = 0; n.inL.forEach(function (l) { a += l.value; }); n.outL.forEach(function (l) { b += l.value; });
      n.inV = a; n.outV = b; n.value = Math.max(a, b);
    });
    // longest-path layering via Kahn order
    var indeg = nodes.map(function (n) { return n.inL.length; }), queue = [], topo = [];
    nodes.forEach(function (n, i) { if (!indeg[i]) queue.push(n); });
    while (queue.length) {
      var u = queue.shift(); topo.push(u);
      u.outL.forEach(function (l) { var v = l.target; v.layer = Math.max(v.layer, u.layer + 1); if (--indeg[v.index] === 0) queue.push(v); });
    }
    // relaxation: pull sources right to just before their earliest successor; push sinks to the last layer
    nodes.forEach(function (n) {
      if (!n.inL.length && n.outL.length) n.layer = Math.min.apply(null, n.outL.map(function (l) { return l.target.layer; })) - 1;
    });
    var maxLayer = Math.max.apply(null, nodes.map(function (n) { return n.layer; }));
    nodes.forEach(function (n) { if (!n.outL.length && n.inL.length) n.layer = maxLayer; });
    var cols = []; for (var c = 0; c <= maxLayer; c++) cols.push([]);
    nodes.forEach(function (n) { cols[n.layer].push(n); });
    model = { nodes: nodes, links: links, cols: cols, maxLayer: maxLayer, W: W, H: H, ky: 1 };
    layoutAll();
  }
  function layoutAll() {
    var m = model, innerW = m.W - MARGIN.l - MARGIN.r, innerH = m.H - MARGIN.t - MARGIN.b;
    var ky = Infinity;
    m.cols.forEach(function (col) {
      var s = 0; col.forEach(function (n) { s += n.value; });
      if (s > 0) ky = Math.min(ky, (innerH - (col.length - 1) * NODE_PAD) / s);
    });
    m.ky = ky; m.innerH = innerH;
    var labelRoom = Math.min(150, innerW * 0.22); // room so end labels fit
    m.nodes.forEach(function (n) {
      n.h = Math.max(2, n.value * ky);
      n.x = MARGIN.l + (m.maxLayer ? n.layer * (innerW - NODE_W) / m.maxLayer : (innerW - NODE_W) / 2);
    });
    m.labelRoom = labelRoom;
    m.cols.forEach(function (col) { var y = MARGIN.t; col.forEach(function (n) { n.y = y; y += n.h + NODE_PAD; }); });
    var iterations = 32;
    for (var it = 0; it < iterations; it++) {
      var alpha = Math.pow(0.99, it) * 0.9;
      for (var c = 1; c <= m.maxLayer; c++) m.cols[c].forEach(function (n) { pull(n, n.inL, 'source', alpha); });
      m.cols.forEach(resolve);
      for (c = m.maxLayer - 1; c >= 0; c--) m.cols[c].forEach(function (n) { pull(n, n.outL, 'target', alpha); });
      m.cols.forEach(resolve);
    }
    computeLinks();
  }
  function pull(n, ls, end, alpha) {
    if (!ls.length) return;
    var sum = 0, wsum = 0;
    ls.forEach(function (l) { var o = l[end]; sum += (o.y + o.h / 2) * l.value; wsum += l.value; });
    var target = sum / wsum - n.h / 2;
    n.y += (target - n.y) * alpha;
  }
  function resolve(col) {
    var top = MARGIN.t, bottom = model.H - MARGIN.b, i, n, dy;
    col.sort(function (a, b) { return a.y - b.y || a.index - b.index; });
    var y = top;
    for (i = 0; i < col.length; i++) { n = col[i]; dy = y - n.y; if (dy > 0) n.y += dy; y = n.y + n.h + NODE_PAD; }
    dy = y - NODE_PAD - bottom;
    if (dy > 0) {
      y = col[col.length - 1].y -= dy;
      for (i = col.length - 2; i >= 0; i--) { n = col[i]; dy = n.y + n.h + NODE_PAD - y; if (dy > 0) n.y -= dy; y = n.y; }
    }
  }
  function computeLinks() {
    model.nodes.forEach(function (n) {
      n.outL.sort(function (a, b) { return a.target.y - b.target.y || a.i - b.i; });
      n.inL.sort(function (a, b) { return a.source.y - b.source.y || a.i - b.i; });
      var y = n.y; n.outL.forEach(function (l) { l.w = Math.max(1.5, l.value * model.ky); l.sy = y + l.w / 2; y += l.value * model.ky; });
      y = n.y; n.inL.forEach(function (l) { l.ty = y + Math.max(1.5, l.value * model.ky) / 2; y += l.value * model.ky; });
    });
  }
  function linkPath(l) {
    var x0 = l.source.x + NODE_W, x1 = l.target.x, mx = (x0 + x1) / 2;
    return 'M' + x0.toFixed(1) + ',' + l.sy.toFixed(1) + 'C' + mx.toFixed(1) + ',' + l.sy.toFixed(1) + ' ' + mx.toFixed(1) + ',' + l.ty.toFixed(1) + ' ' + x1.toFixed(1) + ',' + l.ty.toFixed(1);
  }

  // ---------- render ----------
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fmt(v) { return String(Number(v.toFixed(2))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  var currentSpec = null;

  function size() {
    var w = Math.max(MIN_W, Math.floor(stage.clientWidth));
    
    var h = model ? Math.min(720, Math.max(360, Math.max.apply(null, model.cols.map(function (c) { return c.length; })) * 58 + 60)) : 420;
    return { w: w, h: h };
  }
  function render() {
    if (!currentSpec) return;
    // first pass to learn column counts
    var s0 = size();
    buildModel(currentSpec, s0.w, s0.h);
    var s = size();
    if (s.h !== model.H) buildModel(currentSpec, s.w, s.h);
    svg.setAttribute('width', model.W); svg.setAttribute('height', model.H); svg.setAttribute('viewBox', '0 0 ' + model.W + ' ' + model.H);
    svg.setAttribute('aria-label', 'Sankey diagram: ' + model.nodes.length + ' nodes, ' + model.links.length + ' flows');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('class', $('animToggle').checked ? 'animating' : '');
    var linkG = el('g', { 'class': 'links', fill: 'none' }, svg), nodeG = el('g', { 'class': 'nodes' }, svg);
    model.links.forEach(function (l) {
      var g = el('g', { 'class': 'link' }, linkG);
      var grad = l.source.color;
      l.band = el('path', { 'class': 'band', d: linkPath(l), stroke: grad, 'stroke-opacity': '0.42', 'stroke-width': l.w.toFixed(1), fill: 'none' }, g);
      l.stripes = el('path', { 'class': 'stripes', d: linkPath(l), 'stroke-width': Math.max(1, l.w * 0.5).toFixed(1), fill: 'none' }, g);
      l.g = g;
      l.band.addEventListener('mouseenter', function (e) { trace(null, l); showTip(linkTip(l), e); });
      l.band.addEventListener('mousemove', moveTip);
      l.band.addEventListener('mouseleave', function () { untrace(); hideTip(); });
    });
    model.nodes.forEach(function (n) {
      var g = el('g', { 'class': 'node', tabindex: '0', role: 'img', 'aria-label': nodeLabel(n) + '. Use up and down arrows to move.' }, nodeG);
      n.rect = el('rect', { x: n.x, y: n.y.toFixed(1), width: NODE_W, height: n.h.toFixed(1), fill: n.color, rx: 2, stroke: 'rgba(0,0,0,.35)', 'stroke-width': 0.5 }, g);
      var left = n.layer > model.maxLayer / 2 || (model.maxLayer === 0 && false);
      n.text = el('text', { x: left ? n.x - 6 : n.x + NODE_W + 6, y: (n.y + n.h / 2).toFixed(1), 'text-anchor': left ? 'end' : 'start', 'dominant-baseline': 'middle' }, g);
      n.text.textContent = n.name;
      n.g = g;
      g.addEventListener('mouseenter', function (e) { trace(n, null); showTip(nodeTip(n), e); });
      g.addEventListener('mousemove', moveTip);
      g.addEventListener('mouseleave', function () { untrace(); hideTip(); });
      g.addEventListener('focus', function () { trace(n, null); });
      g.addEventListener('blur', untrace);
      g.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowUp' ? -10 : e.key === 'ArrowDown' ? 10 : 0;
        if (!d) return;
        e.preventDefault(); moveNode(n, n.y + d); say(n.name + ' moved ' + (d < 0 ? 'up' : 'down'));
      });
      g.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button > 0) return;
        e.preventDefault(); g.focus({ preventScroll: true });
        try { g.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
        var startY = e.clientY, startNode = n.y;
        function mv(ev) { moveNode(n, startNode + (ev.clientY - startY)); moveTip(ev); }
        function up(ev) { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up); }
        g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
      });
      g.style.touchAction = 'none';
    });
  }
  function moveNode(n, y) {
    n.y = Math.max(MARGIN.t, Math.min(model.H - MARGIN.b - n.h, y));
    n.rect.setAttribute('y', n.y.toFixed(1)); n.text.setAttribute('y', (n.y + n.h / 2).toFixed(1));
    computeLinks();
    model.links.forEach(function (l) { var d = linkPath(l); l.band.setAttribute('d', d); l.stripes.setAttribute('d', d); });
  }

  // ---------- tracing ----------
  function trace(node, link) {
    var nodes = {}, links = {}, seeds = node ? [node] : [link.source, link.target];
    if (link) links[link.i] = true;
    function down(n) { if (nodes['d' + n.index]) return; nodes['d' + n.index] = true; nodes[n.index] = true; n.outL.forEach(function (l) { links[l.i] = true; down(l.target); }); }
    function up(n) { if (nodes['u' + n.index]) return; nodes['u' + n.index] = true; nodes[n.index] = true; n.inL.forEach(function (l) { links[l.i] = true; up(l.source); }); }
    if (node) { down(node); up(node); } else { down(link.target); up(link.source); }
    svg.classList.add('tracing');
    model.links.forEach(function (l) { l.g.classList.toggle('dim', !links[l.i]); });
    model.nodes.forEach(function (n) { n.g.classList.toggle('dim', !nodes[n.index]); });
  }
  function untrace() {
    svg.classList.remove('tracing');
    model.links.forEach(function (l) { if (l.g) l.g.classList.remove('dim'); });
    model.nodes.forEach(function (n) { if (n.g) n.g.classList.remove('dim'); });
  }

  // ---------- tooltip ----------
  function nodeLabel(n) { return n.name + ', total ' + fmt(n.value) + ', inflow ' + fmt(n.inV) + ', outflow ' + fmt(n.outV); }
  function nodeTip(n) { return [n.name, 'Total ' + fmt(n.value), 'In ' + fmt(n.inV) + '  Out ' + fmt(n.outV)]; }
  function linkTip(l) { return [l.source.name + ' → ' + l.target.name, fmt(l.value) + ' (' + (l.value / l.source.outV * 100).toFixed(1) + '% of ' + l.source.name + ' outflow)']; }
  function showTip(lines, e) {
    tip.textContent = '';
    lines.forEach(function (s, i) { var d = document.createElement(i ? 'div' : 'b'); d.textContent = s; tip.appendChild(d); });
    tip.hidden = false; moveTip(e);
  }
  function moveTip(e) {
    if (tip.hidden) return;
    var r = stage.getBoundingClientRect(), x = e.clientX - r.left + stage.scrollLeft + 14, y = e.clientY - r.top + 14;
    var maxX = stage.scrollLeft + stage.clientWidth - tip.offsetWidth - 4;
    if (x > maxX) x = e.clientX - r.left + stage.scrollLeft - tip.offsetWidth - 14;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  // ---------- editor ----------
  function showErrors(list, ok) {
    var ul = $('errors'); ul.textContent = ''; ul.className = 'errors' + (ok ? ' ok' : '');
    list.forEach(function (s) { var li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
  }
  function apply(text, announce) {
    var res = validate(text);
    if (res.errs.length) {
      showErrors(res.errs, false); $('jsonText').setAttribute('aria-invalid', 'true');
      if (announce) say('Dataset invalid: ' + res.errs[0]);
      return false;
    }
    $('jsonText').removeAttribute('aria-invalid');
    currentSpec = { nodes: res.nodes, links: res.links };
    save('json', text);
    render();
    showErrors(['Applied: ' + res.nodes.length + ' nodes, ' + res.links.length + ' links.'], true);
    if (announce) say('Diagram updated: ' + res.nodes.length + ' nodes, ' + res.links.length + ' links');
    return true;
  }
  $('applyBtn').addEventListener('click', function () { $('sampleSel').value = ''; apply($('jsonText').value, true); });
  var sel = $('sampleSel');
  (function () {
    var blank = document.createElement('option'); blank.value = ''; blank.textContent = 'Custom'; sel.appendChild(blank);
    Object.keys(SAMPLES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = SAMPLES[k].label; sel.appendChild(o); });
  })();
  sel.addEventListener('change', function () {
    var s = SAMPLES[sel.value]; if (!s) return;
    $('jsonText').value = s.json; save('sample', sel.value); apply(s.json, true);
  });
  $('animToggle').addEventListener('change', function (e) { svg.classList.toggle('animating', e.target.checked); save('anim', e.target.checked ? '1' : '0'); say('Flow animation ' + (e.target.checked ? 'on' : 'off')); });
  $('relayoutBtn').addEventListener('click', function () { render(); say('Layout reset'); });

  // ---------- export ----------
  $('exportBtn').addEventListener('click', function () {
    if (!model) return;
    var clone = svg.cloneNode(true);
    clone.removeAttribute('class');
    Array.prototype.slice.call(clone.querySelectorAll('.stripes')).forEach(function (n) { n.parentNode.removeChild(n); });
    Array.prototype.slice.call(clone.querySelectorAll('[class]')).forEach(function (n) { n.removeAttribute('class'); });
    Array.prototype.slice.call(clone.querySelectorAll('[tabindex]')).forEach(function (n) { n.removeAttribute('tabindex'); });
    Array.prototype.slice.call(clone.querySelectorAll('text')).forEach(function (t) {
      t.setAttribute('font-family', 'system-ui, sans-serif'); t.setAttribute('font-size', '12'); t.setAttribute('fill', '#16202e');
      t.setAttribute('stroke', '#ffffff'); t.setAttribute('stroke-width', '3'); t.setAttribute('paint-order', 'stroke');
    });
    var bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('width', model.W); bg.setAttribute('height', model.H); bg.setAttribute('fill', '#ffffff');
    clone.insertBefore(bg, clone.firstChild);
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
    var blob = new Blob([xml], { type: 'image/svg+xml' }), url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'sankey-diagram.svg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    say('SVG exported as sankey-diagram.svg');
  });

  // ---------- resize ----------
  var rt = null, lastW = 0;
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () { var w = Math.floor(stage.clientWidth); if (w !== lastW) { lastW = w; render(); } }, 120);
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage); else window.addEventListener('resize', onResize);

  // ---------- init ----------
  (function init() {
    $('animToggle').checked = load('anim', '1') === '1';
    var saved = load('json', ''), key = load('sample', 'energy');
    if (!SAMPLES[key]) key = '';
    var text = saved || SAMPLES.energy.json;
    $('jsonText').value = text;
    if (!apply(text, false)) { $('jsonText').value = SAMPLES.energy.json; key = 'energy'; apply(SAMPLES.energy.json, false); }
    else if (!saved) key = 'energy';
    sel.value = saved && key && SAMPLES[key] && SAMPLES[key].json === saved ? key : (saved ? '' : 'energy');
    lastW = Math.floor(stage.clientWidth);
  })();
})();
