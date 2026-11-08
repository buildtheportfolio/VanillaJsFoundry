(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('map'), stage = $('stage'), tip = $('tip');

  // ---------- built-in datasets ----------
  function L(name, value) { return { name: name, value: value }; }
  function G(name, children) { return { name: name, children: children }; }
  var MB = 1048576, GB = 1073741824;
  var DATASETS = {
    files: { label: 'File system (bytes)', unit: 'bytes', root: G('home', [
      G('projects', [
        G('web-app', [L('node_modules', 820 * MB), L('src', 14 * MB), L('dist', 38 * MB), L('.git', 96 * MB)]),
        G('game-engine', [L('assets', 1.4 * GB), L('src', 22 * MB), L('build', 310 * MB)]),
        G('notes', [L('drafts', 4 * MB), L('archive', 28 * MB)])
      ]),
      G('media', [
        G('photos', [L('2023', 3.2 * GB), L('2024', 4.6 * GB), L('2025', 2.1 * GB)]),
        G('music', [L('albums', 6.8 * GB), L('podcasts', 1.9 * GB)]),
        G('video', [L('screencasts', 2.7 * GB), L('family', 5.3 * GB)])
      ]),
      G('documents', [L('taxes', 180 * MB), L('contracts', 64 * MB), L('manuals', 410 * MB), L('receipts', 120 * MB)]),
      G('downloads', [L('installers', 2.4 * GB), L('iso-images', 3.9 * GB), L('misc', 640 * MB)]),
      G('.cache', [L('browser', 1.1 * GB), L('thumbnails', 380 * MB), L('pip', 220 * MB)])
    ]) },
    budget: { label: 'City budget (USD millions)', unit: 'USD M', root: G('City budget', [
      G('Public safety', [L('Police', 420), L('Fire & rescue', 260), L('Emergency dispatch', 48), L('Courts', 72)]),
      G('Education', [L('Primary schools', 510), L('Secondary schools', 470), L('Libraries', 62), L('Adult learning', 28)]),
      G('Transport', [L('Roads', 330), L('Public transit', 540), L('Cycling & walking', 45), L('Airport', 110)]),
      G('Health & social', [L('Clinics', 210), L('Housing support', 190), L('Elder care', 140), L('Youth services', 66)]),
      G('Environment', [L('Parks', 95), L('Waste', 160), L('Water', 240), L('Energy', 130)]),
      G('Administration', [L('Finance', 54), L('IT', 88), L('Legal', 30), L('Elections', 12)])
    ]) },
    population: { label: 'World population (millions)', unit: 'people M', root: G('World', [
      G('Asia', [L('China', 1412), L('India', 1428), L('Indonesia', 277), L('Pakistan', 240), L('Bangladesh', 173), L('Japan', 124), L('Philippines', 117), L('Vietnam', 99)]),
      G('Africa', [L('Nigeria', 224), L('Ethiopia', 126), L('Egypt', 112), L('DR Congo', 102), L('Tanzania', 67), L('South Africa', 60), L('Kenya', 55)]),
      G('Europe', [L('Russia', 144), L('Germany', 84), L('United Kingdom', 68), L('France', 65), L('Italy', 59), L('Spain', 48), L('Poland', 37)]),
      G('Americas', [L('United States', 335), L('Brazil', 216), L('Mexico', 128), L('Colombia', 52), L('Argentina', 46), L('Canada', 40)]),
      G('Oceania', [L('Australia', 26), L('Papua New Guinea', 10), L('New Zealand', 5)])
    ]) }
  };
  var CUSTOM_KEY = 'custom';

  // ---------- state ----------
  var state = { key: 'files', color: 'depth', path: [] }; // path = array of child indexes from root
  var tree = null;       // current dataset root (annotated)
  var customRoot = null; // annotated custom dataset
  var cur = null;        // current focus node
  var W = 0, H = 0;

  function load(k, d) { try { var v = localStorage.getItem('treemap.' + k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem('treemap.' + k, v); } catch (e) { /* blocked */ } }
  var statusEl = $('status');
  function say(m) { statusEl.textContent = m; }

  // ---------- tree preparation ----------
  function annotate(node, parent, depth) {
    node.parent = parent; node.depth = depth;
    if (node.children && node.children.length) {
      var s = 0;
      for (var i = 0; i < node.children.length; i++) { node.children[i].idx = i; s += annotate(node.children[i], node, depth + 1); }
      node.total = s;
    } else node.total = node.value;
    return node.total;
  }
  function clone(n) {
    var o = { name: n.name };
    if (n.children && n.children.length) o.children = n.children.map(clone); else o.value = n.value;
    return o;
  }
  function prepare(root, unit) { var c = clone(root); c.unit = unit; annotate(c, null, 0); return c; }

  // ---------- squarified layout ----------
  // items: nodes sorted by total desc; rect: {x,y,w,h}; returns array of {node,x,y,w,h}
  function squarify(items, rect) {
    var out = [], total = 0, i;
    for (i = 0; i < items.length; i++) total += items[i].total;
    if (!total || rect.w <= 0 || rect.h <= 0) return out;
    var scale = rect.w * rect.h / total;
    var x = rect.x, y = rect.y, w = rect.w, h = rect.h;
    var row = [], rowArea = 0;

    function worst(areas, sum, side) {
      var mx = Math.max.apply(null, areas), mn = Math.min.apply(null, areas), s2 = sum * sum, w2 = side * side;
      return Math.max(w2 * mx / s2, s2 / (w2 * mn));
    }
    function flush() {
      if (!row.length) return;
      var side = Math.min(w, h), thick = rowArea / side, pos, k;
      if (w >= h) { // lay a column on the left
        pos = y;
        for (k = 0; k < row.length; k++) { var hh = row[k].area / thick; out.push({ node: row[k].node, x: x, y: pos, w: thick, h: hh }); pos += hh; }
        x += thick; w -= thick;
      } else { // lay a row on top
        pos = x;
        for (k = 0; k < row.length; k++) { var ww = row[k].area / thick; out.push({ node: row[k].node, x: pos, y: y, w: ww, h: thick }); pos += ww; }
        y += thick; h -= thick;
      }
      row = []; rowArea = 0;
    }
    for (i = 0; i < items.length; i++) {
      var area = items[i].total * scale, side = Math.min(w, h);
      var areas = row.map(function (r) { return r.area; });
      if (!row.length || worst(areas.concat(area), rowArea + area, side) <= worst(areas, rowArea, side)) {
        row.push({ node: items[i], area: area }); rowArea += area;
      } else { flush(); i--; }
    }
    flush();
    return out;
  }
  function sortedChildren(n) { return n.children.slice().sort(function (a, b) { return b.total - a.total; }); }

  // ---------- formatting ----------
  function fmt(v, unit) {
    if (unit === 'bytes') {
      var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
      while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
      return (v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)) + ' ' + u[i];
    }
    var s = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
    s = String(Number(s)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return s + (unit ? ' ' + unit : '');
  }
  function pathOf(n) { var p = []; while (n) { p.unshift(n.name); n = n.parent; } return p.join(' / '); }

  // ---------- colour ----------
  function topIndex(n) { while (n.depth > 1) n = n.parent; return n.idx || 0; }
  var scaleMax = 1, scaleMin = 0;
  function colorFor(n) {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches, h, s, l;
    if (state.color === 'value') {
      var f = scaleMax > scaleMin ? (Math.log(n.total / scaleMin) / Math.log(scaleMax / scaleMin)) : 0.5;
      f = Math.max(0, Math.min(1, isFinite(f) ? f : 0));
      h = 215 - f * 50; s = 62; l = dark ? 22 + f * 38 : 88 - f * 48;
    } else {
      var base = n.depth <= 1 ? n.idx || 0 : topIndex(n);
      h = (base * 57 + 20) % 360; s = 52;
      var rel = Math.max(0, n.depth - cur.depth - 1);
      l = dark ? 30 + rel * 10 : 62 + rel * 10;
    }
    return { fill: 'hsl(' + Math.round(h) + ',' + s + '%,' + Math.round(l) + '%)', text: l < 52 ? '#fff' : '#111' };
  }

  // ---------- rendering ----------
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function fit(text, px) { var max = Math.floor(px / 6.6); return max < 2 ? '' : text.length > max ? text.slice(0, Math.max(1, max - 1)) + '…' : text; }

  var PAD = 3, HEAD = 18, MAX_DEPTH = 2;
  function render() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var r = stage.getBoundingClientRect();
    W = Math.max(160, Math.floor(r.width)); H = Math.max(160, Math.floor(r.height));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('aria-label', 'Treemap of ' + cur.name + ', ' + fmt(cur.total, tree.unit) + ' total');
    // value colour scale from the visible children
    var leaves = [];
    (function walk(n, d) { if (d > MAX_DEPTH) return; (n.children || []).forEach(function (c) { leaves.push(c.total); walk(c, d + 1); }); })(cur, 1);
    scaleMax = Math.max.apply(null, leaves.concat([1])); scaleMin = Math.max(Math.min.apply(null, leaves.filter(function (v) { return v > 0; }).concat([scaleMax])), scaleMax / 1e6);

    var layer = el('g', { 'class': 'layer' }, svg);
    if (!cur.children) { // leaf focus: single block
      drawCell(layer, cur, { x: 0, y: 0, w: W, h: H }, 0);
    } else drawChildren(layer, cur, { x: 0, y: 0, w: W, h: H }, 1);
  }
  function drawChildren(parentG, node, rect, level) {
    var cells = squarify(sortedChildren(node), rect);
    for (var i = 0; i < cells.length; i++) drawCell(parentG, cells[i].node, cells[i], level);
  }
  function drawCell(parentG, n, c, level) {
    var drillable = !!n.children && n !== cur;
    var pct = cur.total ? n.total / cur.total * 100 : 100;
    var label = n.name + ', ' + fmt(n.total, tree.unit) + ', ' + pct.toFixed(1) + ' percent of ' + cur.name + (drillable ? ', ' + n.children.length + ' items. Press Enter to open.' : '.');
    var g = el('g', { 'class': 'cell' + (drillable ? ' drill' : ''), tabindex: level <= 1 ? '0' : '-1', role: drillable ? 'button' : 'img', 'aria-label': label }, parentG);
    var col = colorFor(n);
    var w = Math.max(0, c.w), h = Math.max(0, c.h);
    el('rect', { x: c.x.toFixed(2), y: c.y.toFixed(2), width: w.toFixed(2), height: h.toFixed(2), fill: col.fill, rx: 2 }, g);
    var hasKids = n.children && level < MAX_DEPTH && w > 60 && h > 46;
    if (w > 34 && h > 16) {
      var t = el('text', { x: (c.x + 6).toFixed(1), y: (c.y + 13).toFixed(1), fill: col.text, 'class': hasKids ? 'hd' : '' }, g);
      t.textContent = fit(n.name, w - 10);
      if (!hasKids && h > 32) {
        var v = el('text', { x: (c.x + 6).toFixed(1), y: (c.y + 27).toFixed(1), fill: col.text, 'class': 'val' }, g);
        v.textContent = fit(fmt(n.total, tree.unit), w - 10);
      } else if (hasKids && w > 90) {
        // value in header, right aligned feel via second tspan
        t.textContent = fit(n.name + '  ' + fmt(n.total, tree.unit), w - 10);
      }
    }
    if (hasKids) {
      var inner = { x: c.x + PAD, y: c.y + HEAD + 2, w: w - PAD * 2, h: h - HEAD - PAD - 2 };
      if (inner.w > 4 && inner.h > 4) drawChildren(g, n, inner, level + 1);
    }
    g.addEventListener('mouseenter', function (e) { showTip(n, e); });
    g.addEventListener('mousemove', function (e) { moveTip(e); });
    g.addEventListener('mouseleave', hideTip);
    g.addEventListener('focus', function () { showTipFor(n, c); });
    g.addEventListener('blur', hideTip);
    g.addEventListener('click', function (e) { e.stopPropagation(); if (n.children && n !== cur) drill(n); else say(n.name + ' is a leaf: ' + fmt(n.total, tree.unit)); });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (n.children && n !== cur) drill(n); }
    });
    return g;
  }

  // ---------- tooltip ----------
  function tipText(n) {
    tip.textContent = '';
    var b = document.createElement('b'); b.textContent = n.name; tip.appendChild(b);
    var lines = [fmt(n.total, tree.unit) + ' (' + (n.total / cur.total * 100).toFixed(1) + '% of ' + cur.name + ', ' + (n.total / tree.total * 100).toFixed(1) + '% of all)',
      pathOf(n)];
    if (n.children) lines.push(n.children.length + ' items – click to open');
    lines.forEach(function (s) { var d = document.createElement('div'); d.textContent = s; tip.appendChild(d); });
    tip.hidden = false;
  }
  function placeTip(x, y) {
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var nx = x + 14, ny = y + 14;
    if (nx + tw > W - 4) nx = x - tw - 14;
    if (ny + th > H - 4) ny = y - th - 14;
    tip.style.left = Math.max(4, nx) + 'px'; tip.style.top = Math.max(4, ny) + 'px';
  }
  function showTip(n, e) { tipText(n); moveTip(e); }
  function moveTip(e) { var r = stage.getBoundingClientRect(); placeTip(e.clientX - r.left, e.clientY - r.top); }
  function showTipFor(n, c) { tipText(n); placeTip(c.x + 10, c.y + 10); }
  function hideTip() { tip.hidden = true; }

  // ---------- navigation ----------
  function pathIdx(n) { var p = []; while (n.parent) { p.unshift(n.idx); n = n.parent; } return p; }
  function nodeAt(path) { var n = tree; for (var i = 0; i < path.length; i++) { if (!n.children || !n.children[path[i]]) break; n = n.children[path[i]]; } return n; }
  function drill(n) { cur = n; state.path = pathIdx(n); save('path', JSON.stringify(state.path)); afterNav(true); }
  function goUp() { if (cur.parent) { cur = cur.parent; state.path = pathIdx(cur); save('path', JSON.stringify(state.path)); afterNav(true); } }
  function afterNav(announce) {
    hideTip(); renderCrumbs(); render();
    $('upBtn').disabled = !cur.parent;
    if (announce) say('Showing ' + cur.name + ', ' + fmt(cur.total, tree.unit));
  }
  function renderCrumbs() {
    var ol = $('crumbs'); ol.textContent = '';
    var chain = []; for (var n = cur; n; n = n.parent) chain.unshift(n);
    chain.forEach(function (node, i) {
      var li = document.createElement('li');
      if (i === chain.length - 1) { var s = document.createElement('span'); s.textContent = node.name; s.setAttribute('aria-current', 'location'); li.appendChild(s); }
      else { var b = document.createElement('button'); b.type = 'button'; b.textContent = node.name; b.addEventListener('click', function () { drill(node); }); li.appendChild(b); }
      ol.appendChild(li);
    });
  }

  // ---------- datasets ----------
  function setDataset(key, keepPath) {
    var root;
    if (key === CUSTOM_KEY) root = customRoot; else root = prepare(DATASETS[key].root, DATASETS[key].unit);
    if (!root) { key = 'files'; root = prepare(DATASETS.files.root, DATASETS.files.unit); }
    state.key = key; tree = root; cur = keepPath ? nodeAt(state.path) : tree;
    if (!keepPath) state.path = [];
    save('dataset', key); save('path', JSON.stringify(state.path));
    $('datasetSel').value = key;
    afterNav(!keepPath);
  }
  function buildSelect() {
    var sel = $('datasetSel'); sel.textContent = '';
    Object.keys(DATASETS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = DATASETS[k].label; sel.appendChild(o); });
    if (customRoot) { var c = document.createElement('option'); c.value = CUSTOM_KEY; c.textContent = 'Custom JSON: ' + customRoot.name; sel.appendChild(c); }
  }

  // ---------- JSON validation ----------
  function validate(text) {
    var errs = [], count = { n: 0 }, data;
    if (!text.trim()) return { errs: ['Paste some JSON first.'] };
    try { data = JSON.parse(text); }
    catch (e) {
      var m = /position (\d+)/.exec(e.message), where = '';
      if (m) { var pos = +m[1], before = text.slice(0, pos).split('\n'); where = ' (line ' + before.length + ', column ' + (before[before.length - 1].length + 1) + ')'; }
      return { errs: ['Invalid JSON: ' + e.message.replace(/ in JSON at position.*$/, '') + where] };
    }
    function walk(n, path, depth) {
      if (errs.length >= 12) return null;
      if (!n || typeof n !== 'object' || Array.isArray(n)) { errs.push(path + ': expected an object with "name" and "value" or "children".'); return null; }
      if (++count.n > 4000) { errs.push('Too many nodes (limit 4000).'); return null; }
      if (depth > 12) { errs.push(path + ': nesting deeper than 12 levels.'); return null; }
      if (typeof n.name !== 'string' || !n.name.trim()) errs.push(path + ': "name" must be a non-empty string.');
      var out = { name: String(n.name == null ? '?' : n.name).slice(0, 80) };
      var hasKids = n.children !== undefined;
      if (hasKids) {
        if (!Array.isArray(n.children)) errs.push(path + ': "children" must be an array.');
        else if (!n.children.length) errs.push(path + ': "children" is empty; give it a "value" instead.');
        else {
          out.children = [];
          n.children.forEach(function (ch, i) { var c = walk(ch, path + '.children[' + i + ']', depth + 1); if (c) out.children.push(c); });
        }
      } else {
        if (typeof n.value !== 'number' || !isFinite(n.value)) errs.push(path + ': leaf needs a numeric "value".');
        else if (n.value <= 0) errs.push(path + ': "value" must be greater than 0.');
        else out.value = n.value;
      }
      return out;
    }
    var root = walk(data, 'root', 0);
    if (!errs.length && root) { if (typeof data.unit === 'string') root.unit = data.unit.slice(0, 20); return { root: root, errs: [] }; }
    return { errs: errs };
  }
  function showErrors(list, ok) {
    var ul = $('errors'); ul.textContent = ''; ul.className = 'errors' + (ok ? ' ok' : '');
    list.forEach(function (s) { var li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
  }
  $('applyBtn').addEventListener('click', function () {
    var text = $('jsonText').value, res = validate(text);
    if (res.errs.length) { showErrors(res.errs, false); $('jsonText').setAttribute('aria-invalid', 'true'); return; }
    $('jsonText').removeAttribute('aria-invalid');
    customRoot = prepare(res.root, res.root.unit || ''); customRoot.unit = res.root.unit || '';
    save('customJson', text); buildSelect();
    showErrors(['Applied: ' + customRoot.name + ', ' + fmt(customRoot.total, customRoot.unit)], true);
    setDataset(CUSTOM_KEY, false);
  });
  function exportCurrent() {
    var c = clone(tree); c.unit = tree.unit; return JSON.stringify(c, null, 2);
  }
  $('fillBtn').addEventListener('click', function () { $('jsonText').value = exportCurrent(); showErrors(['Copied the current dataset into the editor.'], true); });
  $('jsonBtn').addEventListener('click', function () {
    var p = $('jsonPanel'), open = p.hidden;
    p.hidden = !open; this.setAttribute('aria-expanded', String(open));
    if (open && !$('jsonText').value) $('jsonText').value = exportCurrent();
  });

  // ---------- events ----------
  $('datasetSel').addEventListener('change', function (e) { setDataset(e.target.value, false); });
  $('colorSel').addEventListener('change', function (e) { state.color = e.target.value; save('color', state.color); render(); say('Colouring by ' + (state.color === 'value' ? 'value' : 'category and depth')); });
  $('upBtn').addEventListener('click', goUp);
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'textarea' || tag === 'input' || tag === 'select') return;
    if (e.key === 'Backspace' || e.key === 'Escape') { if (cur.parent) { e.preventDefault(); goUp(); } }
  });
  var rt = null;
  function onResize() { clearTimeout(rt); rt = setTimeout(function () { if (cur) render(); }, 60); }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage); else window.addEventListener('resize', onResize);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { render(); });

  // ---------- init ----------
  (function init() {
    var cj = load('customJson', '');
    if (cj) { var r = validate(cj); if (!r.errs.length) { customRoot = prepare(r.root, r.root.unit || ''); $('jsonText').value = cj; } }
    buildSelect();
    var color = load('color', 'depth'); state.color = color === 'value' ? 'value' : 'depth'; $('colorSel').value = state.color;
    var key = load('dataset', 'files');
    if (key !== CUSTOM_KEY && !DATASETS[key]) key = 'files';
    try { var p = JSON.parse(load('path', '[]')); state.path = Array.isArray(p) ? p.filter(Number.isInteger) : []; } catch (e) { state.path = []; }
    setDataset(key, true);
  })();
})();
