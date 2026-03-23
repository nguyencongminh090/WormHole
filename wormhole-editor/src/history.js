/**
 * history.js
 * Undo / redo stack + move log.
 * Exposed as window.History.
 *
 * The stack stores deep-cloned states.
 * uiState (hover, pendingHole, linePreview) is never persisted.
 */

window.History = (() => {
  'use strict';

  const MAX_UNDO = 200;

  /** @type {Object[]}  */
  let _undoStack = [];
  /** @type {Object[]}  */
  let _redoStack = [];
  /** @type {Object[]}  Ordered log of "significant" moves for the history panel */
  let _moveLog   = [];

  // ── Stack management ───────────────────────────────────────────────────────

  /** Push a snapshot before making a change. */
  function push(state) {
    _undoStack.push(State.clone(state));
    if (_undoStack.length > MAX_UNDO) _undoStack.shift();
    _redoStack = []; // branching invalidates redo
  }

  /** Undo: pop from undo stack, push current onto redo stack.
   *  Returns the restored state, or null if stack is empty. */
  function undo(currentState) {
    if (_undoStack.length === 0) return null;
    _redoStack.push(State.clone(currentState));
    return _undoStack.pop();
  }

  /** Redo: pop from redo stack. */
  function redo(currentState) {
    if (_redoStack.length === 0) return null;
    _undoStack.push(State.clone(currentState));
    return _redoStack.pop();
  }

  function canUndo() { return _undoStack.length > 0; }
  function canRedo() { return _redoStack.length > 0; }

  // ── Move log ───────────────────────────────────────────────────────────────

  /**
   * Record a human-readable move in the log.
   * @param {string} action  e.g. "X h6", "O i9", "Block d5", "Portal A:h13"
   */
  function logMove(action) {
    _moveLog.push({ n: _moveLog.length + 1, action, time: Date.now() });
  }

  function getLog()  { return [..._moveLog]; }
  function clearLog() { _moveLog = []; }

  /**
   * Reset everything (e.g., on board clear).
   */
  function reset() {
    _undoStack = [];
    _redoStack = [];
    _moveLog   = [];
  }

  // ── Serialise log to text ──────────────────────────────────────────────────

  function logToText() {
    return _moveLog.map(e => `${e.n}. ${e.action}`).join('\n');
  }

  return { push, undo, redo, canUndo, canRedo, logMove, getLog, clearLog, reset, logToText };
})();