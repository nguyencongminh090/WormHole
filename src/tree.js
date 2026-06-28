/**
 * tree.js
 * Manages the Directed Acyclic Graph (DAG) for Analysis Mode.
 * Stores board states mapped by their Zobrist hash.
 */

window.Tree = (() => {
  'use strict';

  // Map of NodeId -> Node
  // Node: { id, hash, state, parentId, childrenIds: Set, moveAction: string, depth: number }
  const _nodes = new Map();
  let _nodeCounter = 0;
  let _currentNodeId = null;
  let _rootNodeId = null;

  function init(initialState) {
    if (!initialState) {
      initialState = window.State.create();
      // Assume current board size is C.COLS.length
      initialState = window.State.setBoardSize(initialState, window.C.COLS.length);
    }
    _nodeCounter = 0;
    _nodes.clear();
    const h = window.Bitboard.hashState(initialState);
    const id = `node_${_nodeCounter++}`;
    _nodes.set(id, {
      id: id,
      hash: h,
      state: window.State.clone(initialState),
      parentId: null,
      childrenIds: new Set(),
      moveAction: 'Root',
      depth: 0
    });
    _rootNodeId = id;
    _currentNodeId = id;
  }

  function addNode(newState, actionStr) {
    const parentId = _currentNodeId;
    const h = window.Bitboard.hashState(newState);
    const newId = `node_${_nodeCounter++}`;

    const parentNode = _nodes.get(parentId);
    _nodes.set(newId, {
      id: newId,
      hash: h,
      state: window.State.clone(newState),
      parentId: parentId,
      childrenIds: new Set(),
      moveAction: actionStr,
      depth: parentNode ? parentNode.depth + 1 : 0
    });

    // Link parent to child
    if (parentId && _nodes.has(parentId)) {
      _nodes.get(parentId).childrenIds.add(newId);
    }

    _currentNodeId = newId;
    return newId;
  }

  function setCurrent(id) {
    if (_nodes.has(id)) {
      _currentNodeId = id;
      return window.State.clone(_nodes.get(id).state);
    }
    return null;
  }

  function getCurrentNode() {
    return _nodes.get(_currentNodeId);
  }

  function getRootNodeId() { return _rootNodeId; }
  function getCurrentNodeId() { return _currentNodeId; }
  function getNode(id) { return _nodes.get(id); }
  function getAllNodes() { return Array.from(_nodes.values()); }

  // Fallback for legacy History methods in app.js
  function canUndo() { 
    const curr = getCurrentNode();
    return curr && curr.parentId !== null; 
  }
  
  function undo() {
    const curr = getCurrentNode();
    if (curr && curr.parentId) {
      _currentNodeId = curr.parentId;
      return window.State.clone(_nodes.get(_currentNodeId).state);
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
      _currentNodeId = Array.from(curr.childrenIds)[0];
      return window.State.clone(_nodes.get(_currentNodeId).state);
    }
    return null;
  }

  // Returns the linear path from Root to Current Node
  function getLog() {
    const path = [];
    let curr = getCurrentNode();
    while (curr) {
      if (curr.parentId !== null) { // skip root
        path.unshift({ action: curr.moveAction, id: curr.id, hash: curr.hash });
      }
      curr = curr.parentId ? _nodes.get(curr.parentId) : null;
    }
    return path.map((item, idx) => ({ n: idx + 1, action: item.action, id: item.id, hash: item.hash }));
  }

  // For compatibility with app.js History.reset()
  function reset() {
    _nodeCounter = 0;
    _nodes.clear();
    _currentNodeId = null;
    _rootNodeId = null;
  }

  // For compatibility with app.js History.logMove()
  function logMove(actionStr, newState) {
    return addNode(newState, actionStr);
  }

  return { 
    init, addNode, setCurrent, getCurrentNode, getRootNodeId, getCurrentNodeId, 
    getNode, getAllNodes, canUndo, undo, canRedo, redo, getLog, reset, logMove 
  };
})();
