/**
 * constants.js
 * Global constants for the Wormhole Gomoku Editor.
 * Exposed as window.C — loaded first, used by all other modules.
 */

window.C = Object.freeze({

  // ── Rendering ──────────────────────────────────────────────────────────────
  CELL_SIZE:   36,
  MARGIN:      44,   // space for coordinate labels
  STONE_R:     0.43, // stone radius as fraction of CELL_SIZE

  // ── Board ──────────────────────────────────────────────────────────────────
  BOARD_SIZES: [9, 13, 15, 17, 19],
  DEFAULT_SIZE: 17,
  COLS: 'abcdefghijklmnopqrs', // max 19

  // ── Cell / piece types ─────────────────────────────────────────────────────
  TYPE: Object.freeze({
    STONE_X: 'X',
    STONE_O: 'O',
    BLOCK:   'block',
    HOLE:    'hole',
  }),

  // ── Editor tools ───────────────────────────────────────────────────────────
  TOOL: Object.freeze({
    STONE_X: 'stone_x',
    STONE_O: 'stone_o',
    BLOCK:   'block',
    HOLE:    'hole',
    LINE:    'line',
    ERASER:  'eraser',
  }),

  // ── Portal (hole) color palette ────────────────────────────────────────────
  HOLE_COLORS: [
    { id: 'red',    fill: '#e74c3c', stroke: '#922b21' },
    { id: 'blue',   fill: '#2980b9', stroke: '#1a5276' },
    { id: 'green',  fill: '#27ae60', stroke: '#1e8449' },
    { id: 'orange', fill: '#e67e22', stroke: '#ca6f1e' },
    { id: 'purple', fill: '#8e44ad', stroke: '#6c3483' },
  ],

  // ── Analysis line colors ───────────────────────────────────────────────────
  LINE_COLORS: [
    { id: 'red',    hex: '#e74c3c' },
    { id: 'blue',   hex: '#2980b9' },
    { id: 'green',  hex: '#27ae60' },
    { id: 'orange', hex: '#e67e22' },
    { id: 'black',  hex: '#1a1a1a' },
  ],

  // ── Visual palette ─────────────────────────────────────────────────────────
  CLR: Object.freeze({
    BOARD_BG:      '#E8C97A',   // warm single board tone
    BOARD_BG_DARK: '#E8C97A',   // same (unused now)
    BOARD_MARGIN:  '#1e2330',   // dark margin outside board
    GRID:          '#B89040',
    LABEL:         '#8B6820',

    STONE_X_A: '#444444',  // kept for compat
    STONE_X_B: '#111111',
    STONE_O_A: '#FFFFFF',
    STONE_O_B: '#CCCCCC',
    STONE_X_NUM: '#FFFFFF',
    STONE_O_NUM: '#222222',

    // Plain symbol mode (no circle)
    STONE_X_PLAIN:     '#1e2033',   // dark cross stroke
    STONE_O_PLAIN:     '#1e2033',   // dark ring stroke
    STONE_X_NUM_PLAIN: '#1e2033',   // number on board for X
    STONE_O_NUM_PLAIN: '#1e2033',   // number on board for O

    BLOCK_BASE:  '#CC2200',
    BLOCK_DARK:  '#8B0000',
    BLOCK_LIGHT: '#E04030',
    BLOCK_MORTAR:'#771100',

    LAST_MOVE: 'rgba(255, 220, 30, 0.55)',
    HOVER:     'rgba(150, 150, 150, 0.28)',
    PENDING_HOLE: 'rgba(80, 80, 200, 0.18)',

    LINE_W:    2.5,
    PREVIEW_LINE: 'rgba(80, 80, 80, 0.45)',
  }),
});