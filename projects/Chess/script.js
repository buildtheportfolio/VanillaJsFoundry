'use strict';

/* ENGINE-START (pure logic, no DOM; extracted verbatim by the perft test) */
const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const FILES = 'abcdefgh';
const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const PIECE_NAMES = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

function sqName(s) { return FILES[s & 7] + (8 - (s >> 3)); }
function sqFromName(n) { return (8 - Number(n[1])) * 8 + FILES.indexOf(n[0]); }
function colorOf(p) { return p < 'a' ? 'w' : 'b'; }

function isAttacked(b, sq, by) {
  const r = sq >> 3, f = sq & 7, w = by === 'w';
  const pr = w ? r + 1 : r - 1, pp = w ? 'P' : 'p';
  if (pr >= 0 && pr < 8) {
    if (f > 0 && b[pr * 8 + f - 1] === pp) return true;
    if (f < 7 && b[pr * 8 + f + 1] === pp) return true;
  }
  const n = w ? 'N' : 'n', k = w ? 'K' : 'k', q = w ? 'Q' : 'q', bi = w ? 'B' : 'b', ro = w ? 'R' : 'r';
  for (let i = 0; i < 8; i++) {
    let rr = r + KN[i][0], ff = f + KN[i][1];
    if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === n) return true;
    rr = r + KG[i][0]; ff = f + KG[i][1];
    if (rr >= 0 && rr < 8 && ff >= 0 && ff < 8 && b[rr * 8 + ff] === k) return true;
  }
  for (let i = 0; i < 4; i++) {
    let rr = r + DIAG[i][0], ff = f + DIAG[i][1];
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
      const p = b[rr * 8 + ff];
      if (p) { if (p === bi || p === q) return true; break; }
      rr += DIAG[i][0]; ff += DIAG[i][1];
    }
    rr = r + ORTH[i][0]; ff = f + ORTH[i][1];
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
      const p = b[rr * 8 + ff];
      if (p) { if (p === ro || p === q) return true; break; }
      rr += ORTH[i][0]; ff += ORTH[i][1];
    }
  }
  return false;
}

function kingSq(b, color) {
  const k = color === 'w' ? 'K' : 'k';
  for (let i = 0; i < 64; i++) if (b[i] === k) return i;
  return -1;
}

function inCheck(s) {
  return isAttacked(s.b, kingSq(s.b, s.turn), s.turn === 'w' ? 'b' : 'w');
}

/* Pseudo-legal moves: {f,t,p (piece), c (captured), pr (promotion type letter), fl: ''|'ep'|'dbl'|'K'|'Q'} */
function pseudoMoves(s, capsOnly) {
  const b = s.b, out = [], w = s.turn === 'w', opp = w ? 'b' : 'w';
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || colorOf(p) !== s.turn) continue;
    const r = i >> 3, f = i & 7, t = p.toUpperCase();
    if (t === 'P') {
      const dir = w ? -1 : 1, startRow = w ? 6 : 1, promoRow = w ? 0 : 7;
      const r1 = r + dir;
      if (r1 < 0 || r1 > 7) continue;
      const push = (to, c, fl) => {
        if (r1 === promoRow) { for (const pr of 'QRBN') out.push({ f: i, t: to, p, c, pr, fl }); }
        else if (!capsOnly || c) out.push({ f: i, t: to, p, c, pr: '', fl });
      };
      if (!b[r1 * 8 + f]) {
        push(r1 * 8 + f, '', '');
        if (r === startRow && !b[(r + 2 * dir) * 8 + f] && !capsOnly) out.push({ f: i, t: (r + 2 * dir) * 8 + f, p, c: '', pr: '', fl: 'dbl' });
      }
      for (const df of [-1, 1]) {
        const ff = f + df;
        if (ff < 0 || ff > 7) continue;
        const to = r1 * 8 + ff, tp = b[to];
        if (tp && colorOf(tp) === opp) push(to, tp, '');
        else if (!tp && to === s.ep) out.push({ f: i, t: to, p, c: w ? 'p' : 'P', pr: '', fl: 'ep' });
      }
    } else if (t === 'N' || t === 'K') {
      const D = t === 'N' ? KN : KG;
      for (let k = 0; k < 8; k++) {
        const rr = r + D[k][0], ff = f + D[k][1];
        if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
        const tp = b[rr * 8 + ff];
        if (tp && colorOf(tp) === s.turn) continue;
        if (capsOnly && !tp) continue;
        out.push({ f: i, t: rr * 8 + ff, p, c: tp, pr: '', fl: '' });
      }
    } else {
      const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
      for (let k = 0; k < dirs.length; k++) {
        let rr = r + dirs[k][0], ff = f + dirs[k][1];
        while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
          const tp = b[rr * 8 + ff];
          if (tp) {
            if (colorOf(tp) !== s.turn) out.push({ f: i, t: rr * 8 + ff, p, c: tp, pr: '', fl: '' });
            break;
          }
          if (!capsOnly) out.push({ f: i, t: rr * 8 + ff, p, c: '', pr: '', fl: '' });
          rr += dirs[k][0]; ff += dirs[k][1];
        }
      }
    }
  }
  if (!capsOnly) {
    const home = w ? 60 : 4, king = w ? 'K' : 'k', rook = w ? 'R' : 'r';
    if (b[home] === king && !isAttacked(b, home, opp)) {
      if ((s.cast & (w ? 1 : 4)) && b[home + 3] === rook && !b[home + 1] && !b[home + 2] && !isAttacked(b, home + 1, opp)) {
        out.push({ f: home, t: home + 2, p: king, c: '', pr: '', fl: 'K' });
      }
      if ((s.cast & (w ? 2 : 8)) && b[home - 4] === rook && !b[home - 1] && !b[home - 2] && !b[home - 3] && !isAttacked(b, home - 1, opp)) {
        out.push({ f: home, t: home - 2, p: king, c: '', pr: '', fl: 'Q' });
      }
    }
  }
  return out;
}

function makeMove(s, m) {
  const b = s.b.slice(), w = s.turn === 'w';
  b[m.f] = '';
  b[m.t] = m.pr ? (w ? m.pr : m.pr.toLowerCase()) : m.p;
  if (m.fl === 'ep') b[m.t + (w ? 8 : -8)] = '';
  else if (m.fl === 'K') { b[m.t + 1] = ''; b[m.t - 1] = w ? 'R' : 'r'; }
  else if (m.fl === 'Q') { b[m.t - 2] = ''; b[m.t + 1] = w ? 'R' : 'r'; }
  let cast = s.cast;
  if (m.p === 'K') cast &= ~3; else if (m.p === 'k') cast &= ~12;
  if (m.f === 63 || m.t === 63) cast &= ~1;
  if (m.f === 56 || m.t === 56) cast &= ~2;
  if (m.f === 7 || m.t === 7) cast &= ~4;
  if (m.f === 0 || m.t === 0) cast &= ~8;
  return {
    b, turn: w ? 'b' : 'w', cast,
    ep: m.fl === 'dbl' ? (m.f + m.t) >> 1 : -1,
    half: (m.c || m.p === 'P' || m.p === 'p') ? 0 : s.half + 1,
    full: s.full + (w ? 0 : 1)
  };
}

function legalMoves(s) {
  const out = [], me = s.turn, opp = me === 'w' ? 'b' : 'w';
  for (const m of pseudoMoves(s, false)) {
    const ns = makeMove(s, m);
    if (!isAttacked(ns.b, kingSq(ns.b, me), opp)) out.push(m);
  }
  return out;
}

function parseFEN(fen) {
  const parts = String(fen).trim().split(/\s+/);
  if (parts.length !== 4 && parts.length !== 6) throw new Error('FEN needs 4 or 6 space-separated fields.');
  const rows = parts[0].split('/');
  if (rows.length !== 8) throw new Error('Board part needs 8 ranks separated by "/".');
  const b = new Array(64).fill('');
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (/[1-8]/.test(ch)) f += Number(ch);
      else if (/[pnbrqkPNBRQK]/.test(ch)) { if (f > 7) throw new Error('Rank ' + (8 - r) + ' is too long.'); b[r * 8 + f++] = ch; }
      else throw new Error('Unknown character "' + ch + '" in board part.');
    }
    if (f !== 8) throw new Error('Rank ' + (8 - r) + ' does not have 8 squares.');
  }
  if (parts[1] !== 'w' && parts[1] !== 'b') throw new Error('Side to move must be w or b.');
  if (!/^(-|[KQkq]+)$/.test(parts[2])) throw new Error('Castling field is invalid.');
  if (!/^(-|[a-h][36])$/.test(parts[3])) throw new Error('En passant field is invalid.');
  const count = ch => b.filter(x => x === ch).length;
  if (count('K') !== 1 || count('k') !== 1) throw new Error('Each side needs exactly one king.');
  for (let i = 0; i < 8; i++) if (/[Pp]/.test(b[i]) || /[Pp]/.test(b[56 + i])) throw new Error('Pawns cannot stand on the first or last rank.');
  let cast = 0;
  if (parts[2].includes('K') && b[60] === 'K' && b[63] === 'R') cast |= 1;
  if (parts[2].includes('Q') && b[60] === 'K' && b[56] === 'R') cast |= 2;
  if (parts[2].includes('k') && b[4] === 'k' && b[7] === 'r') cast |= 4;
  if (parts[2].includes('q') && b[4] === 'k' && b[0] === 'r') cast |= 8;
  const turn = parts[1], other = turn === 'w' ? 'b' : 'w';
  let ep = parts[3] === '-' ? -1 : sqFromName(parts[3]);
  if (ep >= 0) {
    const okRank = turn === 'w' ? (ep >> 3) === 2 : (ep >> 3) === 5;
    const pawnSq = ep + (turn === 'w' ? 8 : -8);
    if (!okRank || b[ep] || b[pawnSq] !== (turn === 'w' ? 'p' : 'P')) ep = -1;
  }
  const half = parts.length === 6 ? parseInt(parts[4], 10) : 0;
  const full = parts.length === 6 ? parseInt(parts[5], 10) : 1;
  if (!(half >= 0) || !(full >= 1)) throw new Error('Move counters are invalid.');
  if (isAttacked(b, kingSq(b, other), turn)) throw new Error('The side that is not to move is in check - impossible position.');
  return { b, turn, cast, ep, half, full };
}

function toFEN(s) {
  let out = '';
  for (let r = 0; r < 8; r++) {
    let e = 0;
    for (let f = 0; f < 8; f++) {
      const p = s.b[r * 8 + f];
      if (!p) e++; else { if (e) out += e; e = 0; out += p; }
    }
    if (e) out += e;
    if (r < 7) out += '/';
  }
  const c = (s.cast & 1 ? 'K' : '') + (s.cast & 2 ? 'Q' : '') + (s.cast & 4 ? 'k' : '') + (s.cast & 8 ? 'q' : '');
  return out + ' ' + s.turn + ' ' + (c || '-') + ' ' + (s.ep >= 0 ? sqName(s.ep) : '-') + ' ' + s.half + ' ' + s.full;
}

function sanOf(s, m, legal) {
  let str;
  if (m.fl === 'K') str = 'O-O';
  else if (m.fl === 'Q') str = 'O-O-O';
  else {
    const t = m.p.toUpperCase();
    if (t === 'P') {
      str = (m.c ? FILES[m.f & 7] + 'x' : '') + sqName(m.t) + (m.pr ? '=' + m.pr : '');
    } else {
      let dis = '';
      const others = legal.filter(o => o.f !== m.f && o.p === m.p && o.t === m.t);
      if (others.length) {
        const sameFile = others.some(o => (o.f & 7) === (m.f & 7));
        const sameRank = others.some(o => (o.f >> 3) === (m.f >> 3));
        if (!sameFile) dis = FILES[m.f & 7];
        else if (!sameRank) dis = String(8 - (m.f >> 3));
        else dis = sqName(m.f);
      }
      str = t + dis + (m.c ? 'x' : '') + sqName(m.t);
    }
  }
  const ns = makeMove(s, m);
  if (inCheck(ns)) str += legalMoves(ns).length ? '+' : '#';
  return str;
}

function insufficientMaterial(b) {
  const minors = [];
  for (let i = 0; i < 64; i++) {
    const t = b[i] && b[i].toUpperCase();
    if (!t || t === 'K') continue;
    if (t === 'N' || t === 'B') minors.push({ t, c: colorOf(b[i]), sq: ((i >> 3) + (i & 7)) & 1 });
    else return false;
  }
  if (minors.length <= 1) return true;
  if (minors.every(x => x.t === 'B') && minors.every(x => x.sq === minors[0].sq)) return true;
  return false;
}

function positionKey(s) {
  // En passant square only counts when a legal en passant capture exists.
  let ep = '-';
  if (s.ep >= 0 && legalMoves(s).some(m => m.fl === 'ep')) ep = String(s.ep);
  return s.b.join('|') + s.turn + s.cast + ep;
}

/* Evaluation + alpha-beta search (negamax) */
const MATE = 30000;
const PVAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const PST = {
  P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  E: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
};

function evaluate(s) {
  const b = s.b;
  let material = 0;
  for (let i = 0; i < 64; i++) { const p = b[i]; if (p) { const t = p.toUpperCase(); if (t !== 'K' && t !== 'P') material += PVAL[t]; } }
  const endgame = material < 2600;
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p) continue;
    const t = p.toUpperCase(), white = p < 'a';
    const idx = white ? i : ((7 - (i >> 3)) * 8 + (i & 7));
    const v = PVAL[t] + PST[t === 'K' && endgame ? 'E' : t][idx];
    score += white ? v : -v;
  }
  return s.turn === 'w' ? score : -score;
}

function orderMoves(moves) {
  for (const m of moves) {
    m.o = (m.c ? 10 * PVAL[m.c.toUpperCase()] - PVAL[m.p.toUpperCase()] / 10 : 0) + (m.pr ? PVAL[m.pr] : 0);
  }
  return moves.sort((a, c) => c.o - a.o);
}

function qsearch(s, alpha, beta, depth) {
  const stand = evaluate(s);
  if (depth === 0 || stand >= beta) return stand;
  if (stand > alpha) alpha = stand;
  const me = s.turn, opp = me === 'w' ? 'b' : 'w';
  for (const m of orderMoves(pseudoMoves(s, true))) {
    const ns = makeMove(s, m);
    if (isAttacked(ns.b, kingSq(ns.b, me), opp)) continue;
    const sc = -qsearch(ns, -beta, -alpha, depth - 1);
    if (sc >= beta) return sc;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function search(s, depth, alpha, beta, ply) {
  if (s.half >= 100) return 0;
  if (depth === 0) return qsearch(s, alpha, beta, 4);
  const me = s.turn, opp = me === 'w' ? 'b' : 'w';
  let legalCount = 0;
  for (const m of orderMoves(pseudoMoves(s, false))) {
    const ns = makeMove(s, m);
    if (isAttacked(ns.b, kingSq(ns.b, me), opp)) continue;
    legalCount++;
    const sc = -search(ns, depth - 1, -beta, -alpha, ply + 1);
    if (sc >= beta) return sc;
    if (sc > alpha) alpha = sc;
  }
  if (!legalCount) return inCheck(s) ? -MATE + ply : 0;
  return alpha;
}
/* ENGINE-END */

/* ------------------------------------------------------------------ UI */
(function () {
  const $ = id => document.getElementById(id);
  const boardEl = $('board'), stageEl = $('stage'), promoEl = $('promo');
  const GLYPH = { K: '♚︎', Q: '♛︎', R: '♜︎', B: '♝︎', N: '♞︎', P: '♟︎' };
  const STORE = 'foundry.chess.v1';
  const LEVELS = { 1: { depth: 1, noise: 40 }, 2: { depth: 2, noise: 12 }, 3: { depth: 3, noise: 4 } };

  let G;                       // {start, states[], keys[], moves[{m,san}]}
  let view = 0;                // ply being viewed
  let mode = 'ai', human = 'w', level = 2, flipped = false;
  let sel = -1, focusSq = 52, legal = [], pendingPromo = null;
  let aiToken = 0, thinking = false, drag = null;
  let lastResult = '';

  function storeGet() { try { return localStorage.getItem(STORE); } catch (e) { return null; } }
  function storeSet(v) { try { localStorage.setItem(STORE, v); } catch (e) { /* storage blocked */ } }

  function newGame(fen) {
    const s = parseFEN(fen || START_FEN);
    G = { start: s, states: [s], keys: [positionKey(s)], moves: [] };
    view = 0; sel = -1; pendingPromo = null; lastResult = '';
    aiToken++; thinking = false;
  }
  function cur() { return G.states[G.states.length - 1]; }
  function viewState() { return G.states[view]; }
  function atLive() { return view === G.moves.length; }

  function gameStatus() {
    const s = cur(), moves = legalMoves(s), chk = inCheck(s);
    const who = s.turn === 'w' ? 'White' : 'Black', other = s.turn === 'w' ? 'Black' : 'White';
    if (!moves.length) {
      return chk ? { over: true, text: 'Checkmate. ' + other + ' wins.' } : { over: true, text: 'Draw by stalemate.' };
    }
    if (insufficientMaterial(s.b)) return { over: true, text: 'Draw by insufficient material.' };
    const k = G.keys[G.keys.length - 1];
    if (G.keys.filter(x => x === k).length >= 3) return { over: true, text: 'Draw by threefold repetition.' };
    if (s.half >= 100) return { over: true, text: 'Draw by the fifty-move rule.' };
    return { over: false, text: who + ' to move' + (chk ? ' - check!' : '') };
  }

  function addMove(m) {
    const s = cur(), lm = legalMoves(s);
    const san = sanOf(s, m, lm);
    const ns = makeMove(s, m);
    G.moves.push({ m, san });
    G.states.push(ns);
    G.keys.push(positionKey(ns));
    view = G.moves.length;
    sel = -1; pendingPromo = null;
    return san;
  }

  function doMove(m) {
    const mover = cur().turn === 'w' ? 'White' : 'Black';
    const san = addMove(m);
    const st = gameStatus();
    announce(mover + ' plays ' + describeSan(san) + '. ' + st.text);
    afterChange();
  }

  function describeSan(san) {
    if (san.startsWith('O-O-O')) return 'queenside castling' + san.slice(5);
    if (san.startsWith('O-O')) return 'kingside castling' + san.slice(3);
    return san.replace('x', ' takes ').replace('+', ' check').replace('#', ' checkmate').replace('=', ' promotes to ');
  }

  function afterChange() {
    refreshLegal();
    render();
    save();
    maybeAI();
  }

  function refreshLegal() {
    legal = atLive() && !gameStatus().over ? legalMoves(cur()) : [];
  }

  function canHumanMove() {
    if (!atLive() || gameStatus().over || thinking) return false;
    return mode === 'two' || cur().turn === human;
  }

  /* ---- AI (searched in time slices so the UI stays responsive) ---- */
  function maybeAI() {
    if (mode !== 'ai' || !atLive() || gameStatus().over || cur().turn === human || thinking) return;
    const token = ++aiToken;
    thinking = true;
    render();
    const s = cur(), cfg = LEVELS[level];
    const roots = orderMoves(legalMoves(s));
    const me = s.turn, results = [];
    let i = 0, bestRaw = -Infinity;
    const slice = () => {
      if (token !== aiToken) return;
      const t0 = performance.now();
      while (i < roots.length && performance.now() - t0 < 14) {
        const m = roots[i++], ns = makeMove(s, m);
        const sc = -search(ns, cfg.depth - 1, -Infinity, -(bestRaw - cfg.noise), 1);
        if (sc > bestRaw - cfg.noise) {
          results.push({ m, v: sc + Math.random() * cfg.noise });
          if (sc > bestRaw) bestRaw = sc;
        }
      }
      if (i < roots.length) { setTimeout(slice, 0); return; }
      thinking = false;
      let best = results[0];
      for (const r of results) if (r.v > best.v) best = r;
      if (cur().turn !== me) { render(); return; }
      doMove(best.m);
    };
    setTimeout(slice, 280);
  }

  /* ---- Rendering ---- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function squareLabel(sq, p, extra) {
    let l = sqName(sq) + ', ' + (p ? (colorOf(p) === 'w' ? 'white ' : 'black ') + PIECE_NAMES[p.toUpperCase()] : 'empty');
    return l + extra.map(x => ', ' + x).join('');
  }

  function render() {
    const vs = viewState();
    const lm = view > 0 ? G.moves[view - 1].m : null;
    const chkSq = inCheck(vs) ? kingSq(vs.b, vs.turn) : -1;
    const targets = new Map();
    if (sel >= 0 && canHumanMove()) for (const m of legal) if (m.f === sel) targets.set(m.t, m);
    const hadFocus = boardEl.contains(document.activeElement);
    boardEl.textContent = '';
    boardEl.classList.toggle('locked', !atLive());
    const order = [];
    for (let i = 0; i < 64; i++) order.push(flipped ? 63 - i : i);
    order.forEach((sq, idx) => {
      const r = sq >> 3, f = sq & 7, p = vs.b[sq];
      const d = el('div', 'sq ' + (((r + f) & 1) ? 'dark' : 'light'));
      d.dataset.sq = sq;
      d.setAttribute('role', 'gridcell');
      const extra = [];
      if (sq === sel) { d.classList.add('sel'); extra.push('selected'); }
      if (lm && (sq === lm.f || sq === lm.t)) { d.classList.add('last'); extra.push('last move'); }
      if (sq === chkSq) { d.classList.add('check'); extra.push('king in check'); }
      if (targets.has(sq)) {
        d.classList.add('target');
        if (vs.b[sq] || targets.get(sq).fl === 'ep') { d.classList.add('cap'); extra.push('legal capture'); } else extra.push('legal move');
      }
      if (p && canHumanMove() && colorOf(p) === vs.turn) d.classList.add('canmove');
      d.setAttribute('aria-label', squareLabel(sq, p, extra));
      d.tabIndex = sq === focusSq ? 0 : -1;
      if (p) d.appendChild(el('span', 'piece ' + colorOf(p), GLYPH[p.toUpperCase()]));
      if (idx % 8 === 0) d.appendChild(el('span', 'coord r', String(8 - r)));
      if (idx >= 56) d.appendChild(el('span', 'coord f', FILES[f]));
      boardEl.appendChild(d);
    });
    if (hadFocus) { const f = boardEl.querySelector('.sq[tabindex="0"]'); if (f) f.focus({ preventScroll: true }); }

    const st = gameStatus();
    const statusEl = $('status');
    statusEl.textContent = thinking ? 'Computer is thinking...' : (atLive() ? st.text : 'Viewing move ' + view + ' of ' + G.moves.length);
    statusEl.classList.toggle('over', st.over && atLive());
    $('hint').textContent = !atLive() ? 'Viewing history. Go to the latest move to continue playing.'
      : st.over ? 'Game over. Start a new game or undo.'
        : 'Click or drag a piece, or use the arrow keys and Enter.';
    if (st.over && lastResult !== st.text) { lastResult = st.text; }
    $('fen').value = toFEN(vs);
    $('undoBtn').disabled = G.moves.length === 0;
    $('firstBtn').disabled = $('prevBtn').disabled = view === 0;
    $('nextBtn').disabled = $('lastBtn').disabled = atLive();
    $('modeSel').value = mode; $('sideSel').value = human; $('levelSel').value = String(level);
    $('sideSel').disabled = $('levelSel').disabled = mode !== 'ai';
    renderMoves();
    renderCaptured();
    document.title = 'Chess - ' + (st.over ? st.text : (cur().turn === 'w' ? 'White' : 'Black') + ' to move');
  }

  function renderMoves() {
    const box = $('moves');
    box.textContent = '';
    if (!G.moves.length) { box.appendChild(el('span', 'empty', 'No moves yet.')); return; }
    const blackFirst = G.start.turn === 'b';
    G.moves.forEach((mv, i) => {
      const white = blackFirst ? i % 2 === 1 : i % 2 === 0;
      const num = G.start.full + Math.floor((i + (blackFirst ? 1 : 0)) / 2);
      if (white) box.appendChild(el('span', 'num', num + '.'));
      else if (i === 0) { box.appendChild(el('span', 'num', num + '.')); box.appendChild(el('span', 'num', '...')); }
      const b = el('button', 'mv', mv.san);
      b.type = 'button';
      b.dataset.ply = i + 1;
      b.setAttribute('aria-label', 'Move ' + num + ', ' + (white ? 'white' : 'black') + ', ' + describeSan(mv.san) + '. Jump to this position');
      if (i + 1 === view) b.setAttribute('aria-current', 'true');
      box.appendChild(b);
    });
    const a = box.querySelector('[aria-current="true"]');
    if (a) box.scrollTop = Math.max(0, a.offsetTop - box.clientHeight / 2);
    else if (view === 0) box.scrollTop = 0;
  }

  function renderCaptured() {
    const caps = { w: [], b: [] }; // pieces captured BY that color
    let score = 0;
    for (let i = 0; i < view; i++) {
      const mv = G.moves[i].m, byWhite = (G.start.turn === 'w') === (i % 2 === 0);
      if (mv.c) { caps[byWhite ? 'w' : 'b'].push(mv.c); score += (byWhite ? 1 : -1) * PVAL[mv.c.toUpperCase()] / 100; }
      if (mv.pr) { score += (byWhite ? 1 : -1) * (PVAL[mv.pr] - 100) / 100; }
    }
    const order = 'QRBNP';
    const draw = (box, color) => {
      box.textContent = '';
      box.appendChild(el('span', 'who', (color === 'w' ? 'White' : 'Black') + ' captured:'));
      const list = caps[color].slice().sort((a, b) => order.indexOf(a.toUpperCase()) - order.indexOf(b.toUpperCase()));
      list.forEach(p => { const g = el('span', 'glyph ' + colorOf(p), GLYPH[p.toUpperCase()]); g.setAttribute('aria-hidden', 'true'); box.appendChild(g); });
      if (!list.length) box.appendChild(el('span', 'who', 'none'));
      const adv = color === 'w' ? score : -score;
      if (adv > 0) box.appendChild(el('span', 'adv', '+' + adv));
      box.setAttribute('aria-label', (color === 'w' ? 'White' : 'Black') + ' captured ' + (list.length ? list.map(p => PIECE_NAMES[p.toUpperCase()]).join(', ') : 'nothing') + (adv > 0 ? ', material advantage ' + adv : ''));
    };
    const bottom = flipped ? 'b' : 'w';
    draw($('capBottom'), bottom);
    draw($('capTop'), bottom === 'w' ? 'b' : 'w');
  }

  function announce(text) {
    const live = $('live');
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 30);
  }

  /* ---- Persistence ---- */
  function save() {
    storeSet(JSON.stringify({
      fen: toFEN(G.start), moves: G.moves.map(x => [x.m.f, x.m.t, x.m.pr]),
      mode, human, level, flipped, view
    }));
  }
  function restore() {
    const raw = storeGet();
    if (!raw) return false;
    try {
      const d = JSON.parse(raw);
      newGame(d.fen);
      for (const [f, t, pr] of d.moves) {
        const m = legalMoves(cur()).find(x => x.f === f && x.t === t && (x.pr || '') === (pr || ''));
        if (!m) throw new Error('bad saved move');
        addMove(m);
      }
      if (d.mode === 'ai' || d.mode === 'two') mode = d.mode;
      if (d.human === 'w' || d.human === 'b') human = d.human;
      if (LEVELS[d.level]) level = d.level;
      flipped = !!d.flipped;
      view = Math.min(Math.max(0, d.view | 0), G.moves.length);
      return true;
    } catch (e) { return false; }
  }

  /* ---- Input ---- */
  function tryMove(from, to) {
    if (!canHumanMove()) return false;
    const c = legal.filter(m => m.f === from && m.t === to);
    if (!c.length) return false;
    if (c.length > 1) { openPromo(from, to, c); return true; }
    doMove(c[0]);
    return true;
  }

  function openPromo(from, to, cands) {
    pendingPromo = { from, to };
    const color = cur().turn;
    promoEl.textContent = '';
    for (const pr of 'QRBN') {
      const b = el('button', null, GLYPH[pr]);
      b.type = 'button';
      b.className = 'p' + pr;
      b.classList.add(color === 'w' ? 'wp' : 'bp');
      b.style.color = color === 'w' ? '#fffdf6' : '#1c1a17';
      b.style.textShadow = color === 'w' ? '0 0 1px #000, 0 0 2px #000' : 'none';
      b.setAttribute('aria-label', 'Promote to ' + PIECE_NAMES[pr]);
      b.addEventListener('click', () => {
        const m = cands.find(x => x.pr === pr);
        closePromo();
        if (m) doMove(m);
      });
      promoEl.appendChild(b);
    }
    promoEl.hidden = false;
    promoEl.firstChild.focus();
    announce('Choose a promotion piece: queen, rook, bishop or knight.');
  }
  function closePromo() {
    pendingPromo = null;
    promoEl.hidden = true;
    promoEl.textContent = '';
  }
  promoEl.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePromo(); sel = -1; render(); const f = boardEl.querySelector('.sq[tabindex="0"]'); if (f) f.focus(); }
    else if (e.key === 'Tab') {
      const bs = Array.from(promoEl.querySelectorAll('button')), i = bs.indexOf(document.activeElement);
      e.preventDefault();
      bs[(i + (e.shiftKey ? bs.length - 1 : 1)) % bs.length].focus();
    }
  });

  function clickSquare(sq) {
    focusSq = sq;
    if (!canHumanMove()) { render(); return; }
    if (sel >= 0 && sel !== sq && legal.some(m => m.f === sel && m.t === sq)) {
      if (!tryMove(sel, sq)) render();
      return;
    }
    const p = cur().b[sq];
    if (p && colorOf(p) === cur().turn && sq !== sel && legal.some(m => m.f === sq)) {
      sel = sq;
      announce(squareLabel(sq, p, ['selected', legal.filter(m => m.f === sq).length + ' legal moves']));
    } else {
      sel = -1;
    }
    render();
  }

  function sqAt(x, y) {
    const e = document.elementFromPoint(x, y), s = e && e.closest && e.closest('.sq');
    return s ? Number(s.dataset.sq) : -1;
  }

  boardEl.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const sq = sqAt(e.clientX, e.clientY);
    if (sq < 0 || pendingPromo) return;
    const wasSel = sel === sq;
    const moved = sel >= 0 && sel !== sq && canHumanMove() && legal.some(m => m.f === sel && m.t === sq);
    clickSquare(sq);
    if (moved) { e.preventDefault(); return; }
    if (sel === sq && canHumanMove()) {
      drag = { id: e.pointerId, from: sq, x: e.clientX, y: e.clientY, active: false, ghost: null, wasSel };
      try { boardEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  });
  boardEl.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.active && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5) {
      drag.active = true;
      const p = cur().b[drag.from];
      const size = boardEl.clientWidth / 8;
      const g = el('div', 'ghost glyph ' + colorOf(p), GLYPH[p.toUpperCase()]);
      g.style.fontSize = size * 0.95 + 'px';
      document.body.appendChild(g);
      drag.ghost = g;
      const src = boardEl.querySelector('.sq[data-sq="' + drag.from + '"]');
      if (src) src.classList.add('drag');
    }
    if (drag.active) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; e.preventDefault(); }
  });
  function endDrag(e, cancel) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    try { boardEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (d.ghost) d.ghost.remove();
    if (d.active) {
      const to = cancel ? -1 : sqAt(e.clientX, e.clientY);
      if (to >= 0 && to !== d.from && tryMove(d.from, to)) return;
      render();
    } else if (!cancel && d.wasSel) {
      sel = -1; render(); // clicking the selected piece again deselects it
    }
  }
  boardEl.addEventListener('pointerup', e => endDrag(e, false));
  boardEl.addEventListener('pointercancel', e => endDrag(e, true));
  boardEl.addEventListener('contextmenu', e => e.preventDefault());

  boardEl.addEventListener('keydown', e => {
    const d = e.target.closest && e.target.closest('.sq');
    if (!d) return;
    const sq = Number(d.dataset.sq);
    let dr = 0, df = 0;
    if (e.key === 'ArrowUp') dr = flipped ? 1 : -1;
    else if (e.key === 'ArrowDown') dr = flipped ? -1 : 1;
    else if (e.key === 'ArrowLeft') df = flipped ? 1 : -1;
    else if (e.key === 'ArrowRight') df = flipped ? -1 : 1;
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickSquare(sq); return; }
    else if (e.key === 'Escape') { if (sel >= 0) { sel = -1; render(); } return; }
    else return;
    e.preventDefault();
    const r = (sq >> 3) + dr, f = (sq & 7) + df;
    if (r < 0 || r > 7 || f < 0 || f > 7) return;
    focusSq = r * 8 + f;
    const old = boardEl.querySelector('.sq[tabindex="0"]');
    if (old) old.tabIndex = -1;
    const nx = boardEl.querySelector('.sq[data-sq="' + focusSq + '"]');
    nx.tabIndex = 0; nx.focus();
  });

  /* ---- Controls ---- */
  function goto(p) {
    view = Math.max(0, Math.min(G.moves.length, p));
    sel = -1;
    refreshLegal(); render(); save();
    if (view > 0) announce('Move ' + view + ': ' + describeSan(G.moves[view - 1].san));
    else announce('Start position');
  }
  $('firstBtn').addEventListener('click', () => goto(0));
  $('prevBtn').addEventListener('click', () => goto(view - 1));
  $('nextBtn').addEventListener('click', () => goto(view + 1));
  $('lastBtn').addEventListener('click', () => { goto(G.moves.length); maybeAI(); });
  $('moves').addEventListener('click', e => {
    const b = e.target.closest('button[data-ply]');
    if (b) goto(Number(b.dataset.ply));
  });
  $('flipBtn').addEventListener('click', () => { flipped = !flipped; render(); save(); announce(flipped ? 'Board flipped, Black at the bottom' : 'Board flipped, White at the bottom'); });
  $('newBtn').addEventListener('click', () => {
    newGame(START_FEN);
    $('fenMsg').textContent = '';
    announce('New game started.');
    if (mode === 'ai') flipped = human === 'b';
    afterChange();
  });
  $('undoBtn').addEventListener('click', () => {
    if (!G.moves.length) return;
    aiToken++; thinking = false;
    const pop = () => { G.moves.pop(); G.states.pop(); G.keys.pop(); };
    pop();
    if (mode === 'ai' && G.moves.length && cur().turn !== human) pop();
    view = G.moves.length; sel = -1; lastResult = '';
    announce('Move undone. ' + gameStatus().text);
    afterChange();
  });
  $('modeSel').addEventListener('change', e => { mode = e.target.value; aiToken++; thinking = false; afterChange(); });
  $('sideSel').addEventListener('change', e => {
    human = e.target.value; flipped = human === 'b'; aiToken++; thinking = false; afterChange();
  });
  $('levelSel').addEventListener('change', e => { level = Number(e.target.value); save(); });
  $('loadFen').addEventListener('click', () => {
    const msg = $('fenMsg');
    try {
      newGame($('fen').value);
      msg.className = 'fenmsg ok'; msg.textContent = 'Position loaded.';
      announce('Position loaded from FEN.');
      afterChange();
    } catch (err) {
      msg.className = 'fenmsg'; msg.textContent = 'Invalid FEN: ' + err.message;
    }
  });
  $('copyFen').addEventListener('click', () => {
    const msg = $('fenMsg'), text = $('fen').value;
    const done = ok => { msg.className = ok ? 'fenmsg ok' : 'fenmsg'; msg.textContent = ok ? 'FEN copied to clipboard.' : 'Copy failed - select the text and copy manually.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => done(true), () => { $('fen').select(); done(false); });
    else { $('fen').select(); done(false); }
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault(); $('undoBtn').click();
    }
  });

  /* ---- Boot ---- */
  if (!restore()) { newGame(START_FEN); flipped = false; }
  focusSq = flipped ? 11 : 52;
  refreshLegal();
  render();
  maybeAI();
})();
