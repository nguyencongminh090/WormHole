/**
 * notation.js — Wormhole Gomoku Editor
 * Serialize / parse board positions.
 * Exposed as window.Notation.
 *
 * FORMAT:
 *   SIZE:17
 *   X:h6(1),g8(3)
 *   O:i6(2),h8(4)
 *   BLOCK:d5,l5,n5
 *   PORTAL:red(h13:m13),blue(l8:l13)
 *   LINE:red(h6>l10),blue(g7>j10)
 */

window.Notation = (() => {
  'use strict';

  function _keyToStr(key)   { return key.replace(',', ''); }
  function _parsePos(str) {
    const m = str.trim().match(/^([a-s])(\d{1,2})$/);
    if (!m) return null;
    return { col: m[1], row: parseInt(m[2], 10) };
  }
  function _posStr(col, row) { return `${col}${row}`; }

  // ── Serialise ────────────────────────────────────────────────────────────

  function serialise(state) {
    const out = [];
    out.push(`SIZE:${state.boardSize}`);

    const xs = [], os = [];
    for (const [key, cell] of Object.entries(state.cells)) {
      if (cell.type === C.TYPE.STONE_X) xs.push({ s: _keyToStr(key), n: cell.moveNum });
      if (cell.type === C.TYPE.STONE_O) os.push({ s: _keyToStr(key), n: cell.moveNum });
    }
    xs.sort((a, b) => a.n - b.n);
    os.sort((a, b) => a.n - b.n);
    if (xs.length) out.push('X:' + xs.map(e => `${e.s}(${e.n})`).join(','));
    if (os.length) out.push('O:' + os.map(e => `${e.s}(${e.n})`).join(','));

    const blocks = Object.entries(state.cells)
      .filter(([, c]) => c.type === C.TYPE.BLOCK)
      .map(([key]) => _keyToStr(key));
    if (blocks.length) out.push('BLOCK:' + blocks.join(','));

    const portals = [];
    for (const pair of Object.values(state.holePairs)) {
      if (pair.positions[0] && pair.positions[1]) {
        const p1 = pair.positions[0], p2 = pair.positions[1];
        portals.push(`${pair.colorId}(${_posStr(p1.col, p1.row)}:${_posStr(p2.col, p2.row)})`);
      }
    }
    if (portals.length) out.push('PORTAL:' + portals.join(','));

    const lines = state.lines.map(l =>
      `${l.colorId}(${_posStr(l.from.col, l.from.row)}>${_posStr(l.to.col, l.to.row)})`
    );
    if (lines.length) out.push('LINE:' + lines.join(','));

    return out.join('\n');
  }

  // ── Parse ────────────────────────────────────────────────────────────────

  function parse(text) {
    const errors = [];
    const rawLines = text.trim().split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    let boardSize = C.DEFAULT_SIZE;
    const sizeLine = rawLines.find(l => l.startsWith('SIZE:'));
    if (sizeLine) {
      const sz = parseInt(sizeLine.slice(5), 10);
      if (C.BOARD_SIZES.includes(sz)) boardSize = sz;
      else errors.push(`Unknown board size ${sz}.`);
    }

    let state = State.create(boardSize);

    const stones = [];

    // Parse non-stone elements first, and collect stones
    for (const line of rawLines) {
      if (line.startsWith('SIZE:')) continue;

      if (line.startsWith('X:') || line.startsWith('O:')) {
        const player = line[0];
        _splitCSV(line.slice(2)).forEach(tok => {
          const m = tok.match(/^([a-s]\d{1,2})(?:\((\d+)\))?$/);
          if (!m) { errors.push(`Bad stone token: "${tok}"`); return; }
          const pos = _parsePos(m[1]);
          if (!pos) { errors.push(`Bad position: "${m[1]}"`); return; }
          const num = m[2] ? parseInt(m[2], 10) : 99999;
          stones.push({ col: pos.col, row: pos.row, player, num });
        });
        continue;
      }

      if (line.startsWith('BLOCK:')) {
        _splitCSV(line.slice(6)).forEach(tok => {
          const pos = _parsePos(tok);
          if (!pos) { errors.push(`Bad block: "${tok}"`); return; }
          const ns = State.placeBlock(state, pos.col, pos.row);
          if (ns) state = ns;
        });
        continue;
      }

      if (line.startsWith('PORTAL:')) {
        _splitCSV(line.slice(7)).forEach(tok => {
          const m = tok.match(/^(\w+)\(([a-s]\d{1,2}):([a-s]\d{1,2})\)$/);
          if (!m) { errors.push(`Bad portal token: "${tok}"`); return; }
          const [, colorId, s1, s2] = m;
          const p1 = _parsePos(s1), p2 = _parsePos(s2);
          if (!p1 || !p2) { errors.push(`Bad portal positions in "${tok}"`); return; }
          if (!C.HOLE_COLORS.find(c => c.id === colorId)) {
            errors.push(`Unknown portal color: "${colorId}"`); return;
          }
          const r1 = State.startHole(state, p1.col, p1.row, colorId);
          if (r1.error) { errors.push(r1.error); return; }
          const r2 = State.completeHole(r1.state, p2.col, p2.row, r1.groupId);
          if (r2.error) { errors.push(r2.error); return; }
          state = r2.state;
        });
        continue;
      }

      if (line.startsWith('LINE:')) {
        _splitCSV(line.slice(5)).forEach(tok => {
          const m = tok.match(/^(\w+)\(([a-s]\d{1,2})>([a-s]\d{1,2})\)$/);
          if (!m) { errors.push(`Bad line token: "${tok}"`); return; }
          const [, colorId, sf, st] = m;
          const from = _parsePos(sf), to = _parsePos(st);
          if (!from || !to) { errors.push(`Bad line positions in "${tok}"`); return; }
          const ns = State.addLine(state, from, to, colorId);
          if (ns) state = ns;
        });
        continue;
      }
    }

    // Sort stones by move number and apply sequentially to track history
    stones.sort((a, b) => a.num - b.num);
    const historySteps = [];

    for (const s of stones) {
      historySteps.push({ state: State.clone(state), action: `${s.player} ${cellLabel(s.col, s.row)}` });
      state = _forceStone(state, s.col, s.row, s.player, s.num);
    }

    return { state, errors, historySteps };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  function _splitCSV(str) {
    const result = [];
    let depth = 0, start = 0;
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') depth++;
      else if (str[i] === ')') depth--;
      else if (str[i] === ',' && depth === 0) {
        result.push(str.slice(start, i).trim());
        start = i + 1;
      }
    }
    result.push(str.slice(start).trim());
    return result.filter(Boolean);
  }

  function _forceStone(state, col, row, player, moveNum) {
    const ns  = State.clone(state);
    const key = State.cellKey(col, row);
    ns.cells[key] = { type: player === 'X' ? C.TYPE.STONE_X : C.TYPE.STONE_O, moveNum };
    ns.moveCounter = Math.max(ns.moveCounter, moveNum + 1);
    return ns;
  }

  function cellLabel(col, row) { return `${col.toUpperCase()}${row}`; }

  return { serialise, parse, cellLabel };
})();