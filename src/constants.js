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

  // ── Visual palettes for Themes ─────────────────────────────────────────────
  THEMES: {
    dark: {
      BOARD_BG:      'transparent',
      BOARD_MARGIN:  'transparent',
      GRID:          'rgba(255, 255, 255, 0.1)',
      LABEL:         'rgba(255, 255, 255, 0.3)',
      X_COLOR:       '#A78BFA',
      X_FAINT:       'rgba(167, 139, 250, 0.30)', 
      O_COLOR:       '#F43F5E',
      O_FAINT:       'rgba(244, 63, 94, 0.28)', 
      BLOCK_BASE:    '#4c1d95',
      BLOCK_DARK:    '#2e1065',
      BLOCK_LIGHT:   '#6d28d9',
      BLOCK_MORTAR:  '#1e1b4b',
      LAST_MOVE:     'rgba(124, 58, 237, 0.35)',
      HOVER:         'rgba(255, 255, 255, 0.05)',
      PENDING_HOLE:  'rgba(244, 63, 94, 0.15)',
      LINE_W:        2.5,
      PREVIEW_LINE:  'rgba(255, 255, 255, 0.35)',
    },
    light: {
      BOARD_BG:      'transparent',
      BOARD_MARGIN:  'transparent',
      GRID:          'rgba(0, 0, 0, 0.1)',
      LABEL:         'rgba(0, 0, 0, 0.3)',
      X_COLOR:       '#3B82F6',
      X_FAINT:       'rgba(59, 130, 246, 0.30)', 
      O_COLOR:       '#F97316',
      O_FAINT:       'rgba(249, 115, 22, 0.28)', 
      BLOCK_BASE:    '#60A5FA',
      BLOCK_DARK:    '#2563EB',
      BLOCK_LIGHT:   '#93C5FD',
      BLOCK_MORTAR:  '#1E3A8A',
      LAST_MOVE:     'rgba(59, 130, 246, 0.25)',
      HOVER:         'rgba(0, 0, 0, 0.05)',
      PENDING_HOLE:  'rgba(249, 115, 22, 0.15)',
      LINE_W:        2.5,
      PREVIEW_LINE:  'rgba(0, 0, 0, 0.25)',
    },
    classic: {
      BOARD_BG:      '#F5F0E8',
      BOARD_MARGIN:  '#E5E0D8',
      GRID:          'rgba(0, 0, 0, 0.2)',
      LABEL:         'rgba(0, 0, 0, 0.4)',
      X_COLOR:       '#111827',
      X_FAINT:       'rgba(17, 24, 39, 0.20)', 
      O_COLOR:       '#EF4444',
      O_FAINT:       'rgba(239, 68, 68, 0.20)', 
      BLOCK_BASE:    '#9CA3AF',
      BLOCK_DARK:    '#6B7280',
      BLOCK_LIGHT:   '#D1D5DB',
      BLOCK_MORTAR:  '#4B5563',
      LAST_MOVE:     'rgba(17, 24, 39, 0.15)',
      HOVER:         'rgba(0, 0, 0, 0.05)',
      PENDING_HOLE:  'rgba(239, 68, 68, 0.15)',
      LINE_W:        2.5,
      PREVIEW_LINE:  'rgba(0, 0, 0, 0.3)',
    },
    cyberpunk: {
      BOARD_BG:      'transparent',
      BOARD_MARGIN:  'transparent',
      GRID:          'rgba(57, 255, 20, 0.2)',
      LABEL:         'rgba(57, 255, 20, 0.5)',
      X_COLOR:       '#39FF14',
      X_FAINT:       'rgba(57, 255, 20, 0.30)', 
      O_COLOR:       '#FF1493',
      O_FAINT:       'rgba(255, 20, 147, 0.30)', 
      BLOCK_BASE:    '#FF00FF',
      BLOCK_DARK:    '#8B008B',
      BLOCK_LIGHT:   '#DA70D6',
      BLOCK_MORTAR:  '#4B0082',
      LAST_MOVE:     'rgba(57, 255, 20, 0.35)',
      HOVER:         'rgba(255, 255, 255, 0.1)',
      PENDING_HOLE:  'rgba(255, 20, 147, 0.25)',
      LINE_W:        2.5,
      PREVIEW_LINE:  'rgba(57, 255, 20, 0.5)',
    }
  },
  
  // Current active palette (defaults to dark, overridden in app.js)
  CLR: {},
});