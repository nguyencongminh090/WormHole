/**
 * tree.js
 * Manages the Directed Acyclic Graph (DAG) for Analysis Mode.
 * Stores board states mapped by their Zobrist hash.
 */

window.Tree = (() => {
  'use strict';

  // Map of Hash -> Node
  // Node: { id, state, parentId, childrenIds: Set, moveAction: string, depth: number }
  const _nodes = new Map();
  let _currentHash = null;
  let _rootHash = null;

  function init(initialState) {
    _nodes.clear();
    const h = window.Bitboard.hashState(initialState);
    _nodes.set(h, {
      id: h,
      state: window.State.clone(initialState),
      parentId: null,
      childrenIds: new Set(),
      moveAction: 'Root',
      depth: 0
    });
    _rootHash = h;
    _currentHash = h;
  }

  function addNode(newState, actionStr) {
    const parentHash = _currentHash;
    const newHash = window.Bitboard.hashState(newState);

    if (!_nodes.has(newHash)) {
      const parentNode = _nodes.get(parentHash);
      _nodes.set(newHash, {
        id: newHash,
        state: window.State.clone(newState),
        parentId: parentHash,
        childrenIds: new Set(),
        moveAction: actionStr,
        depth: parentNode ? parentNode.depth + 1 : 0
      });
    }

    // Link parent to child (DAG edge)
    if (parentHash && _nodes.has(parentHash)) {
      _nodes.get(parentHash).childrenIds.add(newHash);
    }

    _currentHash = newHash;
    return newHash;
  }

  function setCurrent(hash) {
    if (_nodes.has(hash)) {
      _currentHash = hash;
      return window.State.clone(_nodes.get(hash).state);
    }
    return null;
  }

  function getCurrentNode() {
    return _nodes.get(_currentHash);
  }

  function getRootHash() { return _rootHash; }
  function getCurrentHash() { return _currentHash; }
  function getNode(hash) { return _nodes.get(hash); }
  function getAllNodes() { return Array.from(_nodes.values()); }

  // Fallback for legacy History methods in app.js
  function canUndo() { 
    const curr = getCurrentNode();
    return curr && curr.parentId !== null; 
  }
  
  function undo() {
    const curr = getCurrentNode();
    if (curr && curr.parentId) {
      _currentHash = curr.parentId;
      return window.State.clone(_nodes.get(_currentHash).state);
    }
    return null;
  }

  // Redo will now mean "go to the first child". 
  function canRedo() { 
    const curr = getCurrentNode();
    return curr && curr.childrenIds.size > 0; 
  }
  
  function redo() {
    const curr = getCurrentNode();
    if (curr && curr.childrenIds.size > 0) {
      // Pick first child for simple redo
      _currentHash = Array.from(curr.childrenIds)[0];
      return window.State.clone(_nodes.get(_currentHash).state);
    }
    return null;
  }

  // Returns the linear path from Root to Current Node
  function getLog() {
    const path = [];
    let curr = getCurrentNode();
    while (curr) {
      if (curr.parentId !== null) { // skip root
        path.unshift({ action: curr.moveAction, hash: curr.id });
      }
      curr = curr.parentId ? _nodes.get(curr.parentId) : null;
    }
    return path.map((item, idx) => ({ n: idx + 1, action: item.action, hash: item.hash }));
  }

  // For compatibility with app.js History.reset()
  function reset() {
    // If called without state, it implies clearing everything
    _nodes.clear();
    _currentHash = null;
    _rootHash = null;
  }

  // For compatibility with app.js History.logMove()
  function logMove(actionStr, newState) {
    return addNode(newState, actionStr);
  }

  return { 
    init, addNode, setCurrent, getCurrentNode, getRootHash, getCurrentHash, 
    getNode, getAllNodes, canUndo, undo, canRedo, redo, getLog, reset, logMove 
  };
})();
