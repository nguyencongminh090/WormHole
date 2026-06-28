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
      moveCounter:    state.moveCounter,
      lastMovePos:    state.lastMovePos ? { ...state.lastMovePos } : null,
      showMoveNumbers: state.showMoveNumbers,
    };
  }

  // ── Factory ────────────────────────────────────────────────────────────────

  function create(boardSize = C.DEFAULT_SIZE) {
    return {
      boardSize,
      cells:          {},    // { "col,row": CellData }
      moveCounter:    1,
      lastMovePos:    null,
      showMoveNumbers: true,
    };
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Place a stone. Returns new state or { error: string }.
   */
  function placeStone(state, col, row, player, setup = null, strict = false) {
    const key  = cellKey(col, row);
    const cell = state.cells[key];

    if (cell) return { error: 'Cell is occupied by a stone.' };
    if (setup && (setup.blocks[key] || setup.holes[key])) return { error: 'Cell is occupied by a block or portal.' };

    if (strict) {
      // Zero-indexed: 0=X, 1=O, 2=X, 3=O
      const expectedPlayer = ((state.moveCounter - 1) % 2 === 0) ? 'X' : 'O';
      if (player !== expectedPlayer) {
        return { error: `Strict rule enabled: It is ${expectedPlayer}'s turn.` };
      }
    }

    const ns = clone(state);
    ns.cells[key] = {
      type:    player === 'X' ? C.TYPE.STONE_X : C.TYPE.STONE_O,
      moveNum: ns.moveCounter,
    };
    ns.moveCounter++;
    ns.lastMovePos = { col, row };
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
    delete ns.cells[key];
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



  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    create,
    clone,
    cellKey,
    colIdx,
    placeStone,
    erase,
    setBoardSize,
    clearBoard,
    setShowMoveNumbers,
    setMoveNum,
  };
})();