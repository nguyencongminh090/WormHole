/**
 * state.js
 * Pure-function state management.
 * All actions accept a state and return a NEW state (or null if no-op).
 * Exposed as window.State.
 */

window.State = (() => {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────

  function cellKey(col, row) { return `${col},${row}`; }
  function colIdx(letter)    { return C.COLS.indexOf(letter); }

  function clone(state) {
    return {
      boardSize:      state.boardSize,
      cells:          { ...state.cells },
      holePairs:      JSON.parse(JSON.stringify(state.holePairs)),
      lines:          state.lines.map(l => ({ ...l, from: { ...l.from }, to: { ...l.to } })),
      moveCounter:    state.moveCounter,
      lastMovePos:    state.lastMovePos ? { ...state.lastMovePos } : null,
      showMoveNumbers: state.showMoveNumbers,
      _nextHoleId:    state._nextHoleId,
    };
  }

  // ── Factory ────────────────────────────────────────────────────────────────

  function create(boardSize = C.DEFAULT_SIZE) {
    return {
      boardSize,
      cells:          {},    // { "col,row": CellData }
      holePairs:      {},    // { groupId: { colorId, label, positions: [pos|null, pos|null] } }
      lines:          [],    // [{ from, to, colorId }]
      moveCounter:    1,
      lastMovePos:    null,
      showMoveNumbers: true,
      _nextHoleId:    1,
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Place a stone. Returns new state or null if cell is blocked.
   */
  function placeStone(state, col, row, player) {
    const key  = cellKey(col, row);
    const cell = state.cells[key];

    // Cannot overwrite blocks or holes
    if (cell && (cell.type === C.TYPE.BLOCK || cell.type === C.TYPE.HOLE)) return null;

    const ns      = clone(state);
    const isNew   = !cell || (cell.type !== C.TYPE.STONE_X && cell.type !== C.TYPE.STONE_O);
    const moveNum = isNew ? ns.moveCounter : cell.moveNum;

    ns.cells[key] = {
      type:    player === 'X' ? C.TYPE.STONE_X : C.TYPE.STONE_O,
      moveNum: moveNum,
    };

    if (isNew) ns.moveCounter++;
    ns.lastMovePos = { col, row };
    return ns;
  }

  /**
   * Place a block/wall. Returns new state or null if already a block.
   */
  function placeBlock(state, col, row) {
    const key  = cellKey(col, row);
    const cell = state.cells[key];
    if (cell && cell.type === C.TYPE.BLOCK) return null;

    const ns = clone(state);
    if (cell && cell.type === C.TYPE.HOLE) _cleanHole(ns, col, row);
    ns.cells[key]  = { type: C.TYPE.BLOCK };
    ns.lastMovePos = null;
    return ns;
  }

  /**
   * Place the FIRST portal of a new pair.
   * Returns { state: newState, groupId } or { error: string }.
   */
  function startHole(state, col, row, colorId) {
    const key  = cellKey(col, row);
    const cell = state.cells[key];

    if (cell) return { error: 'Cell is occupied. Portals must be placed on empty cells.' };

    const ns      = clone(state);
    const groupId = `g${ns._nextHoleId++}`;

    ns.cells[key]        = { type: C.TYPE.HOLE, holeColorId: colorId, holeGroupId: groupId };
    ns.holePairs[groupId] = { colorId, positions: [{ col, row }, null] };

    return { state: ns, groupId };
  }

  /**
   * Place the SECOND portal of an existing pair.
   * Validates Chebyshev distance ≥ 5.
   * Returns { state: newState } or { error: string }.
   */
  function completeHole(state, col, row, groupId) {
    const key  = cellKey(col, row);
    const cell = state.cells[key];
    const pair = state.holePairs[groupId];

    if (cell)  return { error: 'Cell is occupied.' };
    if (!pair) return { error: 'Portal group not found.' };
    if (pair.positions[1]) return { error: 'Portal pair already complete.' };

    // Chebyshev distance check
    const p1   = pair.positions[0];
    const dx   = Math.abs(colIdx(col) - colIdx(p1.col));
    const dy   = Math.abs(row - p1.row);
    const dist = Math.max(dx, dy);
    if (dist < 5) {
      return { error: `Portals must be ≥5 cells apart (Chebyshev). Distance: ${dist}` };
    }

    const ns = clone(state);
    ns.cells[key]                    = { type: C.TYPE.HOLE, holeColorId: pair.colorId, holeGroupId: groupId };
    ns.holePairs[groupId].positions[1] = { col, row };
    return { state: ns };
  }

  /**
   * Erase whatever is at (col, row).
   * Returns new state or null if cell is already empty.
   */
  function erase(state, col, row) {
    const key = cellKey(col, row);
    if (!state.cells[key]) return null;

    const ns = clone(state);
    const cell = state.cells[key];
    if (cell.type === C.TYPE.HOLE) _cleanHole(ns, col, row);
    delete ns.cells[key];
    return ns;
  }

  /**
   * Add an analysis line between two cells.
   */
  function addLine(state, from, to, colorId) {
    if (from.col === to.col && from.row === to.row) return null;
    const ns = clone(state);
    ns.lines.push({ from: { ...from }, to: { ...to }, colorId });
    return ns;
  }

  /**
   * Remove an analysis line by index.
   */
  function removeLine(state, idx) {
    if (idx < 0 || idx >= state.lines.length) return null;
    const ns = clone(state);
    ns.lines.splice(idx, 1);
    return ns;
  }

  /**
   * Change board size — resets everything.
   */
  function setBoardSize(state, size) {
    return create(size);
  }

  /**
   * Clear all pieces, keep board size.
   */
  function clearBoard(state) {
    return create(state.boardSize);
  }

  /**
   * Toggle move-number display.
   */
  function setShowMoveNumbers(state, show) {
    const ns = clone(state);
    ns.showMoveNumbers = Boolean(show);
    return ns;
  }

  /**
   * Manually set move number on an existing stone.
   */
  function setMoveNum(state, col, row, num) {
    const key  = cellKey(col, row);
    const cell = state.cells[key];
    if (!cell || (cell.type !== C.TYPE.STONE_X && cell.type !== C.TYPE.STONE_O)) return null;
    const ns = clone(state);
    ns.cells[key] = { ...cell, moveNum: num };
    return ns;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /** Remove a hole from its pair; also delete the partner if it has one. */
  function _cleanHole(ns, col, row) {
    const key  = cellKey(col, row);
    const cell = ns.cells[key];
    if (!cell || cell.type !== C.TYPE.HOLE) return;

    const groupId = cell.holeGroupId;
    const pair    = ns.holePairs[groupId];
    if (!pair) return;

    // If the OTHER position exists, also erase it
    pair.positions.forEach(pos => {
      if (pos && !(pos.col === col && pos.row === row)) {
        delete ns.cells[cellKey(pos.col, pos.row)];
      }
    });
    delete ns.holePairs[groupId];
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    create,
    clone,
    cellKey,
    colIdx,
    placeStone,
    placeBlock,
    startHole,
    completeHole,
    erase,
    addLine,
    removeLine,
    setBoardSize,
    clearBoard,
    setShowMoveNumbers,
    setMoveNum,
  };
})();