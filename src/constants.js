/**
 * constants.js
 * Global constants for the Wormhole Gomoku Editor.
 * Exposed as window.C — loaded first, used by all other modules.
 */

window.C = Object.freeze({

  // ── Rendering ──────────────────────────────────────────────────────────────
  CELL_SIZE:   36,
  MARGIN:      44,   // space for coordinate labels
  STONE_R:     0.43, // symbol radius as fraction of CELL_SIZE

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
    { id: 'black',  hex: '#c0c0c0' },
  ],

  // ── Visual palette ─────────────────────────────────────────────────────────
  CLR: Object.freeze({
    // Paper board
    BOARD_BG:      '#f5f0e8',   // warm off-white paper
    BOARD_MARGIN:  '#0f1219',   // dark margin (matches glass UI)
    GRID:          '#c8bca0',   // soft pencil-line grid
    LABEL:         '#9a8e78',   // muted label color

    // X and O symbol colors
    X_COLOR:  '#1a1a2e',           // dark ink for X
    X_FAINT:  'rgba(26,26,46,0.30)', // visible X behind numbers
    O_COLOR:  '#c0392b',           // red ink for O
    O_FAINT:  'rgba(192,57,43,0.28)', // visible O behind numbers

    // Block
    BLOCK_BASE:  '#CC2200',
    BLOCK_DARK:  '#8B0000',
    BLOCK_LIGHT: '#E04030',
    BLOCK_MORTAR:'#771100',

    // Highlights
    LAST_MOVE: 'rgba(240, 180, 40, 0.35)',
    HOVER:     'rgba(100, 100, 100, 0.15)',
    PENDING_HOLE: 'rgba(80, 80, 200, 0.12)',

    LINE_W:    2.5,
    PREVIEW_LINE: 'rgba(80, 80, 80, 0.35)',
  }),
});