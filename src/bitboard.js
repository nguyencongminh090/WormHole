/**
 * bitboard.js
 * Implements Zobrist Hashing (64-bit BigInt) for fast DAG state comparison.
 * Maps 19x19 board cells + move numbers into a compact identifier.
 */

window.Bitboard = (() => {
  'use strict';

  function randomBigInt64() {
    const high = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
    const low = BigInt(Math.floor(Math.random() * 0xFFFFFFFF));
    return (high << 32n) | low;
  }

  const MAX_CELLS = 19 * 19;
  const MAX_MOVES = 400; // Safe upper bound for 19x19

  // Zobrist random numbers
  const ZOBRIST = {
    pieces: new Array(MAX_CELLS).fill(null).map(() => ({
      // Arrays for stones because move order/number matters in this editor
      X: new Array(MAX_MOVES).fill(0n).map(randomBigInt64),
      O: new Array(MAX_MOVES).fill(0n).map(randomBigInt64),
      W: randomBigInt64(),
      H: randomBigInt64(),
    })),
    boardSize: new Array(20).fill(0n).map(randomBigInt64)
  };

  function getCellIndex(colLetter, rowNum) {
    if (!window.C || !window.C.COLS) return 0;
    const c = window.C.COLS.indexOf(colLetter);
    const r = rowNum - 1;
    return r * 19 + c;
  }

  /**
   * Generates a unique hash for the board state.
   */
  function hashState(state) {
    let h = 0n;
    h ^= ZOBRIST.boardSize[state.boardSize] || 0n;

    for (const key in state.cells) {
      const cell = state.cells[key];
      const [colLetter, rowStr] = key.split(',');
      const idx = getCellIndex(colLetter, parseInt(rowStr, 10));
      
      if (idx < 0 || idx >= MAX_CELLS) continue;

      if (cell.type === window.C.TYPE.STONE_X) {
        h ^= ZOBRIST.pieces[idx].X[cell.moveNum || 0] || 0n;
      } else if (cell.type === window.C.TYPE.STONE_O) {
        h ^= ZOBRIST.pieces[idx].O[cell.moveNum || 0] || 0n;
      }
    }

    return h.toString(16);
  }

  return { hashState };
})();
