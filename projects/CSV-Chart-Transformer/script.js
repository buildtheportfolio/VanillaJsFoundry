'use strict';
/* ---------- CSV parsing (pure; also exported for Node tests) ---------- */
const DELIMS = [',', ';', '\t', '|'];

function detectDelimiter(text) {
  const sample = text.slice(0, 20000);
  const per = {}, cur = {};
  DELIMS.forEach(d => { per[d] = []; cur[d] = 0; });
  let inQ = false, lines = 0, has = false;
  const endLine = () => {
    if (has) { DELIMS.forEach(d => per[d].push(cur[d])); lines++; }
    DELIMS.forEach(d => { cur[d] = 0; });
    has = false;
  };
  for (let i = 0; i < sample.length && lines < 30; i++) {
    const c = sample[i];
    if (c === '"') { inQ = !inQ; has = true; continue; }
    if (inQ) { has = true; continue; }
    if (c === '\n' || c === '\r') { if (c === '\r' && sample[i + 1] === '\n') i++; endLine(); continue; }
    has = true;
    if (c in cur) cur[c]++;
  }
  if (lines < 30) endLine();
  let best = ',', bestScore = 0;
  for (const d of DELIMS) {
    const counts = per[d];
    if (!counts.length) continue;
    const freq = {};
    counts.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    let mode = 0, modeN = 0;
    for (const k in freq) if (+k > 0 && (freq[k] > modeN || (freq[k] === modeN && +k > mode))) { mode = +k; modeN = freq[k]; }
    if (!mode) continue;
    const score = (modeN / counts.length) * (1 + Math.min(mode, 10) / 10);
    if (score > bestScore + 1e-9) { bestScore = score; best = d; }
  }
  return best;
}

function parseCSV(text, opts) {
  opts = opts || {};
  text = String(text == null ? '' : text);
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const delim = opts.delimiter && opts.delimiter !== 'auto' ? opts.delimiter : detectDelimiter(text);
  const rows = [], rowLines = [], rowOffsets = [], errors = [];
  let errCount = 0;
  const addErr = (line, col, offset, message, severity) => {
    errCount++;
    if (errors.length < 200) errors.push({ line, col, offset, message, severity: severity || 'error' });
  };
  const n = text.length;
  let row = [], field = '', inQ = false, quoted = false, afterQuote = false, afterQuoteReported = false;
  let line = 1, lineStart = 0, rowLine = 1, rowOffset = 0;
  let qLine = 0, qCol = 0, qOffset = 0;
  let i = 0;
  const endRow = () => {
    row.push(field);
    if (!(row.length === 1 && field === '' && !quoted)) {
      rows.push(row); rowLines.push(rowLine); rowOffsets.push(rowOffset);
    }
    row = []; field = ''; quoted = false; afterQuote = false; afterQuoteReported = false;
  };
  while (i < n) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; afterQuote = true; i++; continue;
      }
      if (c === '\n') { line++; lineStart = i + 1; }
      else if (c === '\r' && text[i + 1] !== '\n') { line++; lineStart = i + 1; }
      field += c; i++; continue;
    }
    if (c === '"') {
      if (field === '' && !quoted) {
        inQ = true; quoted = true; qLine = line; qCol = i - lineStart + 1; qOffset = i; i++; continue;
      }
      addErr(line, i - lineStart + 1, i, afterQuote ? 'Unexpected quote after closing quote (use "" for a literal quote)' : 'Stray quote inside an unquoted field (wrap the field in quotes and double the quote)', 'warning');
      field += c; i++; continue;
    }
    if (c === delim) { row.push(field); field = ''; quoted = false; afterQuote = false; afterQuoteReported = false; i++; continue; }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      endRow(); line++; lineStart = i + 1; rowLine = line; rowOffset = i + 1; i++; continue;
    }
    if (afterQuote && !afterQuoteReported) {
      addErr(line, i - lineStart + 1, i, 'Unexpected character after closing quote', 'warning');
      afterQuoteReported = true;
    }
    field += c; i++;
  }
  if (inQ) {
    addErr(qLine, qCol, qOffset, 'Unterminated quoted field (opening quote never closed)', 'error');
  }
  if (field !== '' || row.length > 0 || quoted) endRow();

  // Ragged rows
  const width = rows.length ? rows[0].length : 0;
  for (let r = 1; r < rows.length; r++) {
    const len = rows[r].length;
    if (len !== width) {
      let col = 1;
      if (len > width) col = fieldStartCol(text, rowOffsets[r], delim, width);
      else col = rowEndCol(text, rowOffsets[r]);
      addErr(rowLines[r], col, rowOffsets[r] + col - 1,
        len > width ? 'Row has ' + len + ' fields but the first row has ' + width + ' (extra fields start here)'
                    : 'Row has only ' + len + ' fields but the first row has ' + width,
        'error');
    }
  }
  return { rows, rowLines, rowOffsets, delimiter: delim, errors, errorCount: errCount, width };
}

// 1-based column of the k-th (0-based) field of the record starting at `offset`
function fieldStartCol(text, offset, delim, k) {
  let inQ = false, idx = 0;
  for (let i = offset; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (inQ) continue;
    if (c === delim) { idx++; if (idx === k) return i - offset + 2; }
    else if (c === '\n' || c === '\r') break;
  }
  return 1;
}
function rowEndCol(text, offset) {
  let i = offset;
  while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
  return i - offset + 1;
}

/* ---------- Type inference ---------- */
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MISSING = /^(|na|n\/a|null|nan|none|-|--|\?)$/i;
const RE_NUM = /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const RE_THOUSANDS = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/;
const RE_DECCOMMA = /^[-+]?\d+,\d{1,2}$/;
const RE_ISO = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/;
const RE_YM = /^(\d{4})-(\d{2})$/;
const RE_MDY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;
const RE_NAMED1 = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/;
const RE_NAMED2 = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})$/;

function parseNumber(s) {
  if (typeof s !== 'string') return NaN;
  let t = s.trim();
  if (t === '') return NaN;
  t = t.replace(/^([-+]?)[$€£¥]\s*/, '$1').replace(/\s*%$/, '');
  if (RE_NUM.test(t)) return parseFloat(t);
  if (RE_THOUSANDS.test(t)) return parseFloat(t.replace(/,/g, ''));
  if (RE_DECCOMMA.test(t)) return parseFloat(t.replace(',', '.'));
  return NaN;
}
function monthIndex(name) { return MONTHS.indexOf(name.slice(0, 3).toLowerCase()); }
function validYMD(y, m, d) { return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1000 && y <= 9999; }
// order: 'mdy' | 'dmy' used for ambiguous slashes
function parseDate(s, order) {
  if (typeof s !== 'string') return NaN;
  const t = s.trim();
  let m = RE_ISO.exec(t);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    if (!validYMD(y, mo, d)) return NaN;
    let ms = Date.UTC(y, mo - 1, d, m[4] ? +m[4] : 0, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
    if (m[7] && m[7] !== 'Z') {
      const sign = m[7][0] === '-' ? -1 : 1, hh = +m[7].slice(1, 3), mm = +m[7].slice(-2);
      ms -= sign * (hh * 60 + mm) * 60000;
    }
    return ms;
  }
  m = RE_YM.exec(t);
  if (m && +m[2] >= 1 && +m[2] <= 12) return Date.UTC(+m[1], +m[2] - 1, 1);
  m = RE_MDY.exec(t);
  if (m) {
    let a = +m[1], b = +m[2], y = +m[3];
    if (m[3].length === 2) y += y < 70 ? 2000 : 1900;
    const mo = order === 'dmy' ? b : a, d = order === 'dmy' ? a : b;
    if (!validYMD(y, mo, d)) return NaN;
    return Date.UTC(y, mo - 1, d);
  }
  m = RE_NAMED1.exec(t);
  if (m) { const mo = monthIndex(m[1]); return mo < 0 ? NaN : Date.UTC(+m[3], mo, +m[2]); }
  m = RE_NAMED2.exec(t);
  if (m) { const mo = monthIndex(m[2]); return mo < 0 ? NaN : Date.UTC(+m[3], mo, +m[1]); }
  return NaN;
}
// Decide whether ambiguous a/b/y dates are day-first for a whole column.
function dateOrder(values) {
  for (const v of values) {
    const m = RE_MDY.exec(v.trim());
    if (m && +m[1] > 12) return 'dmy';
  }
  return 'mdy';
}

/** Returns {type, order}. type: integer|float|date|boolean|string|empty */
function inferType(values) {
  const sample = [];
  const step = values.length > 3000 ? values.length / 3000 : 1;
  for (let i = 0; i < values.length; i += step) {
    const v = values[Math.floor(i)];
    if (v != null && !MISSING.test(v.trim())) sample.push(v.trim());
  }
  if (!sample.length) return { type: 'empty', order: 'mdy' };
  const need = Math.max(1, Math.ceil(sample.length * 0.95));
  let ints = 0, nums = 0, bools = 0;
  for (const v of sample) {
    const x = parseNumber(v);
    if (!isNaN(x)) { nums++; if (Number.isInteger(x) && !/[.eE]/.test(v)) ints++; }
    if (/^(true|false|yes|no)$/i.test(v)) bools++;
  }
  if (bools >= need) return { type: 'boolean', order: 'mdy' };
  if (nums >= need) return { type: ints >= need ? 'integer' : 'float', order: 'mdy' };
  const order = dateOrder(sample);
  let dates = 0;
  for (const v of sample) if (!isNaN(parseDate(v, order))) dates++;
  if (dates >= need) return { type: 'date', order };
  return { type: 'string', order: 'mdy' };
}

/* ---------- Table building ---------- */
function looksLikeHeader(rows) {
  if (rows.length < 2) return true;
  const first = rows[0];
  // Header if no cell in the first row is numeric/date and some column below is numeric/date
  const anyData = first.some(v => !isNaN(parseNumber(v)) || !isNaN(parseDate(v, 'mdy')));
  if (anyData) return false;
  return true;
}
function buildTable(rows, headerMode) {
  if (!rows.length) return { headers: [], cols: [], types: [], orders: [], nRows: 0, headerUsed: false };
  const hasHeader = headerMode === 'yes' || (headerMode !== 'no' && looksLikeHeader(rows));
  const width = Math.max.apply(null, rows.slice(0, 200).map(r => r.length));
  const body = hasHeader ? rows.slice(1) : rows;
  const seen = {};
  const headers = [];
  for (let c = 0; c < width; c++) {
    let h = hasHeader ? String(rows[0][c] == null ? '' : rows[0][c]).trim() : '';
    if (!h) h = 'Column ' + (c + 1);
    if (seen[h]) { seen[h]++; h = h + ' (' + seen[h] + ')'; } else seen[h] = 1;
    headers.push(h);
  }
  const cols = [], types = [], orders = [];
  for (let c = 0; c < width; c++) {
    const col = new Array(body.length);
    for (let r = 0; r < body.length; r++) { const v = body[r][c]; col[r] = v == null ? '' : v; }
    const t = inferType(col);
    cols.push(col); types.push(t.type); orders.push(t.order);
  }
  return { headers, cols, types, orders, nRows: body.length, headerUsed: hasHeader, firstRowNumber: hasHeader ? 2 : 1 };
}
// Convert a column to numbers (numbers, dates -> ms, booleans -> 0/1); NaN when missing
function numericColumn(table, c) {
  const col = table.cols[c], type = table.types[c], out = new Float64Array(col.length);
  for (let i = 0; i < col.length; i++) {
    const v = col[i];
    if (type === 'date') out[i] = parseDate(v, table.orders[c]);
    else if (type === 'boolean') out[i] = /^(true|yes)$/i.test(v.trim()) ? 1 : /^(false|no)$/i.test(v.trim()) ? 0 : NaN;
    else out[i] = parseNumber(v);
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseCSV, detectDelimiter, inferType, parseNumber, parseDate, buildTable, numericColumn };
}

/* ---------- UI ---------- */
if (typeof document !== 'undefined') (function () {
  const $ = id => document.getElementById(id);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const STORE = 'csv-chart-transformer:v1';
  const COLORS = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'];
  const TYPES = [['bar', 'Bar'], ['line', 'Line'], ['scatter', 'Scatter'], ['pie', 'Pie']];
  const MAX_TEXT = 12 * 1024 * 1024;

  /* sample data */
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function bigSample() {
    const rnd = seeded(42), out = ['date,temperature,humidity,sensor'];
    let t = 12, h = 60;
    const start = Date.UTC(2023, 0, 1);
    for (let i = 0; i < 10000; i++) {
      t += (rnd() - 0.5) * 0.8 + Math.sin(i / 365) * 0.05;
      h += (rnd() - 0.5) * 2; h = Math.max(20, Math.min(95, h));
      const d = new Date(start + i * 3600000 * 2);
      out.push(d.toISOString().slice(0, 16).replace('T', ' ') + ',' + t.toFixed(2) + ',' + h.toFixed(1) + ',"S-' + (i % 4 + 1) + '"');
    }
    return out.join('\n');
  }
  const SAMPLES = [
    { id: 'sales', name: 'Monthly sales (dates, line)', text: 'month,revenue,costs,profit\n2024-01-01,12400,9100,3300\n2024-02-01,13850,9400,4450\n2024-03-01,15200,10100,5100\n2024-04-01,14100,9900,4200\n2024-05-01,16800,10800,6000\n2024-06-01,18250,11400,6850\n2024-07-01,17900,11200,6700\n2024-08-01,19400,12000,7400\n2024-09-01,20100,12600,7500\n2024-10-01,21800,13100,8700\n2024-11-01,24300,14200,10100\n2024-12-01,27900,15600,12300\n' },
    { id: 'fruit', name: 'Fruit stand (categories, bar / pie)', text: 'fruit,kilos sold,price per kilo\nApples,420,2.5\nBananas,380,1.8\nCherries,95,9.2\nDates,60,7.5\nElderberries,22,12\nFigs,48,8.4\nGrapes,260,4.1\nKiwis,140,3.6\n' },
    { id: 'iris', name: 'Plants (numeric scatter)', text: 'height_cm,leaf_width_mm,species\n12.1,4.2,A\n13.4,4.9,A\n11.8,4.1,A\n14.0,5.2,A\n13.1,4.8,A\n25.3,9.1,B\n27.8,9.9,B\n24.9,8.7,B\n29.0,10.4,B\n26.4,9.5,B\n38.2,14.1,C\n40.6,15.2,C\n36.9,13.5,C\n42.1,15.9,C\n39.3,14.6,C\n' },
    { id: 'quoted', name: 'Tricky quoting (commas, quotes, newlines)', text: 'city,notes,population\r\n"Paris, France","The ""City of Light""",2161000\r\n"New York","Line one\nline two",8336000\r\nTokyo,plain,13960000\r\n"Sao Paulo","has ""quotes"" and, commas",12330000\r\n' },
    { id: 'semi', name: 'European format (semicolon, decimal comma)', text: 'land;bevolking;bbp per hoofd\nNederland;17,6;58,2\nBelgie;11,6;51,7\nDuitsland;83,2;54,3\nFrankrijk;67,8;45,2\nSpanje;47,4;32,1\nItalie;59,0;38,4\n' },
    { id: 'errors', name: 'Messy file with errors (see the report)', text: 'name,score,grade\nAda,91,A\nBen,78\nCy,85,B,extra\n"Dee,66,C\nEli,70,C\n' },
    { id: 'big', name: '10,000 rows (generated, line)', text: null }
  ];

  const state = {
    text: '', delimiter: 'auto', header: 'auto', type: 'line', x: -1, ys: [], agg: 'none', sample: 'sales',
    sig: ''
  };
  let parsed = null, table = null, cursor = -1, hits = [], pieSlices = [];

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && typeof s === 'object') {
        for (const k of ['text', 'delimiter', 'header', 'type', 'agg', 'sample', 'sig']) if (typeof s[k] === 'string') state[k] = s[k];
        if (Number.isInteger(s.x)) state.x = s.x;
        if (Array.isArray(s.ys)) state.ys = s.ys.filter(Number.isInteger);
      }
    } catch (e) { /* storage blocked or corrupt */ }
  }
  let saveT = 0;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try {
        const copy = Object.assign({}, state);
        if (copy.text.length > 400000) copy.text = '';
        localStorage.setItem(STORE, JSON.stringify(copy));
      } catch (e) { /* quota/blocked */ }
    }, 300);
  }

  /* ---- setup controls ---- */
  const csv = $('csv'), statusEl = $('status');
  SAMPLES.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; $('sample').appendChild(o); });
  const customOpt = document.createElement('option'); customOpt.value = 'custom'; customOpt.textContent = 'Your own data'; $('sample').appendChild(customOpt);
  TYPES.forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.dataset.type = id; b.textContent = label;
    b.addEventListener('click', () => { state.type = id; refreshChart(); save(); });
    b.addEventListener('keydown', e => {
      const i = TYPES.findIndex(t => t[0] === state.type);
      let ni = i;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') ni = (i + 1) % TYPES.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ni = (i + TYPES.length - 1) % TYPES.length;
      else return;
      e.preventDefault(); state.type = TYPES[ni][0]; refreshChart(); save();
      $('types').querySelector('[data-type="' + state.type + '"]').focus();
    });
    $('types').appendChild(b);
  });

  /* ---- pipeline: text -> parse -> table -> controls -> chart ---- */
  let parseTimer = 0;
  function scheduleParse() { clearTimeout(parseTimer); parseTimer = setTimeout(runParse, csv.value.length > 200000 ? 250 : 60); }
  function runParse() {
    state.text = csv.value;
    const t0 = performance.now();
    parsed = parseCSV(state.text, { delimiter: state.delimiter });
    table = buildTable(parsed.rows, state.header);
    const ms = Math.round(performance.now() - t0);
    renderStatus(ms);
    renderErrors();
    syncControls();
    renderPreview();
    refreshChart();
    save();
  }
  function delimName(d) { return d === '\t' ? 'tab' : d === ',' ? 'comma' : d === ';' ? 'semicolon' : 'pipe'; }
  function renderStatus(ms) {
    if (!state.text.trim()) { statusEl.textContent = 'Paste some CSV, pick a sample, or drop a file to begin.'; return; }
    const ne = parsed.errors.filter(e => e.severity === 'error').length, nw = parsed.errorCount - ne;
    statusEl.textContent = table.nRows.toLocaleString() + ' rows x ' + table.headers.length + ' columns, ' + delimName(parsed.delimiter) +
      '-separated' + (table.headerUsed ? ', header detected' : ', no header') + ' (parsed in ' + ms + ' ms)' +
      (parsed.errorCount ? '. ' + parsed.errorCount + ' issue' + (parsed.errorCount === 1 ? '' : 's') + ' found.' : '. No problems found.');
    void ne; void nw;
  }
  function renderErrors() {
    const ul = $('errors'); ul.textContent = '';
    $('errors-wrap').hidden = !parsed.errors.length;
    parsed.errors.slice(0, 100).forEach(er => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = er.severity === 'warning' ? 'warn' : '';
      b.textContent = (er.severity === 'warning' ? 'Warning' : 'Error') + ' at row ' + er.line + ', column ' + er.col + ': ' + er.message;
      b.addEventListener('click', () => {
        csv.focus();
        try { csv.setSelectionRange(er.offset, Math.min(er.offset + 1, csv.value.length)); } catch (e) { /* ignore */ }
        const before = csv.value.slice(0, er.offset).split('\n').length - 1;
        csv.scrollTop = Math.max(0, before * 19 - 80);
      });
      li.appendChild(b); ul.appendChild(li);
    });
    if (parsed.errorCount > 100) {
      const li = document.createElement('li'); li.textContent = '... and ' + (parsed.errorCount - 100) + ' more.'; ul.appendChild(li);
    }
  }
  function isNumericType(t) { return t === 'integer' || t === 'float' || t === 'boolean' || t === 'date'; }
  function isYType(t) { return t === 'integer' || t === 'float'; }

  function syncControls() {
    const heads = table.headers;
    const sig = heads.join('\u0001') + '|' + table.types.join(',');
    const xs = $('xcol'); xs.textContent = '';
    heads.forEach((h, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = h + ' (' + table.types[i] + ')'; xs.appendChild(o); });
    const rowOpt = document.createElement('option'); rowOpt.value = '-1'; rowOpt.textContent = 'Row number'; xs.appendChild(rowOpt);
    if (sig !== state.sig || state.x >= heads.length) {
      // new shape of data: suggest sensible defaults
      state.sig = sig;
      const di = table.types.indexOf('date'), si = table.types.indexOf('string');
      const numCols = table.types.map((t, i) => isYType(t) ? i : -1).filter(i => i >= 0);
      if (di >= 0) { state.x = di; state.type = 'line'; }
      else if (si >= 0) { state.x = si; state.type = 'bar'; }
      else if (numCols.length > 1) { state.x = numCols[0]; state.type = 'scatter'; }
      else { state.x = -1; state.type = 'line'; }
      state.ys = numCols.filter(i => i !== state.x).slice(0, di >= 0 || si >= 0 ? 2 : 1);
      if (di < 0 && si < 0 && numCols.length > 1) state.ys = [numCols[1]];
      state.agg = 'none';
    }
    xs.value = String(state.x);
    if (xs.value !== String(state.x)) xs.value = '-1';
    $('agg').value = state.agg;
    const yc = $('ycols'); yc.textContent = '';
    let any = false;
    heads.forEach((h, i) => {
      if (!isYType(table.types[i])) return;
      any = true;
      const lab = document.createElement('label'), cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = state.ys.includes(i);
      cb.addEventListener('change', () => {
        state.ys = state.ys.filter(v => v !== i);
        if (cb.checked) state.ys.push(i);
        state.ys.sort((a, b) => a - b);
        refreshChart(); save();
      });
      const sw = document.createElement('span'); sw.className = 'sw';
      const k = state.ys.indexOf(i);
      sw.style.background = cssVar(COLORS[(k >= 0 ? k : 0) % COLORS.length]);
      if (k < 0) sw.style.opacity = '0.25';
      lab.append(cb, sw, document.createTextNode(h));
      yc.appendChild(lab);
    });
    if (!any) { const s = document.createElement('span'); s.className = 'none'; s.textContent = 'No numeric columns detected yet.'; yc.appendChild(s); }
    $('delim').value = state.delimiter; $('header').value = state.header;
    $('sample').value = state.sample;
  }
  $('xcol').addEventListener('change', e => { state.x = +e.target.value; refreshChart(); save(); });
  $('agg').addEventListener('change', e => { state.agg = e.target.value; refreshChart(); save(); });
  $('delim').addEventListener('change', e => { state.delimiter = e.target.value; runParse(); });
  $('header').addEventListener('change', e => { state.header = e.target.value; runParse(); });
  $('clear').addEventListener('click', () => { setText('', 'custom'); csv.focus(); });
  $('sample').addEventListener('change', e => {
    const s = SAMPLES.find(x => x.id === e.target.value);
    if (s) { state.delimiter = 'auto'; state.header = 'auto'; setText(s.text == null ? bigSample() : s.text, s.id); }
  });
  function setText(t, sampleId) {
    csv.value = t; state.sample = sampleId; state.sig = ''; csv.scrollTop = 0; runParse();
  }
  csv.addEventListener('input', () => { if (state.sample !== 'custom') { state.sample = 'custom'; $('sample').value = 'custom'; } scheduleParse(); });

  /* ---- file load ---- */
  function readFile(file) {
    if (!file) return;
    if (file.size > MAX_TEXT) { statusEl.textContent = 'That file is ' + (file.size / 1048576).toFixed(1) + ' MB; the limit is 12 MB.'; return; }
    const fr = new FileReader();
    fr.onload = () => { state.delimiter = file.name.toLowerCase().endsWith('.tsv') ? '\t' : 'auto'; setText(String(fr.result), 'custom'); statusEl.textContent = 'Loaded ' + file.name + '. ' + statusEl.textContent; };
    fr.onerror = () => { statusEl.textContent = 'Could not read that file.'; };
    fr.readAsText(file);
  }
  $('file').addEventListener('change', e => { readFile(e.target.files[0]); e.target.value = ''; });
  const dz = $('dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
  dz.addEventListener('drop', e => { readFile(e.dataTransfer.files[0]); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); if (e.target !== csv && !dz.contains(e.target)) readFile(e.dataTransfer.files[0]); });

  /* ---- preview ---- */
  function renderPreview() {
    const tb = $('preview');
    while (tb.lastChild && tb.lastChild.tagName !== 'CAPTION') tb.removeChild(tb.lastChild);
    if (!table.headers.length) { $('pv-meta').textContent = ''; return; }
    const shown = Math.min(table.nRows, 100);
    $('pv-meta').textContent = '(showing ' + shown + ' of ' + table.nRows.toLocaleString() + ' rows)';
    const thead = document.createElement('thead'), hr = document.createElement('tr');
    const th0 = document.createElement('th'); th0.className = 'rn'; th0.scope = 'col'; th0.textContent = '#'; hr.appendChild(th0);
    table.headers.forEach((h, i) => {
      const th = document.createElement('th'); th.scope = 'col'; th.title = h;
      th.appendChild(document.createTextNode(h));
      const ty = document.createElement('span'); ty.className = 'ty'; ty.textContent = table.types[i]; th.appendChild(ty);
      hr.appendChild(th);
    });
    thead.appendChild(hr); tb.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (let r = 0; r < shown; r++) {
      const tr = document.createElement('tr');
      const td0 = document.createElement('td'); td0.className = 'rn'; td0.textContent = String(r + 1); tr.appendChild(td0);
      for (let c = 0; c < table.headers.length; c++) {
        const td = document.createElement('td'), v = table.cols[c][r];
        td.textContent = v;
        td.title = v;
        if (isYType(table.types[c])) td.className = 'num';
        if (MISSING.test(v.trim())) td.classList.add('missing');
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tb.appendChild(tbody);
  }

  /* ---- chart ---- */
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
  function el(tag, attrs, text) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
  function fmtNum(v, step) {
    if (!isFinite(v)) return '';
    if (Math.abs(v) >= 10000) return compact.format(v);
    const dec = step && step < 1 ? Math.min(6, Math.ceil(-Math.log10(step))) : (Number.isInteger(v) ? 0 : 2);
    return v.toLocaleString('en', { maximumFractionDigits: dec, minimumFractionDigits: 0 });
  }
  function fmtDate(ms, span) {
    const d = new Date(ms), iso = d.toISOString();
    if (span > 2 * 365 * 86400000) return iso.slice(0, 4);
    if (span > 60 * 86400000) return iso.slice(0, 7);
    if (span > 2 * 86400000) return iso.slice(0, 10);
    return iso.slice(5, 16).replace('T', ' ');
  }
  function niceScale(min, max, count) {
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (min === max) { min -= 1; max += 1; }
    const raw = (max - min) / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), err = raw / mag;
    const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
    const lo = Math.floor(min / step + 1e-9) * step, hi = Math.ceil(max / step - 1e-9) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
    return { min: lo, max: hi, step, ticks };
  }
  function aggregate(keys, ysData, mode) {
    const map = new Map(), order = [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      let g = map.get(k);
      if (!g) { g = { key: k, n: 0, sums: ysData.map(() => 0), cnts: ysData.map(() => 0) }; map.set(k, g); order.push(g); }
      g.n++;
      ysData.forEach((y, j) => { const v = y[i]; if (!isNaN(v)) { g.sums[j] += v; g.cnts[j]++; } });
    }
    return order.map(g => ({
      key: g.key,
      vals: g.sums.map((s, j) => mode === 'count' ? g.n : mode === 'mean' ? (g.cnts[j] ? s / g.cnts[j] : NaN) : s)
    }));
  }

  const W = 800, H = 440, M = { l: 62, r: 18, t: 16, b: 58 };
  let lastSvg = null;

  function buildModel() {
    if (!table || !table.nRows) return { error: 'No data to chart yet. Paste CSV on the left or choose a sample.' };
    const ys = state.ys.filter(i => i < table.types.length && isYType(table.types[i]));
    const type = state.type;
    if (!ys.length && state.agg !== 'count') return { error: 'Tick at least one numeric Y column to draw a chart.' };
    const xi = state.x < 0 || state.x >= table.headers.length ? -1 : state.x;
    const yData = ys.map(i => numericColumn(table, i));
    const yNames = ys.map(i => table.headers[i]);
    const xType = xi < 0 ? 'index' : table.types[xi];
    const xName = xi < 0 ? 'Row number' : table.headers[xi];
    const n = table.nRows;
    let xNum = null, xLab = null;
    if (xi < 0) { xNum = new Float64Array(n); for (let i = 0; i < n; i++) xNum[i] = i + 1; }
    else if (xType === 'integer' || xType === 'float' || xType === 'date') xNum = numericColumn(table, xi);
    else xLab = table.cols[xi];
    return { type, xi, xType, xName, xNum, xLab, yData, yNames, ys, n, agg: state.agg };
  }

  function refreshChart() {
    const host = $('chart');
    host.textContent = ''; $('legend').textContent = ''; $('chart-note').textContent = '';
    $('tip').hidden = true; hits = []; pieSlices = []; cursor = -1; lastSvg = null;
    $('types').querySelectorAll('button').forEach(b => { const on = b.dataset.type === state.type; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
    $('agg-wrap').style.display = state.type === 'scatter' || state.type === 'line' ? 'none' : '';
    $('dl-svg').disabled = $('dl-png').disabled = true;
    const m = table ? buildModel() : { error: 'Loading...' };
    if (m.error) {
      const d = document.createElement('div'); d.className = 'empty'; d.textContent = m.error; host.appendChild(d); return;
    }
    let result;
    try { result = state.type === 'pie' ? drawPie(m) : state.type === 'bar' ? drawBar(m) : drawXY(m); }
    catch (err) { const d = document.createElement('div'); d.className = 'empty'; d.textContent = 'Could not draw this chart: ' + err.message; host.appendChild(d); return; }
    if (result.error) { const d = document.createElement('div'); d.className = 'empty'; d.textContent = result.error; host.appendChild(d); return; }
    const svg = result.svg;
    svg.setAttribute('tabindex', '0');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', result.label + ' Use left and right arrow keys to read data points; the preview table below has all values.');
    host.appendChild(svg); lastSvg = svg;
    hits = result.hits || []; pieSlices = result.slices || [];
    $('chart-note').textContent = result.note || '';
    $('dl-svg').disabled = $('dl-png').disabled = false;
    const lg = $('legend');
    (result.legend || []).forEach(it => {
      const s = document.createElement('span'), i = document.createElement('i'); i.style.background = it.color;
      s.append(i, document.createTextNode(it.name)); lg.appendChild(s);
    });
    wireChartEvents(svg);
  }

  function frame(m, theme) {
    const svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, xmlns: SVGNS, 'font-family': 'system-ui, sans-serif', 'font-size': 12 });
    svg.appendChild(el('rect', { width: W, height: H, fill: theme.bg }));
    return svg;
  }
  function themeNow() {
    return { bg: cssVar('--panel'), text: cssVar('--text'), axis: cssVar('--chart-axis'), grid: cssVar('--chart-grid'), colors: COLORS.map(cssVar) };
  }

  // Line + scatter
  function drawXY(m) {
    const th = themeNow(), svg = frame(m, th), pw = W - M.l - M.r, ph = H - M.t - M.b;
    const isLine = m.type === 'line';
    // order points by x for lines
    const n = m.n;
    let xs, xKind;
    if (m.xNum) { xs = m.xNum; xKind = m.xType === 'date' ? 'date' : 'num'; }
    else {
      // categorical X: map labels to index positions
      const idx = new Map(); xs = new Float64Array(n);
      for (let i = 0; i < n; i++) { const k = m.xLab[i]; if (!idx.has(k)) idx.set(k, idx.size + 1); xs[i] = idx.get(k); }
      xKind = 'cat'; m.catLabels = Array.from(idx.keys());
    }
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i < n; i++) { const x = xs[i]; if (x < xmin) xmin = x; if (x > xmax) xmax = x; }
    m.yData.forEach(y => { for (let i = 0; i < n; i++) { const v = y[i]; if (v < ymin) ymin = v; if (v > ymax) ymax = v; } });
    if (!isFinite(xmin) || !isFinite(ymin)) return { error: 'The chosen columns contain no plottable numbers.' };
    const ysc = niceScale(ymin, ymax, 6);
    if (xmin === xmax) { xmin -= 1; xmax += 1; }
    const xpad = xKind === 'cat' ? 0.5 : 0;
    const x0 = xmin - xpad, x1 = xmax + xpad;
    const sx = v => M.l + (v - x0) / (x1 - x0) * pw;
    const sy = v => M.t + ph - (v - ysc.min) / (ysc.max - ysc.min) * ph;
    // grid + axes
    ysc.ticks.forEach(t => {
      svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: sy(t), y2: sy(t), stroke: th.grid }));
      svg.appendChild(el('text', { x: M.l - 8, y: sy(t) + 4, 'text-anchor': 'end', fill: th.axis }, fmtNum(t, ysc.step)));
    });
    svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: M.t + ph, y2: M.t + ph, stroke: th.axis }));
    const xticks = [];
    if (xKind === 'cat') {
      const k = Math.max(1, Math.ceil(m.catLabels.length / Math.floor(pw / 70)));
      m.catLabels.forEach((l, i) => { if (i % k === 0) xticks.push({ v: i + 1, label: l.length > 12 ? l.slice(0, 11) + '…' : l }); });
    } else {
      const cnt = Math.min(8, Math.max(2, Math.floor(pw / 90)));
      if (xKind === 'date') for (let i = 0; i <= cnt; i++) { const v = xmin + (xmax - xmin) * i / cnt; xticks.push({ v, label: fmtDate(v, xmax - xmin) }); }
      else { const sc = niceScale(xmin, xmax, cnt); sc.ticks.forEach(t => { if (t >= xmin - 1e-9 && t <= xmax + 1e-9) xticks.push({ v: t, label: fmtNum(t, sc.step) }); }); }
    }
    xticks.forEach(t => {
      svg.appendChild(el('line', { x1: sx(t.v), x2: sx(t.v), y1: M.t + ph, y2: M.t + ph + 4, stroke: th.axis }));
      svg.appendChild(el('text', { x: sx(t.v), y: M.t + ph + 18, 'text-anchor': 'middle', fill: th.axis }, t.label));
    });
    svg.appendChild(el('text', { x: M.l + pw / 2, y: H - 10, 'text-anchor': 'middle', fill: th.text, 'font-weight': 600 }, m.xName));
    const ylab = el('text', { x: 14, y: M.t + ph / 2, 'text-anchor': 'middle', fill: th.text, 'font-weight': 600, transform: 'rotate(-90 14 ' + (M.t + ph / 2) + ')' }, m.yNames.length === 1 ? m.yNames[0] : 'Value');
    svg.appendChild(ylab);

    const legend = [], outHits = [];
    let note = '';
    m.yData.forEach((y, si) => {
      const color = th.colors[si % th.colors.length];
      legend.push({ name: m.yNames[si], color });
      // collect valid points
      let pts = [];
      for (let i = 0; i < n; i++) { const xv = xs[i], yv = y[i]; if (!isNaN(xv) && !isNaN(yv)) pts.push(i); }
      if (isLine) pts.sort((a, b) => xs[a] - xs[b] || a - b);
      if (isLine && pts.length > 1600) {
        // min/max decimation per bucket keeps spikes visible
        const buckets = 700, size = pts.length / buckets, out = [];
        for (let b = 0; b < buckets; b++) {
          const s = Math.floor(b * size), e = Math.min(pts.length, Math.floor((b + 1) * size));
          if (s >= e) continue;
          let lo = s, hi = s;
          for (let k = s; k < e; k++) { if (y[pts[k]] < y[pts[lo]]) lo = k; if (y[pts[k]] > y[pts[hi]]) hi = k; }
          if (lo === hi) out.push(pts[lo]); else if (lo < hi) out.push(pts[lo], pts[hi]); else out.push(pts[hi], pts[lo]);
        }
        note = 'Line downsampled from ' + pts.length.toLocaleString() + ' to ' + out.length.toLocaleString() + ' points (min/max per bucket) for speed.';
        pts = out;
      }
      if (isLine) {
        let d = '';
        pts.forEach((i, k) => { d += (k ? 'L' : 'M') + sx(xs[i]).toFixed(1) + ' ' + sy(y[i]).toFixed(1); });
        if (d) svg.appendChild(el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round' }));
        if (pts.length <= 60) pts.forEach(i => svg.appendChild(el('circle', { cx: sx(xs[i]), cy: sy(y[i]), r: 3, fill: color })));
      } else {
        let d = '';
        pts.forEach(i => { d += 'M' + sx(xs[i]).toFixed(1) + ' ' + sy(y[i]).toFixed(1) + 'h0'; });
        const dotSize = pts.length > 2000 ? 3 : pts.length > 200 ? 5 : 8;
        if (d) svg.appendChild(el('path', { d, fill: 'none', stroke: color, 'stroke-width': dotSize, 'stroke-linecap': 'round', 'stroke-opacity': pts.length > 500 ? 0.55 : 0.85 }));
      }
      pts.forEach(i => outHits.push({ px: sx(xs[i]), py: sy(y[i]), color, series: m.yNames[si], x: xKind === 'cat' ? m.catLabels[xs[i] - 1] : xKind === 'date' ? fmtDate(xs[i], 0).slice(0, 16) : fmtNum(xs[i]), xLabel: m.xName, y: y[i] }));
    });
    outHits.sort((a, b) => a.px - b.px || a.py - b.py);
    svg.dataset.mode = 'xy';
    const label = (isLine ? 'Line' : 'Scatter') + ' chart of ' + m.yNames.join(', ') + ' against ' + m.xName + ', ' + n.toLocaleString() + ' rows.';
    return { svg, hits: outHits, label, note, legend, plot: { x: M.l, y: M.t, w: pw, h: ph } };
  }

  // Bar
  function drawBar(m) {
    const th = themeNow(), svg = frame(m, th), pw = W - M.l - M.r, ph = H - M.t - M.b;
    let cats, series;
    const count = m.agg === 'count';
    const yData = count && !m.yData.length ? [new Float64Array(m.n).fill(1)] : m.yData;
    const yNames = count && !m.ys.length ? ['count'] : m.yNames;
    let keys;
    if (m.xLab) keys = m.xLab;
    else { keys = new Array(m.n); const isDate = m.xType === 'date'; for (let i = 0; i < m.n; i++) keys[i] = isDate ? fmtDate(m.xNum[i], 0).slice(0, 10) : fmtNum(m.xNum[i]); }
    let note = '';
    if (m.agg !== 'none') {
      let g = aggregate(keys, yData, m.agg);
      if (m.xNum && m.xType !== 'index') { const first = new Map(); keys.forEach((k, i) => { if (!first.has(k)) first.set(k, m.xNum[i]); }); g.sort((a, b) => first.get(a.key) - first.get(b.key)); }
      cats = g.map(x => x.key); series = yData.map((_, j) => g.map(x => x.vals[j]));
    } else {
      let idxs = [];
      for (let i = 0; i < m.n; i++) idxs.push(i);
      if (idxs.length > 300) { note = 'Showing the first 300 of ' + m.n.toLocaleString() + ' rows. Turn on Aggregate X to summarise everything.'; idxs = idxs.slice(0, 300); }
      cats = idxs.map(i => keys[i]); series = yData.map(y => idxs.map(i => y[i]));
    }
    if (cats.length > 300) { note = 'Showing the first 300 of ' + cats.length + ' categories.'; cats = cats.slice(0, 300); series = series.map(s => s.slice(0, 300)); }
    let ymin = 0, ymax = 0;
    series.forEach(s => s.forEach(v => { if (v < ymin) ymin = v; if (v > ymax) ymax = v; }));
    if (ymin === 0 && ymax === 0) ymax = 1;
    const ysc = niceScale(ymin, ymax, 6);
    const sy = v => M.t + ph - (v - ysc.min) / (ysc.max - ysc.min) * ph;
    ysc.ticks.forEach(t => {
      svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: sy(t), y2: sy(t), stroke: th.grid }));
      svg.appendChild(el('text', { x: M.l - 8, y: sy(t) + 4, 'text-anchor': 'end', fill: th.axis }, fmtNum(t, ysc.step)));
    });
    const band = pw / cats.length, groupW = band * 0.78, barW = groupW / series.length;
    const outHits = [], legend = [];
    const zeroY = sy(0);
    series.forEach((s, si) => {
      const color = th.colors[si % th.colors.length];
      legend.push({ name: yNames[si], color });
      let d = '';
      s.forEach((v, ci) => {
        if (isNaN(v)) return;
        const x = M.l + ci * band + (band - groupW) / 2 + si * barW, y = sy(v);
        const top = Math.min(y, zeroY), h = Math.max(1, Math.abs(zeroY - y));
        d += 'M' + x.toFixed(1) + ' ' + top.toFixed(1) + 'h' + Math.max(1, barW - (barW > 4 ? 1 : 0)).toFixed(1) + 'v' + h.toFixed(1) + 'h-' + Math.max(1, barW - (barW > 4 ? 1 : 0)).toFixed(1) + 'z';
        outHits.push({ px: x + barW / 2, py: y, color, series: yNames[si], x: cats[ci], xLabel: m.xName, y: v, ci });
      });
      svg.appendChild(el('path', { d, fill: color }));
    });
    svg.appendChild(el('line', { x1: M.l, x2: W - M.r, y1: zeroY, y2: zeroY, stroke: th.axis }));
    const k = Math.max(1, Math.ceil(cats.length / Math.max(1, Math.floor(pw / 60))));
    cats.forEach((c, i) => {
      if (i % k) return;
      const x = M.l + i * band + band / 2, lab = c.length > 11 ? c.slice(0, 10) + '…' : c;
      const t = el('text', { x, y: M.t + ph + 16, 'text-anchor': k === 1 && cats.length > 8 ? 'end' : 'middle', fill: th.axis, transform: k === 1 && cats.length > 8 ? 'rotate(-35 ' + x + ' ' + (M.t + ph + 16) + ')' : '' }, lab);
      svg.appendChild(t);
    });
    svg.appendChild(el('text', { x: M.l + pw / 2, y: H - 8, 'text-anchor': 'middle', fill: th.text, 'font-weight': 600 }, m.xName + (m.agg !== 'none' ? ' (' + m.agg + ')' : '')));
    svg.appendChild(el('text', { x: 14, y: M.t + ph / 2, 'text-anchor': 'middle', fill: th.text, 'font-weight': 600, transform: 'rotate(-90 14 ' + (M.t + ph / 2) + ')' }, yNames.length === 1 ? yNames[0] : 'Value'));
    outHits.sort((a, b) => a.px - b.px);
    return { svg, hits: outHits, label: 'Bar chart of ' + yNames.join(', ') + ' by ' + m.xName + ', ' + cats.length + ' categories.', note, legend };
  }

  // Pie
  function drawPie(m) {
    const th = themeNow(), svg = frame(m, th);
    if (!m.yData.length && m.agg !== 'count') return { error: 'Tick one numeric Y column for the pie.' };
    const y = m.yData.length ? m.yData[0] : new Float64Array(m.n).fill(1);
    const name = m.yData.length ? m.yNames[0] : 'count';
    let keys;
    if (m.xLab) keys = m.xLab;
    else { keys = new Array(m.n); for (let i = 0; i < m.n; i++) keys[i] = m.xType === 'date' ? fmtDate(m.xNum[i], 0).slice(0, 10) : fmtNum(m.xNum[i]); }
    const mode = m.agg === 'none' ? 'sum' : m.agg;
    let g = aggregate(keys, [y], mode).map(x => ({ key: x.key, v: x.vals[0] })).filter(x => x.v > 0 && isFinite(x.v));
    if (!g.length) return { error: 'The pie needs positive values; the chosen column has none.' };
    g.sort((a, b) => b.v - a.v);
    let note = '';
    if (g.length > 10) {
      const rest = g.slice(9), sum = rest.reduce((s, x) => s + x.v, 0);
      g = g.slice(0, 9); g.push({ key: 'Other (' + rest.length + ')', v: sum });
      note = 'Smallest slices were merged into "Other".';
    }
    const total = g.reduce((s, x) => s + x.v, 0);
    const cx = W / 2, cy = H / 2, r = Math.min(H / 2 - 24, W / 2 - 24);
    let a0 = -Math.PI / 2;
    const slices = [], legend = [];
    g.forEach((s, i) => {
      const frac = s.v / total, a1 = a0 + frac * Math.PI * 2, color = th.colors[i % th.colors.length];
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a, rr) => (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
      const d = frac >= 0.9999 ? 'M' + (cx - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0z'
        : 'M' + cx + ' ' + cy + 'L' + p(a0, r) + 'A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p(a1, r) + 'Z';
      const path = el('path', { d, fill: color, stroke: th.bg, 'stroke-width': 2 });
      svg.appendChild(path);
      const mid = (a0 + a1) / 2;
      if (frac > 0.05) svg.appendChild(el('text', { x: cx + Math.cos(mid) * r * 0.65, y: cy + Math.sin(mid) * r * 0.65 + 4, 'text-anchor': 'middle', fill: '#fff', 'font-weight': 700, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.45)', 'stroke-width': 3 }, (frac * 100).toFixed(frac < 0.1 ? 1 : 0) + '%'));
      slices.push({ path, key: s.key, v: s.v, frac, color, px: cx + Math.cos(mid) * r * 0.65, py: cy + Math.sin(mid) * r * 0.65 });
      legend.push({ name: s.key + ' (' + (frac * 100).toFixed(1) + '%)', color });
      a0 = a1;
    });
    return { svg, slices, label: 'Pie chart of ' + name + ' (' + mode + ') by ' + m.xName + ', ' + g.length + ' slices.', note, legend };
  }

  /* ---- interaction on chart ---- */
  const tip = $('tip');
  function showTip(svg, px, py, html) {
    const box = svg.getBoundingClientRect(), host = $('chart').getBoundingClientRect();
    const sx = box.width / W;
    tip.textContent = html; tip.hidden = false;
    let left = (box.left - host.left) + px * sx + 12, top = (box.top - host.top) + py * sx - 10;
    if (left + 230 > host.width) left = Math.max(0, left - 250);
    tip.style.left = left + 'px'; tip.style.top = Math.max(0, top) + 'px';
  }
  let marker = null, raf = 0;
  function clearMarker() { if (marker) { marker.remove(); marker = null; } }
  function focusHit(svg, h) {
    clearMarker();
    marker = el('circle', { cx: h.px, cy: h.py, r: 6, fill: 'none', stroke: cssVar('--text'), 'stroke-width': 2, 'pointer-events': 'none' });
    marker.dataset.marker = '1';
    svg.appendChild(marker);
    showTip(svg, h.px, h.py, h.series + '\n' + h.xLabel + ': ' + h.x + '\n' + fmtNum(h.y));
  }
  function focusSlice(svg, s) {
    pieSlices.forEach(p => p.path.setAttribute('opacity', p === s ? '1' : '0.55'));
    showTip(svg, s.px, s.py, s.key + '\n' + fmtNum(s.v) + ' (' + (s.frac * 100).toFixed(1) + '%)');
  }
  function nearest(px, py) {
    let best = -1, bd = 28 * 28;
    for (let i = 0; i < hits.length; i++) {
      const dx = hits[i].px - px, dy = (hits[i].py - py) * 0.6;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function wireChartEvents(svg) {
    const toLocal = e => { const b = svg.getBoundingClientRect(), s = W / b.width; return [(e.clientX - b.left) * s, (e.clientY - b.top) * s]; };
    svg.addEventListener('pointermove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (pieSlices.length) return;
        const [x, y] = toLocal(e), i = nearest(x, y);
        if (i < 0) { clearMarker(); tip.hidden = true; cursor = -1; return; }
        cursor = i; focusHit(svg, hits[i]);
      });
    });
    svg.addEventListener('pointerleave', () => { if (document.activeElement !== svg) { clearMarker(); tip.hidden = true; pieSlices.forEach(p => p.path.setAttribute('opacity', '1')); } });
    pieSlices.forEach((s, i) => {
      s.path.addEventListener('pointerenter', () => { cursor = i; focusSlice(svg, s); });
    });
    svg.addEventListener('keydown', e => {
      const list = pieSlices.length ? pieSlices : hits;
      if (!list.length) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') cursor = Math.min(list.length - 1, cursor + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') cursor = Math.max(0, cursor < 0 ? 0 : cursor - 1);
      else if (e.key === 'Home') cursor = 0;
      else if (e.key === 'End') cursor = list.length - 1;
      else if (e.key === 'Escape') { clearMarker(); tip.hidden = true; return; }
      else return;
      e.preventDefault();
      if (pieSlices.length) focusSlice(svg, pieSlices[cursor]); else focusHit(svg, hits[cursor]);
    });
    svg.addEventListener('blur', () => { clearMarker(); tip.hidden = true; pieSlices.forEach(p => p.path.setAttribute('opacity', '1')); });
  }

  /* ---- export ---- */
  function cleanSvgString() {
    const clone = lastSvg.cloneNode(true);
    clone.querySelectorAll('[data-marker]').forEach(n => n.remove());
    clone.removeAttribute('tabindex'); clone.removeAttribute('role'); clone.removeAttribute('aria-label'); clone.removeAttribute('style');
    clone.querySelectorAll('[opacity="0.55"]').forEach(n => n.removeAttribute('opacity'));
    return new XMLSerializer().serializeToString(clone);
  }
  function download(blob, name) {
    const a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  $('dl-svg').addEventListener('click', () => {
    if (!lastSvg) return;
    download(new Blob([cleanSvgString()], { type: 'image/svg+xml' }), 'chart-' + state.type + '.svg');
    statusEl.textContent = 'SVG downloaded.';
  });
  $('dl-png').addEventListener('click', () => {
    if (!lastSvg) return;
    const url = URL.createObjectURL(new Blob([cleanSvgString()], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2;
      const ctx = c.getContext('2d'); ctx.scale(2, 2); ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      c.toBlob(b => { if (b) { download(b, 'chart-' + state.type + '.png'); statusEl.textContent = 'PNG downloaded.'; } else statusEl.textContent = 'PNG export failed.'; }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); statusEl.textContent = 'PNG export failed in this browser.'; };
    img.src = url;
  });

  /* ---- theme change + start ---- */
  try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (table) { syncControls(); refreshChart(); } }); } catch (e) { /* old browser */ }
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { tip.hidden = true; }, 100); });

  load();
  if (state.text && state.text.trim()) {
    csv.value = state.text;
    const keep = { type: state.type, x: state.x, ys: state.ys.slice(), agg: state.agg, sig: state.sig };
    runParse();
    // restore the user's last chart choices if the data shape still matches
    if (keep.sig && keep.sig === state.sig) { /* runParse kept them */ }
    else if (keep.sig) { state.type = keep.type; state.x = keep.x; state.ys = keep.ys; state.agg = keep.agg; state.sig = keep.sig; syncControls(); refreshChart(); }
  } else {
    state.sample = 'sales';
    setText(SAMPLES[0].text, 'sales');
  }
})();
