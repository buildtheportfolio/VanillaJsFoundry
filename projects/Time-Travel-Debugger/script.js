'use strict';
/* Time-Travel Debugger
 * Part 1: a tiny Redux-like store with a snapshot tree (pure logic, no DOM).
 * Part 2: demo reducer (task board).
 * Part 3: self-tests.
 * Part 4: UI (only runs when a document exists).
 */
(function (root) {
  var SCHEMA = 'time-travel-debugger/session';
  var VERSION = 1;
  var MAX_SNAPSHOTS = 500;
  var STORAGE_KEY = 'foundry.timeTravelDebugger.v1';

  /* ---------- utilities ---------- */
  function deepFreeze(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.freeze(o);
      Object.keys(o).forEach(function (k) { deepFreeze(o[k]); });
    }
    return o;
  }
  function typeOf(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    return typeof v;
  }
  function deepEqual(a, b) {
    if (a === b) return true;
    var ta = typeOf(a);
    if (ta !== typeOf(b) || (ta !== 'object' && ta !== 'array')) return false;
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(b, ka[i])) return false;
      if (!deepEqual(a[ka[i]], b[ka[i]])) return false;
    }
    return true;
  }
  function isPlain(v) { return typeOf(v) === 'object'; }

  /* ---------- structural diff ---------- */
  function idKeyed(arr) {
    if (!arr.length) return false;
    var seen = {};
    for (var i = 0; i < arr.length; i++) {
      var x = arr[i];
      if (!isPlain(x) || !(typeof x.id === 'number' || typeof x.id === 'string')) return false;
      if (seen[x.id]) return false;
      seen[x.id] = 1;
    }
    return true;
  }
  function diff(a, b, path, out) {
    out = out || [];
    path = path === undefined ? 'state' : path;
    if (a === b) return out;
    var ta = typeOf(a), tb = typeOf(b);
    if (ta !== tb || (ta !== 'object' && ta !== 'array')) {
      out.push({ path: path, kind: 'changed', from: a, to: b });
      return out;
    }
    if (ta === 'array') {
      if (idKeyed(a) && idKeyed(b)) {
        var ma = {}, mb = {};
        a.forEach(function (x) { ma[x.id] = x; });
        b.forEach(function (x) { mb[x.id] = x; });
        a.forEach(function (x) {
          var p = path + '[id=' + x.id + ']';
          if (!(x.id in mb)) out.push({ path: p, kind: 'removed', from: x });
          else diff(x, mb[x.id], p, out);
        });
        b.forEach(function (x) {
          if (!(x.id in ma)) out.push({ path: path + '[id=' + x.id + ']', kind: 'added', to: x });
        });
        return out;
      }
      var n = Math.max(a.length, b.length);
      for (var i = 0; i < n; i++) {
        var p2 = path + '[' + i + ']';
        if (i >= a.length) out.push({ path: p2, kind: 'added', to: b[i] });
        else if (i >= b.length) out.push({ path: p2, kind: 'removed', from: a[i] });
        else diff(a[i], b[i], p2, out);
      }
      return out;
    }
    var keys = Object.keys(a);
    Object.keys(b).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    keys.forEach(function (k) {
      var p3 = path + '.' + k;
      var ha = Object.prototype.hasOwnProperty.call(a, k);
      var hb = Object.prototype.hasOwnProperty.call(b, k);
      if (!ha) out.push({ path: p3, kind: 'added', to: b[k] });
      else if (!hb) out.push({ path: p3, kind: 'removed', from: a[k] });
      else diff(a[k], b[k], p3, out);
    });
    return out;
  }

  /* ---------- store ---------- */
  function createStore(reducer, opts) {
    opts = opts || {};
    var freeze = opts.freeze !== false;
    var maxNodes = opts.maxNodes || MAX_SNAPSHOTS;
    var validateState = opts.validateState || function () { return null; };
    var nodes, rootId, headId, nextId, trimmed;
    var listeners = [];

    function prep(s) { return freeze ? deepFreeze(s) : s; }
    function notify() { listeners.slice().forEach(function (fn) { fn(); }); }
    function reset() {
      var init = prep(reducer(undefined, { type: '@@INIT' }));
      nodes = new Map();
      nextId = 1; trimmed = 0; rootId = 0; headId = 0;
      nodes.set(0, { id: 0, parent: null, action: { type: '@@INIT' }, t: Date.now(), state: init, children: [], pref: null });
    }
    function sanitize(a) {
      if (!a || typeof a !== 'object' || typeof a.type !== 'string' || !a.type) {
        throw new TypeError('Action must be an object with a non-empty string "type"');
      }
      return deepFreeze(JSON.parse(JSON.stringify(a)));
    }
    function commit(action) {
      var act = sanitize(action);
      var head = nodes.get(headId);
      var next = reducer(head.state, act);
      prep(next);
      if (next === head.state) return null; // no-op: not recorded
      var node = { id: nextId++, parent: headId, action: act, t: Date.now(), state: next, children: [], pref: null };
      nodes.set(node.id, node);
      head.children.push(node.id);
      head.pref = node.id;
      headId = node.id;
      trim();
      notify();
      return node;
    }
    function trim() {
      while (nodes.size > maxNodes) {
        var r = nodes.get(rootId);
        if (!r.children.length) break;
        var keep;
        if (headId === rootId) keep = r.pref != null ? r.pref : r.children[0];
        else {
          var c = headId;
          while (nodes.get(c).parent !== rootId) c = nodes.get(c).parent;
          keep = c;
        }
        var removed = 1;
        nodes.delete(rootId);
        r.children.forEach(function (cid) {
          if (cid === keep) return;
          var stack = [cid];
          while (stack.length) {
            var id = stack.pop(), n = nodes.get(id);
            if (!n) continue;
            removed++;
            n.children.forEach(function (x) { stack.push(x); });
            nodes.delete(id);
          }
        });
        nodes.get(keep).parent = null;
        if (headId === rootId) headId = keep;
        rootId = keep;
        trimmed += removed;
      }
    }

    var api = { getState: function () { return nodes.get(headId).state; }, dispatch: function (a) { return dispatchFn(a); } };
    var dispatchFn = (opts.middleware || []).map(function (m) { return m(api); })
      .reduceRight(function (next, mw) { return mw(next); }, commit);

    function path() {
      var out = [], n = nodes.get(rootId);
      while (n) { out.push(n.id); n = n.pref != null ? nodes.get(n.pref) : null; }
      return out;
    }
    function jumpTo(id) {
      if (!nodes.has(id)) return false;
      headId = id;
      var c = id;
      while (nodes.get(c).parent != null) {
        var p = nodes.get(nodes.get(c).parent);
        p.pref = c;
        c = p.id;
      }
      notify();
      return true;
    }
    function step(delta) {
      var p = path(), i = p.indexOf(headId) + delta;
      i = Math.max(0, Math.min(p.length - 1, i));
      return jumpTo(p[i]);
    }
    function leaves() {
      var out = [];
      nodes.forEach(function (n) { if (!n.children.length) out.push(n.id); });
      return out.sort(function (a, b) { return a - b; });
    }
    function depthOf(id) {
      var d = 0, n = nodes.get(id);
      while (n && n.parent != null) { d++; n = nodes.get(n.parent); }
      return d;
    }
    function verifyAll() {
      var bad = [];
      nodes.forEach(function (n) {
        if (n.parent == null) return;
        var again = reducer(nodes.get(n.parent).state, n.action);
        if (!deepEqual(again, n.state)) bad.push(n.id);
      });
      return { ok: bad.length === 0, bad: bad, count: nodes.size };
    }
    function verifyReplay() {
      var ids = path();
      var s = nodes.get(ids[0]).state;
      for (var i = 1; i < ids.length; i++) s = reducer(s, nodes.get(ids[i]).action);
      var tip = nodes.get(ids[ids.length - 1]).state;
      return { ok: deepEqual(s, tip) && JSON.stringify(s) === JSON.stringify(tip), steps: ids.length - 1 };
    }
    function serialize() {
      var list = [];
      Array.from(nodes.values()).sort(function (a, b) { return a.id - b.id; }).forEach(function (n) {
        list.push({ id: n.id, parent: n.parent, pref: n.pref, action: n.action, t: n.t, state: n.state });
      });
      return { schema: SCHEMA, version: VERSION, exportedAt: new Date().toISOString(), head: headId, nextId: nextId, trimmed: trimmed, nodes: list };
    }
    function load(obj) {
      var errs = [];
      function err(m) { if (errs.length < 10) errs.push(m); }
      if (!isPlain(obj)) return { ok: false, errors: ['File is not a JSON object.'] };
      if (obj.schema !== SCHEMA) err('Unknown schema (expected "' + SCHEMA + '").');
      if (obj.version !== VERSION) err('Unsupported version ' + String(obj.version) + ' (expected ' + VERSION + ').');
      if (!Array.isArray(obj.nodes) || !obj.nodes.length) err('"nodes" must be a non-empty array.');
      else if (obj.nodes.length > maxNodes) err('Too many snapshots (' + obj.nodes.length + ', max ' + maxNodes + ').');
      if (errs.length) return { ok: false, errors: errs };
      if (!Number.isInteger(obj.head)) err('"head" must be an integer id.');
      if (!Number.isInteger(obj.nextId) || obj.nextId < 1) err('"nextId" must be a positive integer.');
      if (!(Number.isInteger(obj.trimmed) && obj.trimmed >= 0)) err('"trimmed" must be a non-negative integer.');
      var map = new Map(), rid = null, maxId = -1;
      obj.nodes.forEach(function (n, i) {
        var tag = 'nodes[' + i + ']';
        if (!isPlain(n)) return err(tag + ' is not an object.');
        if (!Number.isInteger(n.id) || n.id < 0 || map.has(n.id)) return err(tag + ': id must be a unique non-negative integer.');
        if (n.parent === null) {
          if (rid !== null) err(tag + ': more than one root.');
          rid = n.id;
        } else if (!Number.isInteger(n.parent) || !map.has(n.parent)) return err(tag + ': parent must be an earlier node id (or null for the root).');
        if (!isPlain(n.action) || typeof n.action.type !== 'string' || !n.action.type || n.action.type.length > 80) return err(tag + ': action needs a string "type".');
        if (typeof n.t !== 'number' || !isFinite(n.t)) return err(tag + ': "t" must be a finite number.');
        if (!isPlain(n.state)) return err(tag + ': "state" must be an object.');
        if (n.pref != null && !Number.isInteger(n.pref)) return err(tag + ': "pref" must be an integer or null.');
        map.set(n.id, n);
        if (n.id > maxId) maxId = n.id;
      });
      if (!errs.length) {
        if (rid === null) err('No root node (parent: null).');
        if (Number.isInteger(obj.head) && !map.has(obj.head)) err('"head" refers to a missing node.');
        if (Number.isInteger(obj.nextId) && obj.nextId <= maxId) err('"nextId" must be greater than every node id.');
      }
      if (errs.length) return { ok: false, errors: errs };
      var built = new Map();
      var rootState;
      try {
        var why = validateState(obj.nodes[0].state);
        if (why) { return { ok: false, errors: ['Root state invalid: ' + why] }; }
        rootState = prep(JSON.parse(JSON.stringify(obj.nodes[0].state)));
      } catch (e) { return { ok: false, errors: ['Root state invalid: ' + e.message] }; }
      for (var i = 0; i < obj.nodes.length; i++) {
        var n = obj.nodes[i], st;
        if (n.parent === null) st = rootState;
        else {
          try { st = prep(reducer(built.get(n.parent).state, JSON.parse(JSON.stringify(n.action)))); }
          catch (e2) { return { ok: false, errors: ['nodes[' + i + ']: replay failed (' + e2.message + ').'] }; }
          if (!deepEqual(st, n.state)) return { ok: false, errors: ['nodes[' + i + ']: stored state does not match replaying its action (corrupted or edited session).'] };
        }
        built.set(n.id, { id: n.id, parent: n.parent, action: deepFreeze(JSON.parse(JSON.stringify(n.action))), t: n.t, state: st, children: [], pref: null });
      }
      built.forEach(function (n) { if (n.parent !== null) built.get(n.parent).children.push(n.id); });
      obj.nodes.forEach(function (raw) {
        var n = built.get(raw.id);
        if (raw.pref != null && n.children.indexOf(raw.pref) >= 0) n.pref = raw.pref;
        else if (n.children.length) n.pref = n.children[n.children.length - 1];
      });
      nodes = built; rootId = rid; headId = obj.head; nextId = obj.nextId; trimmed = obj.trimmed;
      var c = headId;
      while (nodes.get(c).parent != null) { nodes.get(nodes.get(c).parent).pref = c; c = nodes.get(c).parent; }
      notify();
      return { ok: true, errors: [] };
    }

    reset();
    return {
      getState: api.getState,
      dispatch: api.dispatch,
      subscribe: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; },
      getNode: function (id) { return nodes.get(id); },
      allNodes: function () { return Array.from(nodes.values()); },
      headId: function () { return headId; },
      rootId: function () { return rootId; },
      size: function () { return nodes.size; },
      trimmed: function () { return trimmed; },
      maxNodes: maxNodes,
      path: path, jumpTo: jumpTo, step: step, leaves: leaves, depthOf: depthOf,
      verifyAll: verifyAll, verifyReplay: verifyReplay,
      serialize: serialize, load: load,
      clear: function () { reset(); notify(); }
    };
  }

  /* ---------- demo reducer: task board ---------- */
  var COLS = ['todo', 'doing', 'done'];
  var initialState = deepFreeze({ tasks: [], nextId: 1, filter: 'all' });
  var ACTION_TYPES = ['task/add', 'task/move', 'task/star', 'task/remove', 'board/filter', 'board/clearDone'];

  function reducer(state, action) {
    if (state === undefined) state = initialState;
    var p = action.payload || {};
    switch (action.type) {
      case 'task/add': {
        var title = String(p.title == null ? '' : p.title).trim().slice(0, 80);
        if (!title) return state;
        return Object.assign({}, state, {
          nextId: state.nextId + 1,
          tasks: state.tasks.concat([{ id: state.nextId, title: title, col: 'todo', starred: false }])
        });
      }
      case 'task/move': {
        if (COLS.indexOf(p.col) < 0) return state;
        var hit = state.tasks.some(function (t) { return t.id === p.id && t.col !== p.col; });
        if (!hit) return state;
        return Object.assign({}, state, { tasks: state.tasks.map(function (t) { return t.id === p.id ? Object.assign({}, t, { col: p.col }) : t; }) });
      }
      case 'task/star': {
        if (!state.tasks.some(function (t) { return t.id === p.id; })) return state;
        return Object.assign({}, state, { tasks: state.tasks.map(function (t) { return t.id === p.id ? Object.assign({}, t, { starred: !t.starred }) : t; }) });
      }
      case 'task/remove': {
        if (!state.tasks.some(function (t) { return t.id === p.id; })) return state;
        return Object.assign({}, state, { tasks: state.tasks.filter(function (t) { return t.id !== p.id; }) });
      }
      case 'board/filter': {
        if (p.filter !== 'all' && p.filter !== 'starred') return state;
        return p.filter === state.filter ? state : Object.assign({}, state, { filter: p.filter });
      }
      case 'board/clearDone': {
        if (!state.tasks.some(function (t) { return t.col === 'done'; })) return state;
        return Object.assign({}, state, { tasks: state.tasks.filter(function (t) { return t.col !== 'done'; }) });
      }
      default:
        return state;
    }
  }
  function validateAppState(s) {
    if (!isPlain(s)) return 'state is not an object';
    if (!Array.isArray(s.tasks)) return 'tasks must be an array';
    if (!Number.isInteger(s.nextId)) return 'nextId must be an integer';
    if (s.filter !== 'all' && s.filter !== 'starred') return 'filter must be "all" or "starred"';
    for (var i = 0; i < s.tasks.length; i++) {
      var t = s.tasks[i];
      if (!isPlain(t) || !Number.isInteger(t.id) || typeof t.title !== 'string' || COLS.indexOf(t.col) < 0 || typeof t.starred !== 'boolean') return 'tasks[' + i + '] is malformed';
    }
    return null;
  }

  /* ---------- self tests ---------- */
  function runSelfTests(liveStore) {
    var results = [];
    function test(name, fn) {
      try { var r = fn(); results.push({ name: name, pass: r === true || r === undefined, detail: typeof r === 'string' ? r : '' }); }
      catch (e) { results.push({ name: name, pass: false, detail: e.message }); }
    }
    var script = [
      { type: 'task/add', payload: { title: 'A' } }, { type: 'task/add', payload: { title: 'B' } },
      { type: 'task/move', payload: { id: 1, col: 'doing' } }, { type: 'task/star', payload: { id: 2 } },
      { type: 'board/filter', payload: { filter: 'starred' } }, { type: 'task/remove', payload: { id: 1 } }
    ];
    test('Reducer is pure (same input gives equal output, input untouched)', function () {
      var s0 = deepFreeze(reducer(undefined, { type: '@@INIT' }));
      var a = reducer(s0, script[0]), b = reducer(s0, script[0]);
      return deepEqual(a, b) && a !== s0 && s0.tasks.length === 0;
    });
    test('Reducer never mutates (runs on deeply frozen state)', function () {
      var s = deepFreeze(reducer(undefined, { type: '@@INIT' }));
      script.forEach(function (a) { s = deepFreeze(reducer(s, a)); });
      return s.tasks.length === 1;
    });
    test('Structural sharing: untouched slices keep their reference', function () {
      var s = deepFreeze(reducer(reducer(undefined, script[0]), script[1]));
      var f = reducer(s, script[4]);
      var m = reducer(s, script[2]);
      return f.tasks === s.tasks && m.tasks[1] === s.tasks[1] && m.tasks[0] !== s.tasks[0];
    });
    test('Unknown or no-op actions return the same state reference', function () {
      var s = deepFreeze(reducer(undefined, script[0]));
      return reducer(s, { type: 'nope' }) === s && reducer(s, { type: 'task/add', payload: { title: '  ' } }) === s;
    });
    test('Replay determinism: scripted log reproduces final state', function () {
      var st = createStore(reducer);
      script.forEach(function (a) { st.dispatch(a); });
      var v = st.verifyReplay(), all = st.verifyAll();
      var s = reducer(undefined, { type: '@@INIT' });
      script.forEach(function (a) { s = reducer(s, a); });
      return v.ok && all.ok && deepEqual(s, st.getState()) && JSON.stringify(s) === JSON.stringify(st.getState());
    });
    test('Replay determinism: current session (' + (liveStore ? liveStore.size() : 0) + ' snapshots)', function () {
      if (!liveStore) return true;
      var v = liveStore.verifyReplay(), all = liveStore.verifyAll();
      return v.ok && all.ok ? true : 'mismatch at nodes ' + all.bad.join(',');
    });
    test('Branching: dispatch after travelling back forks history', function () {
      var st = createStore(reducer);
      script.slice(0, 3).forEach(function (a) { st.dispatch(a); });
      st.step(-1);
      st.dispatch(script[3]);
      return st.leaves().length === 2 && st.path().length === 4;
    });
    test('Diff finds added, removed and changed paths (id-aligned arrays)', function () {
      var a = reducer(reducer(undefined, script[0]), script[1]);
      var b = reducer(reducer(a, script[2]), { type: 'task/add', payload: { title: 'C' } });
      var d = diff(a, b);
      var kinds = d.map(function (x) { return x.kind; }).sort().join(',');
      return diff(a, a).length === 0 && kinds === 'added,changed,changed' ? true : kinds;
    });
    test('Export then import round-trips the session exactly', function () {
      var st = createStore(reducer);
      script.forEach(function (a) { st.dispatch(a); });
      var json = JSON.parse(JSON.stringify(st.serialize()));
      var st2 = createStore(reducer);
      var r = st2.load(json);
      return r.ok && deepEqual(st2.getState(), st.getState()) && st2.size() === st.size();
    });
    test('Import rejects tampered state', function () {
      var st = createStore(reducer);
      script.slice(0, 2).forEach(function (a) { st.dispatch(a); });
      var json = JSON.parse(JSON.stringify(st.serialize()));
      json.nodes[2].state.nextId = 99;
      return !createStore(reducer).load(json).ok;
    });
    test('Store rejects a mutating reducer (state is frozen)', function () {
      var bad = function (s, a) { if (s === undefined) return { n: 0 }; if (a.type === 'x') { s.n++; } return s; };
      var st = createStore(bad);
      var threw = false;
      try { st.dispatch({ type: 'x' }); } catch (e) { threw = true; }
      return threw && st.getState().n === 0;
    });
    return results;
  }

  var Core = {
    createStore: createStore, reducer: reducer, diff: diff, deepEqual: deepEqual, deepFreeze: deepFreeze,
    runSelfTests: runSelfTests, validateAppState: validateAppState, ACTION_TYPES: ACTION_TYPES,
    MAX_SNAPSHOTS: MAX_SNAPSHOTS, STORAGE_KEY: STORAGE_KEY
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  if (typeof document === 'undefined') return;

  /* ---------- UI ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  }
  function $(id) { return document.getElementById(id); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function fmtTime(t) { var d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + pad(d.getMilliseconds(), 3); }
  function preview(v, n) {
    var s;
    try { s = v === undefined ? '' : JSON.stringify(v); } catch (e) { s = String(v); }
    if (s === undefined) s = 'undefined';
    n = n || 48;
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  var stats = { dispatched: 0, recorded: 0, ignored: 0, rejected: 0 };
  var lastError = '';
  function guardMiddleware() {
    return function (next) {
      return function (action) {
        if (!action || ACTION_TYPES.indexOf(action.type) < 0) { stats.rejected++; return null; }
        return next(action);
      };
    };
  }
  function statsMiddleware() {
    return function (next) {
      return function (action) {
        stats.dispatched++;
        var r = next(action);
        if (r) stats.recorded++; else stats.ignored++;
        return r;
      };
    };
  }

  var store = createStore(reducer, { middleware: [guardMiddleware, statsMiddleware], validateState: validateAppState });
  var storageOk = true, restoreNote = '';
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      var res = store.load(JSON.parse(saved));
      if (res.ok) restoreNote = 'Restored previous session (' + store.size() + ' snapshots).';
      else restoreNote = 'Saved session could not be restored: ' + res.errors[0];
    }
  } catch (e) {
    if (e && e.name === 'SecurityError') storageOk = false;
    restoreNote = 'Saved session could not be restored (' + (e && e.message ? e.message : 'storage unavailable') + ').';
    if (e instanceof SyntaxError) restoreNote = 'Saved session was not valid JSON and was ignored.';
  }

  var ui = { playing: false, speed: 1, timer: null, diffFrom: null, diffTo: null, open: new Map(), notice: restoreNote, saveTimer: null, saveMsg: '' };

  function say(msg, isErr) {
    var el = $('notices');
    if (isErr) lastError = msg; else lastError = '';
    el.textContent = msg;
    el.className = isErr ? 'notice err' : 'notice';
  }

  function act(type, payload) {
    stopPlay();
    try { store.dispatch({ type: type, payload: payload }); say(''); }
    catch (e) { say('Dispatch failed: ' + e.message, true); }
  }

  /* demo app */
  var COL_LABEL = { todo: 'To do', doing: 'Doing', done: 'Done' };
  function renderApp() {
    var s = store.getState();
    var board = $('board');
    clear(board);
    var shown = s.tasks.filter(function (t) { return s.filter === 'all' || t.starred; });
    $('appEmpty').hidden = shown.length > 0;
    $('appEmpty').textContent = s.tasks.length ? 'No starred tasks. Switch the filter to All.' : 'No tasks yet. Add one above, or load three demo tasks.';
    COLS.forEach(function (col, ci) {
      var items = shown.filter(function (t) { return t.col === col; });
      var list = h('ul', { class: 'cards' });
      items.forEach(function (t) {
        list.appendChild(h('li', { class: 'card' + (t.starred ? ' starred' : '') },
          h('span', { class: 'ctitle' }, t.title),
          h('span', { class: 'cbtns' },
            h('button', { type: 'button', class: 'mini', 'aria-label': 'Move "' + t.title + '" left', disabled: ci === 0 ? '' : null, onclick: function () { act('task/move', { id: t.id, col: COLS[ci - 1] }); } }, '◀'),
            h('button', { type: 'button', class: 'mini', 'aria-label': 'Move "' + t.title + '" right', disabled: ci === COLS.length - 1 ? '' : null, onclick: function () { act('task/move', { id: t.id, col: COLS[ci + 1] }); } }, '▶'),
            h('button', { type: 'button', class: 'mini', 'aria-pressed': String(t.starred), 'aria-label': (t.starred ? 'Unstar "' : 'Star "') + t.title + '"', onclick: function () { act('task/star', { id: t.id }); } }, t.starred ? '★' : '☆'),
            h('button', { type: 'button', class: 'mini danger', 'aria-label': 'Delete "' + t.title + '"', onclick: function () { act('task/remove', { id: t.id }); } }, '✕'))));
      });
      board.appendChild(h('section', { class: 'col', 'aria-label': COL_LABEL[col] },
        h('h3', null, COL_LABEL[col], h('span', { class: 'count' }, String(items.length))), list));
    });
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === s.filter));
    });
    $('mwStats').textContent = 'Middleware: ' + stats.dispatched + ' dispatched, ' + stats.recorded + ' recorded, ' + stats.ignored + ' no-op, ' + stats.rejected + ' rejected.';
  }

  /* transport */
  function pathInfo() { var p = store.path(); return { ids: p, pos: p.indexOf(store.headId()) }; }
  function renderTransport() {
    var pi = pathInfo(), last = pi.ids.length - 1;
    var sl = $('slider');
    sl.max = String(last); sl.value = String(pi.pos);
    sl.setAttribute('aria-valuetext', 'Snapshot ' + pi.pos + ' of ' + last);
    $('pos').textContent = 'Snapshot ' + pi.pos + ' / ' + last;
    $('btnFirst').disabled = $('btnPrev').disabled = pi.pos <= 0;
    $('btnNext').disabled = $('btnLast').disabled = pi.pos >= last;
    $('btnPlay').textContent = ui.playing ? 'Pause' : 'Play';
    $('btnPlay').setAttribute('aria-pressed', String(ui.playing));
    $('btnPlay').disabled = last === 0;
    var back = pi.pos < last;
    var ban = $('travelBanner');
    ban.hidden = !back;
    ban.textContent = back ? 'Time-travelling: viewing snapshot ' + pi.pos + ' of ' + last + '. A new action here forks a new branch.' : '';
  }
  function stopPlay() { ui.playing = false; if (ui.timer) { clearTimeout(ui.timer); ui.timer = null; } }
  function tick() {
    ui.timer = null;
    if (!ui.playing) return;
    var pi = pathInfo();
    if (pi.pos >= pi.ids.length - 1) { stopPlay(); renderTransport(); return; }
    store.step(1);
    if (ui.playing) ui.timer = setTimeout(tick, 900 / ui.speed);
  }
  function togglePlay() {
    if (ui.playing) { stopPlay(); renderTransport(); return; }
    var pi = pathInfo();
    if (pi.ids.length < 2) return;
    ui.playing = true;
    if (pi.pos >= pi.ids.length - 1) store.jumpTo(pi.ids[0]);
    renderTransport();
    ui.timer = setTimeout(tick, 900 / ui.speed);
  }
  function travel(fn) { stopPlay(); fn(); renderTransport(); }

  /* timeline */
  function renderTimeline() {
    var pi = pathInfo(), list = $('timeline');
    clear(list);
    pi.ids.forEach(function (id, i) {
      var n = store.getNode(id);
      var isBase = i === 0;
      var label = isBase ? (store.trimmed() ? 'BASE (earlier history trimmed)' : n.action.type) : n.action.type;
      var row = h('button', { type: 'button', class: 'row' + (i > pi.pos ? ' future' : '') + (id === store.headId() ? ' current' : ''), 'aria-current': id === store.headId() ? 'step' : null, onclick: function () { travel(function () { store.jumpTo(id); }); } },
        h('span', { class: 'ix' }, '#' + i),
        h('span', { class: 'ty' }, label),
        h('span', { class: 'tm' }, fmtTime(n.t)),
        h('span', { class: 'pl' }, isBase ? '' : preview(n.action.payload)));
      list.appendChild(h('li', null, row));
    });
    var cur = list.querySelector('.current');
    if (cur) {
      var top = cur.parentNode.offsetTop, hgt = cur.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top;
      else if (top + hgt > list.scrollTop + list.clientHeight) list.scrollTop = top + hgt - list.clientHeight;
    }
  }

  /* branch graph */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs) {
    var el = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
  function renderGraph() {
    var host = $('graph'), blist = $('branches');
    clear(host); clear(blist);
    var onPath = {}; store.path().forEach(function (id) { onPath[id] = true; });
    var DX = 30, DY = 26, lane = {}, depth = {}, nextLane = 0, maxDepth = 0;
    var stack = [[store.rootId(), 0, false]];
    // iterative DFS: lane assigned to leaves in order, parents inherit first child's lane
    var order = [];
    while (stack.length) {
      var top = stack.pop(), n = store.getNode(top[0]);
      if (top[2]) {
        lane[n.id] = n.children.length ? lane[n.children[0]] : nextLane++;
        continue;
      }
      depth[n.id] = top[1]; if (top[1] > maxDepth) maxDepth = top[1];
      order.push(n.id);
      stack.push([n.id, top[1], true]);
      for (var i = n.children.length - 1; i >= 0; i--) stack.push([n.children[i], top[1] + 1, false]);
    }
    var W = (maxDepth + 1) * DX + 20, H = Math.max(1, nextLane) * DY + 14;
    var s = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Snapshot tree' });
    function cx(id) { return 14 + depth[id] * DX; }
    function cy(id) { return 12 + lane[id] * DY; }
    order.forEach(function (id) {
      var n = store.getNode(id);
      if (n.parent != null) s.appendChild(svg('path', { d: 'M' + cx(n.parent) + ',' + cy(n.parent) + ' L' + cx(id) + ',' + cy(id), class: 'edge' + (onPath[id] && onPath[n.parent] ? ' on' : '') }));
    });
    order.forEach(function (id) {
      var n = store.getNode(id);
      var cls = 'node' + (onPath[id] ? ' on' : '') + (id === store.headId() ? ' head' : '') + (n.children.length > 1 ? ' fork' : '');
      var g = svg('g', { class: cls, tabindex: '0', role: 'button', 'aria-label': 'Snapshot ' + n.action.type + (id === store.headId() ? ' (current)' : '') + (n.children.length > 1 ? ', fork point' : '') });
      var t = svg('title'); t.textContent = '#' + depth[id] + ' ' + n.action.type + ' ' + fmtTime(n.t); g.appendChild(t);
      g.appendChild(svg('circle', { cx: cx(id), cy: cy(id), r: id === store.headId() ? 8 : 6 }));
      if (n.children.length > 1) g.appendChild(svg('rect', { x: cx(id) - 3, y: cy(id) - 3, width: 6, height: 6, class: 'forkmark' }));
      g.addEventListener('click', function () { travel(function () { store.jumpTo(id); }); });
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); travel(function () { store.jumpTo(id); }); } });
      s.appendChild(g);
    });
    host.appendChild(s);
    var headG = host.querySelector('.head');
    if (headG) {
      var hx = parseFloat(headG.querySelector('circle').getAttribute('cx'));
      if (hx < host.scrollLeft + 20 || hx > host.scrollLeft + host.clientWidth - 20) host.scrollLeft = Math.max(0, hx - host.clientWidth / 2);
    }
    var leaves = store.leaves();
    $('branchCount').textContent = leaves.length + (leaves.length === 1 ? ' branch' : ' branches');
    leaves.forEach(function (id, i) {
      var active = !!onPath[id] && store.path()[store.path().length - 1] === id;
      blist.appendChild(h('li', null, h('button', { type: 'button', class: 'chip' + (active ? ' active' : ''), 'aria-pressed': String(active), onclick: function () { travel(function () { store.jumpTo(id); }); } },
        'Branch ' + (i + 1) + ' · ' + (store.depthOf(id)) + ' steps' + (active ? ' · active' : ''))));
    });
  }

  /* diff view */
  function nodeLabel(n) {
    return '#' + n.id + ' ' + (n.parent == null ? (store.trimmed() ? 'BASE' : '@@INIT') : n.action.type) + ' (' + fmtTime(n.t) + ')';
  }
  function renderDiff() {
    var all = store.allNodes().sort(function (a, b) { return a.id - b.id; });
    var ids = all.map(function (n) { return n.id; });
    if (ui.diffFrom != null && ids.indexOf(ui.diffFrom) < 0) ui.diffFrom = null;
    if (ui.diffTo != null && ids.indexOf(ui.diffTo) < 0) ui.diffTo = null;
    var head = store.getNode(store.headId());
    var from = ui.diffFrom != null ? ui.diffFrom : (head.parent != null ? head.parent : head.id);
    var to = ui.diffTo != null ? ui.diffTo : head.id;
    [['diffFromSel', from], ['diffToSel', to]].forEach(function (pair) {
      var sel = $(pair[0]);
      clear(sel);
      all.forEach(function (n) { sel.appendChild(h('option', { value: String(n.id) }, nodeLabel(n))); });
      sel.value = String(pair[1]);
    });
    var out = $('diffOut');
    clear(out);
    var d = diff(store.getNode(from).state, store.getNode(to).state);
    $('diffSummary').textContent = d.length ? d.length + ' difference' + (d.length === 1 ? '' : 's') : 'Identical snapshots';
    if (!d.length) { out.appendChild(h('li', { class: 'empty' }, 'No differences between these two snapshots.')); return; }
    var sym = { added: '+', removed: '−', changed: '~' };
    d.forEach(function (x) {
      var val;
      if (x.kind === 'changed') val = preview(x.from, 40) + '  →  ' + preview(x.to, 40);
      else val = preview(x.kind === 'added' ? x.to : x.from, 80);
      out.appendChild(h('li', { class: 'd-' + x.kind },
        h('span', { class: 'sym', 'aria-label': x.kind }, sym[x.kind]),
        h('code', { class: 'dp' }, x.path),
        h('span', { class: 'dv' }, val)));
    });
  }

  /* inspector */
  function buildTree(value, key, pth, depth) {
    var li = h('li');
    if (value !== null && typeof value === 'object') {
      var isArr = Array.isArray(value), keys = Object.keys(value);
      var open = ui.open.has(pth) ? ui.open.get(pth) : depth < 2;
      var btn = h('button', { type: 'button', class: 'tw', 'aria-expanded': String(open), onclick: function () { ui.open.set(pth, !open); renderInspector(); } },
        h('span', { class: 'arrow', 'aria-hidden': 'true' }, open ? '▾' : '▸'),
        h('span', { class: 'k' }, key),
        h('span', { class: 'meta' }, isArr ? '[' + keys.length + ']' : '{' + keys.length + '}'));
      li.appendChild(btn);
      if (open && keys.length) {
        var ul = h('ul', { class: 'tree' });
        keys.forEach(function (k) { ul.appendChild(buildTree(value[k], k, pth + '/' + k, depth + 1)); });
        li.appendChild(ul);
      }
    } else {
      li.appendChild(h('span', { class: 'leaf' }, h('span', { class: 'k' }, key), h('span', { class: 'sep' }, ': '),
        h('span', { class: 'v t-' + typeOf(value) }, typeof value === 'string' ? JSON.stringify(value) : String(value))));
    }
    return li;
  }
  function renderInspector() {
    var host = $('inspector');
    clear(host);
    var ul = h('ul', { class: 'tree root' });
    ul.appendChild(buildTree(store.getState(), 'state', '', 0));
    host.appendChild(ul);
  }

  /* session */
  function showErrors(list) {
    var box = $('importErrors');
    clear(box);
    box.hidden = !list.length;
    if (!list.length) return;
    box.appendChild(h('strong', null, 'Import failed. Nothing was changed.'));
    var ul = h('ul');
    list.forEach(function (m) { ul.appendChild(h('li', null, m)); });
    box.appendChild(ul);
  }
  function renderSession() {
    var t = store.trimmed();
    $('sessionInfo').textContent = store.size() + ' of ' + store.maxNodes + ' snapshots kept.';
    var tn = $('trimNotice');
    tn.hidden = !t;
    tn.textContent = t ? t + ' oldest snapshot' + (t === 1 ? ' was' : 's were') + ' trimmed to stay under the ' + store.maxNodes + '-snapshot cap. The earliest remaining snapshot is now the base state.' : '';
    $('saveInfo').textContent = storageOk ? ui.saveMsg : 'Storage is unavailable, so this session will not persist. Export it as JSON instead.';
    $('restoreInfo').textContent = ui.notice;
    $('restoreInfo').hidden = !ui.notice;
  }
  function saveSoon() {
    if (!storageOk) return;
    clearTimeout(ui.saveTimer);
    ui.saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store.serialize()));
        ui.saveMsg = 'Saved to this browser at ' + fmtTime(Date.now()) + '.';
      } catch (e) {
        ui.saveMsg = 'Could not save to localStorage (' + (e && e.name ? e.name : 'error') + '). Export the session to keep it.';
      }
      renderSession();
    }, 250);
  }
  function exportSession() {
    var data = JSON.stringify(store.serialize(), null, 2);
    var d = new Date();
    var name = 'time-travel-session-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '.json';
    var url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    var a = h('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    say('Exported ' + name + '.');
  }
  function importFile(file) {
    showErrors([]);
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { showErrors(['File is larger than 3 MB.']); return; }
    var fr = new FileReader();
    fr.onerror = function () { showErrors(['Could not read the file.']); };
    fr.onload = function () {
      var obj;
      try { obj = JSON.parse(String(fr.result)); } catch (e) { showErrors(['Not valid JSON: ' + e.message]); return; }
      stopPlay();
      var r = store.load(obj);
      if (!r.ok) { showErrors(r.errors); return; }
      ui.diffFrom = ui.diffTo = null; ui.notice = '';
      say('Imported session with ' + store.size() + ' snapshots.');
    };
    fr.readAsText(file);
  }
  var clearArm = null;
  function onClear() {
    var b = $('btnClear');
    if (!clearArm) {
      b.textContent = 'Confirm: clear everything';
      clearArm = setTimeout(function () { clearArm = null; b.textContent = 'Clear history'; }, 3500);
      return;
    }
    clearTimeout(clearArm); clearArm = null; b.textContent = 'Clear history';
    stopPlay(); store.clear(); ui.diffFrom = ui.diffTo = null; ui.notice = '';
    say('History cleared.');
  }

  /* self test */
  function renderTests() {
    var res = runSelfTests(store);
    var ok = res.filter(function (r) { return r.pass; }).length;
    var sum = $('testSummary');
    sum.textContent = 'Self-test: ' + ok + '/' + res.length + ' passed';
    sum.className = ok === res.length ? 'pass' : 'fail';
    var ul = $('testList');
    clear(ul);
    res.forEach(function (r) {
      ul.appendChild(h('li', { class: r.pass ? 'pass' : 'fail' }, h('span', { class: 'badge' }, r.pass ? 'PASS' : 'FAIL'), h('span', null, r.name + (r.detail ? ' — ' + r.detail : ''))));
    });
  }

  function renderAll() {
    renderApp(); renderTransport(); renderTimeline(); renderGraph(); renderDiff(); renderInspector(); renderSession();
  }
  var testsTimer = null;
  store.subscribe(function () {
    renderAll();
    saveSoon();
    clearTimeout(testsTimer);
    testsTimer = setTimeout(renderTests, 400);
  });

  /* wiring */
  $('addForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = $('newTitle');
    if (!inp.value.trim()) { $('addHint').textContent = 'Enter a task title first.'; inp.focus(); return; }
    $('addHint').textContent = '';
    act('task/add', { title: inp.value });
    inp.value = ''; inp.focus();
  });
  $('btnDemo').addEventListener('click', function () {
    ['Write reducer', 'Add middleware', 'Ship debugger'].forEach(function (t) { act('task/add', { title: t }); });
  });
  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () { act('board/filter', { filter: b.getAttribute('data-filter') }); });
  });
  $('btnClearDone').addEventListener('click', function () { act('board/clearDone', {}); });
  $('btnFirst').addEventListener('click', function () { travel(function () { store.jumpTo(store.path()[0]); }); });
  $('btnPrev').addEventListener('click', function () { travel(function () { store.step(-1); }); });
  $('btnNext').addEventListener('click', function () { travel(function () { store.step(1); }); });
  $('btnLast').addEventListener('click', function () { travel(function () { var p = store.path(); store.jumpTo(p[p.length - 1]); }); });
  $('btnPlay').addEventListener('click', togglePlay);
  $('speed').addEventListener('change', function (e) { ui.speed = parseFloat(e.target.value) || 1; });
  $('slider').addEventListener('input', function (e) { stopPlay(); store.jumpTo(store.path()[parseInt(e.target.value, 10)]); });
  $('diffFromSel').addEventListener('change', function (e) { ui.diffFrom = parseInt(e.target.value, 10); renderDiff(); });
  $('diffToSel').addEventListener('change', function (e) { ui.diffTo = parseInt(e.target.value, 10); renderDiff(); });
  $('diffReset').addEventListener('click', function () { ui.diffFrom = ui.diffTo = null; renderDiff(); });
  $('btnExport').addEventListener('click', exportSession);
  $('btnImport').addEventListener('click', function () { $('fileIn').click(); });
  $('fileIn').addEventListener('change', function (e) { importFile(e.target.files[0]); e.target.value = ''; });
  $('btnClear').addEventListener('click', onClear);
  $('btnRerun').addEventListener('click', renderTests);
  $('btnExpand').addEventListener('click', function () { ui.open = new Map(); collectPaths(store.getState(), '', function (p) { ui.open.set(p, true); }); renderInspector(); });
  $('btnCollapse').addEventListener('click', function () { ui.open = new Map(); ui.open.set('', false); renderInspector(); });
  function collectPaths(v, p, fn) {
    if (v !== null && typeof v === 'object') { fn(p); Object.keys(v).forEach(function (k) { collectPaths(v[k], p + '/' + k, fn); }); }
  }

  document.addEventListener('keydown', function (e) {
    var t = e.target, tag = t && t.tagName;
    var typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable);
    if (typing && !(tag === 'INPUT' && t.type === 'range')) return;
    var mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      travel(function () { store.step(e.shiftKey ? 1 : -1); });
    } else if (mod && !e.altKey && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      travel(function () { store.step(1); });
    } else if (mod || e.altKey) {
      return;
    } else if (e.key === 'ArrowLeft' && tag !== 'INPUT') {
      e.preventDefault(); travel(function () { store.step(-1); });
    } else if (e.key === 'ArrowRight' && tag !== 'INPUT') {
      e.preventDefault(); travel(function () { store.step(1); });
    } else if (e.key === 'Home' && tag !== 'INPUT') {
      e.preventDefault(); travel(function () { store.jumpTo(store.path()[0]); });
    } else if (e.key === 'End' && tag !== 'INPUT') {
      e.preventDefault(); travel(function () { var p = store.path(); store.jumpTo(p[p.length - 1]); });
    } else if ((e.key === ' ' || e.code === 'Space') && tag !== 'BUTTON' && tag !== 'INPUT' && tag !== 'SUMMARY' && !(t.getAttribute && t.getAttribute('role') === 'button')) {
      e.preventDefault(); togglePlay();
    }
  });

  renderAll();
  renderTests();
  if (storageOk) saveSoon();
})(typeof window !== 'undefined' ? window : globalThis);
