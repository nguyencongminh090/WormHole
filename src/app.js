/**
 * app.js
 * Main application controller.
 * Wires DOM events to state actions and drives re-renders.
 */

(function () {
  'use strict';

  // ── App state ──────────────────────────────────────────────────────────────

  let gameState = State.create();
  let urlUpdateTimer = null;

  /** Transient UI state — never saved to history */
  const ui = {
    tool:            C.TOOL.STONE_X,
    holeColorId:     C.HOLE_COLORS[0].id,
    lineColorId:     C.LINE_COLORS[0].id,
    hoverCell:       null,
    pendingHole:     null,   // { groupId, pos: {col, row} } – waiting for second portal
    pendingHolePos:  null,   // position for highlight
    linePreview:     null,   // { from: {col, row} }  – first line click done
    mousePos:        { x: 0, y: 0 },
  };

  // ── DOM refs ───────────────────────────────────────────────────────────────

  const canvas      = document.getElementById('board-canvas');
  const ctx         = canvas.getContext('2d');

  const elBoardSize    = document.getElementById('board-size-select');
  const elBtnUndo      = document.getElementById('btn-undo');
  const elBtnRedo      = document.getElementById('btn-redo');
  const elBtnExport    = document.getElementById('btn-export');
  const elBtnCopyImg   = document.getElementById('btn-copy-img');
  const elBtnClear     = document.getElementById('btn-clear');
  const elHistoryList  = document.getElementById('history-list');
  const elHolesList    = document.getElementById('holes-list');
  const elPendingHint  = document.getElementById('pending-hole-hint');
  const elNotationIn   = document.getElementById('notation-input');
  const elBtnCopyNot   = document.getElementById('btn-copy-notation');
  const elBtnParseNot  = document.getElementById('btn-parse-notation');
  const elStatusCursor = document.getElementById('status-cursor');
  const elStatusTool   = document.getElementById('status-tool');
  const elStatusMove   = document.getElementById('status-move');

  const elModalOverlay  = document.getElementById('modal-overlay');
  const elModalConfirm  = document.getElementById('modal-confirm');
  const elModalCancel   = document.getElementById('modal-cancel');
  const elModalMsg      = document.getElementById('modal-message');

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function init() {
    buildToolPalette();
    buildHoleColorPicker();
    buildLineColorPicker();
    bindCanvasEvents();
    bindToolbarEvents();
    bindKeyboard();

    // Cancel pending portal
    const cancelPortalBtn = document.getElementById('btn-cancel-portal');
    if (cancelPortalBtn) cancelPortalBtn.addEventListener('click', cancelPendingOps);

    // Collapsible panels
    document.querySelectorAll('.panel-hd[data-toggle]').forEach(hd => {
      hd.addEventListener('click', (e) => {
        // Don't toggle if clicking a button inside the header
        if (e.target.closest('.sm-btn') || e.target.closest('.panel-actions')) return;
        const panel = document.getElementById(hd.dataset.toggle);
        if (panel) panel.classList.toggle('collapsed');
      });
    });

    // Parse shareable URL parameter if present
    const params = new URLSearchParams(window.location.search);
    const encodedPos = params.get('pos');
    if (encodedPos) {
      _decodeUrlPos(encodedPos).then(notation => {
        const parsed = Notation.parse(notation);
        if (parsed.errors.length === 0) {
          gameState = parsed.state;
        } else {
          console.error("Errors parsing URL position:", parsed.errors);
          showToast("Failed to load position from link.", "error");
        }
        _finishInit();
      });
    } else {
      _finishInit();
    }
  }

  function _finishInit() {
    redraw();
    refreshSidePanel();
  }

  async function _decodeUrlPos(base64UrlSafe) {
    try {
      let base64 = base64UrlSafe.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return await new Response(stream).text();
    } catch (e) {
      // Fallback for old uncompressed links
      try { return atob(base64UrlSafe); } catch (err) { return ''; }
    }
  }

  function syncUrl() {
    clearTimeout(urlUpdateTimer);
    urlUpdateTimer = setTimeout(async () => {
      try {
        const notation = Notation.serialise(gameState);
        const url = new URL(window.location.href);
        if (notation === `SIZE:${gameState.boardSize}`) {
          url.searchParams.delete('pos');
        } else {
          const stream = new Blob([notation]).stream().pipeThrough(new CompressionStream('deflate-raw'));
          const buffer = await new Response(stream).arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          url.searchParams.set('pos', b64);
        }
        window.history.replaceState({}, '', url.toString());
      } catch (e) {
        // ignore errors
      }
    }, 400);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function redraw() {
    Renderer.render(canvas, gameState, ui);
    syncNotation();
    refreshUndoRedo();
    elStatusMove.textContent = `Move: ${gameState.moveCounter}`;
    syncUrl();
  }

  // ── Tool palette ───────────────────────────────────────────────────────────

  function buildToolPalette() {
    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => setTool(btn.dataset.tool));
    });
  }

  function setTool(tool) {
    ui.tool = tool;
    // Cancel any pending operation when switching tools
    cancelPendingOps();

    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    const names = {
      stone_x: 'Black Stone (X)',
      stone_o: 'White Stone (O)',
      block:   'Block / Wall',
      hole:    'Portal Hole',
      line:    'Analysis Line',
      eraser:  'Eraser',
    };
    elStatusTool.textContent = 'Tool: ' + (names[tool] || tool);
  }

  function cancelPendingOps() {
    if (ui.pendingHole) {
      // Remove the orphaned first portal
      const pos = ui.pendingHole.pos;
      const ns  = State.erase(gameState, pos.col, pos.row);
      if (ns) { gameState = ns; }
    }
    ui.pendingHole    = null;
    ui.pendingHolePos = null;
    ui.linePreview    = null;
    elPendingHint.classList.remove('visible');
    refreshSidePanel();
    redraw();
  }

  // ── Hole color picker ──────────────────────────────────────────────────────

  function buildHoleColorPicker() {
    const picker = document.getElementById('hole-color-picker');
    C.HOLE_COLORS.forEach(color => {
      const dot = document.createElement('span');
      dot.className = 'color-dot' + (color.id === ui.holeColorId ? ' active' : '');
      dot.style.background = color.fill;
      dot.title = color.id;
      dot.addEventListener('click', () => {
        ui.holeColorId = color.id;
        picker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        setTool(C.TOOL.HOLE);
      });
      picker.appendChild(dot);
    });
  }

  // ── Line color picker ──────────────────────────────────────────────────────

  function buildLineColorPicker() {
    const picker = document.getElementById('line-color-picker');
    C.LINE_COLORS.forEach(color => {
      const dot = document.createElement('span');
      dot.className = 'color-dot' + (color.id === ui.lineColorId ? ' active' : '');
      dot.style.background = color.hex;
      dot.title = color.id;
      dot.addEventListener('click', () => {
        ui.lineColorId = color.id;
        picker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        setTool(C.TOOL.LINE);
      });
      picker.appendChild(dot);
    });
  }

  // ── Canvas events ──────────────────────────────────────────────────────────

  function bindCanvasEvents() {
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('click',     onCanvasClick);
    canvas.addEventListener('mouseleave', () => {
      ui.hoverCell = null;
      ui.mousePos  = { x: 0, y: 0 };
      redraw();
    });
    canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      const cell = _hitCell(e);
      if (cell) onErase(cell.col, cell.row);
    });
  }

  function _hitCell(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top)  * scaleY;
    return Renderer.pixelToCell(px, py, gameState.boardSize);
  }

  function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    ui.mousePos = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
    ui.hoverCell = Renderer.pixelToCell(ui.mousePos.x, ui.mousePos.y, gameState.boardSize);

    if (ui.hoverCell) {
      elStatusCursor.textContent = Notation.cellLabel(ui.hoverCell.col, ui.hoverCell.row);
    }
    redraw();
  }

  function onCanvasClick(e) {
    const cell = _hitCell(e);
    if (!cell) return;

    switch (ui.tool) {
      case C.TOOL.STONE_X: onPlaceStone(cell, 'X'); break;
      case C.TOOL.STONE_O: onPlaceStone(cell, 'O'); break;
      case C.TOOL.BLOCK:   onPlaceBlock(cell);       break;
      case C.TOOL.HOLE:    onPlaceHole(cell);         break;
      case C.TOOL.LINE:    onPlaceLine(cell);         break;
      case C.TOOL.ERASER:  onErase(cell.col, cell.row); break;
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  function onPlaceStone(cell, player) {
    History.push(gameState);
    const ns = State.placeStone(gameState, cell.col, cell.row, player);
    if (!ns) { History.undo(gameState); return; } // no-op, pop undo
    History.logMove(`${player} ${Notation.cellLabel(cell.col, cell.row)}`);
    gameState = ns;

    const elAutoSwitch = document.getElementById('auto-switch-cb');
    if (elAutoSwitch && elAutoSwitch.checked) {
      if (player === 'X') setTool(C.TOOL.STONE_O);
      else if (player === 'O') setTool(C.TOOL.STONE_X);
    }

    redraw();
    refreshSidePanel();
  }

  function onPlaceBlock(cell) {
    History.push(gameState);
    const ns = State.placeBlock(gameState, cell.col, cell.row);
    if (!ns) { History.undo(gameState); return; }
    History.logMove(`Block ${Notation.cellLabel(cell.col, cell.row)}`);
    gameState = ns;
    redraw();
    refreshSidePanel();
  }

  function onPlaceHole(cell) {
    if (!ui.pendingHole) {
      // First portal click
      History.push(gameState);
      const result = State.startHole(gameState, cell.col, cell.row, ui.holeColorId);
      if (result.error) {
        showToast(result.error, 'error');
        History.undo(gameState);
        return;
      }
      gameState = result.state;
      ui.pendingHole    = { groupId: result.groupId, pos: { col: cell.col, row: cell.row } };
      ui.pendingHolePos = { col: cell.col, row: cell.row };
      elPendingHint.classList.add('visible');
      redraw();
      refreshSidePanel();
    } else {
      // Second portal click
      const result = State.completeHole(gameState, cell.col, cell.row, ui.pendingHole.groupId);
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      History.logMove(`Portal ${ui.holeColorId} ${Notation.cellLabel(ui.pendingHole.pos.col, ui.pendingHole.pos.row)} ↔ ${Notation.cellLabel(cell.col, cell.row)}`);
      gameState         = result.state;
      ui.pendingHole    = null;
      ui.pendingHolePos = null;
      elPendingHint.classList.remove('visible');
      redraw();
      refreshSidePanel();
    }
  }

  function onPlaceLine(cell) {
    if (!ui.linePreview) {
      // First click
      ui.linePreview = { from: { col: cell.col, row: cell.row } };
      redraw();
    } else {
      // Second click
      History.push(gameState);
      const ns = State.addLine(gameState, ui.linePreview.from, { col: cell.col, row: cell.row }, ui.lineColorId);
      if (ns) {
        History.logMove(`Line ${Notation.cellLabel(ui.linePreview.from.col, ui.linePreview.from.row)} → ${Notation.cellLabel(cell.col, cell.row)}`);
        gameState = ns;
      }
      ui.linePreview = null;
      redraw();
      refreshSidePanel();
    }
  }

  function onErase(col, row) {
    History.push(gameState);
    const ns = State.erase(gameState, col, row);
    if (!ns) { History.undo(gameState); return; }
    History.logMove(`Erase ${Notation.cellLabel(col, row)}`);
    gameState = ns;
    redraw();
    refreshSidePanel();
  }

  // ── Toolbar events ─────────────────────────────────────────────────────────

  function bindToolbarEvents() {
    elBoardSize.value = String(gameState.boardSize);
    elBoardSize.addEventListener('change', () => {
      const sz = parseInt(elBoardSize.value, 10);
      confirm('Change board size? This will clear the board.', () => {
        History.reset();
        gameState = State.setBoardSize(gameState, sz);
        cancelPendingOps();
        redraw();
        refreshSidePanel();
      });
    });


    elBtnUndo.addEventListener('click', doUndo);
    elBtnRedo.addEventListener('click', doRedo);

    elBtnExport.addEventListener('click', () => {
      Export.downloadPNG(canvas, gameState);
    });

    elBtnCopyImg.addEventListener('click', async () => {
      try {
        await Export.copyToClipboard(gameState);
        showToast('Image copied to clipboard!');
      } catch {
        showToast('Clipboard not available. Use Export PNG instead.', 'error');
      }
    });

    const elBtnShareLink = document.getElementById('btn-share-link');
    if (elBtnShareLink) {
      elBtnShareLink.addEventListener('click', () => {
        try {
          // Address bar is already synced, just copy it
          const url = window.location.href;
          navigator.clipboard.writeText(url).then(() => {
            showToast('Shareable link copied to clipboard!');
          }).catch(() => {
            showToast('Failed to write to clipboard.', 'error');
            console.error(url);
          });
        } catch (e) {
          console.error(e);
          showToast('Failed to copy link.', 'error');
        }
      });
    }

    document.getElementById('btn-clear-lines').addEventListener('click', () => {
      const ns = State.clearLines(gameState);
      if (ns) {
        History.push(gameState);
        History.logMove('Clear Lines');
        gameState = ns;
        redraw();
        showToast('Analysis lines cleared.');
      }
    });

    elBtnClear.addEventListener('click', () => {
      confirm('Clear the entire board?', () => {
        History.reset();
        gameState = State.clearBoard(gameState);
        cancelPendingOps();
        redraw();
        refreshSidePanel();
      });
    });

    elBtnCopyNot.addEventListener('click', () => {
      const text = elNotationIn.value;
      navigator.clipboard.writeText(text).then(() => showToast('Notation copied!'));
    });

    elBtnParseNot.addEventListener('click', () => {
      const text = elNotationIn.value.trim();
      if (!text) return;
      const result = Notation.parse(text);
      if (result.errors.length) {
        showToast('Parsed with warnings. Check console.', 'warn');
        console.warn('Notation parse warnings:', result.errors);
      } else {
        showToast('Position loaded!');
      }
      History.reset();
      gameState = result.state;
      elBoardSize.value = String(gameState.boardSize);
      cancelPendingOps();
      redraw();
      refreshSidePanel();
    });
  }

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  function doUndo() {
    cancelPendingOps();
    const prev = History.undo(gameState);
    if (prev) { gameState = prev; redraw(); refreshSidePanel(); }
  }

  function doRedo() {
    cancelPendingOps();
    const next = History.redo(gameState);
    if (next) { gameState = next; redraw(); refreshSidePanel(); }
  }

  function refreshUndoRedo() {
    elBtnUndo.disabled = !History.canUndo();
    elBtnRedo.disabled = !History.canRedo();
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  function bindKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); doRedo(); return; }

      const keyMap = {
        'x': C.TOOL.STONE_X,
        'o': C.TOOL.STONE_O,
        'b': C.TOOL.BLOCK,
        'h': C.TOOL.HOLE,
        'l': C.TOOL.LINE,
        'e': C.TOOL.ERASER,
        'Escape': null,
      };
      if (e.key === 'Escape') { cancelPendingOps(); return; }
      if (keyMap[e.key]) setTool(keyMap[e.key]);
    });
  }

  // ── Side panel ─────────────────────────────────────────────────────────────

  function refreshSidePanel() {
    _renderHolesList();
    _renderHistoryList();
  }

  function _renderHolesList() {
    elHolesList.innerHTML = '';
    const pairs = gameState.holePairs;
    const keys  = Object.keys(pairs);

    if (keys.length === 0) {
      elHolesList.innerHTML = '<div class="empty-hint">No portals placed.</div>';
      return;
    }

    keys.forEach((groupId, idx) => {
      const pair  = pairs[groupId];
      const color = C.HOLE_COLORS.find(c => c.id === pair.colorId) || C.HOLE_COLORS[0];
      const label = String.fromCharCode(65 + idx);

      const div       = document.createElement('div');
      div.className   = 'hole-entry';

      const dot       = document.createElement('span');
      dot.className   = 'hole-dot';
      dot.style.background = color.fill;
      dot.textContent = label;

      const p1 = pair.positions[0];
      const p2 = pair.positions[1];
      const info = document.createElement('span');
      info.className = 'hole-info';
      info.textContent = p2
        ? `${Notation.cellLabel(p1.col, p1.row)} ↔ ${Notation.cellLabel(p2.col, p2.row)}`
        : `${Notation.cellLabel(p1.col, p1.row)} (incomplete)`;

      const del = document.createElement('button');
      del.className   = 'hole-del-btn';
      del.textContent = '✕';
      del.title       = 'Remove portal pair';
      del.addEventListener('click', () => {
        History.push(gameState);
        // Erase both ends
        if (p2) { const ns = State.erase(gameState, p2.col, p2.row); if (ns) gameState = ns; }
        if (p1) { const ns = State.erase(gameState, p1.col, p1.row); if (ns) gameState = ns; }
        redraw();
        refreshSidePanel();
      });

      div.appendChild(dot);
      div.appendChild(info);
      div.appendChild(del);
      elHolesList.appendChild(div);
    });
  }

  function _renderHistoryList() {
    const log = History.getLog();
    elHistoryList.innerHTML = '';

    if (log.length === 0) {
      elHistoryList.innerHTML = '<div class="empty-hint">No moves yet.</div>';
      return;
    }

    // Reverse so newest is on top
    [...log].reverse().forEach(entry => {
      const div = document.createElement('div');
      div.className   = 'history-entry';
      div.innerHTML   = `<span class="hist-num">${entry.n}.</span> <span class="hist-action">${entry.action}</span>`;
      elHistoryList.appendChild(div);
    });
  }

  // ── Notation sync ──────────────────────────────────────────────────────────

  function syncNotation() {
    // Don't overwrite if user is actively editing
    if (document.activeElement === elNotationIn) return;
    elNotationIn.value = Notation.serialise(gameState);
  }

  // ── Modal confirm ──────────────────────────────────────────────────────────

  let _confirmCallback = null;

  function confirm(message, callback) {
    elModalMsg.textContent = message;
    _confirmCallback = callback;
    elModalOverlay.classList.remove('hidden');
  }

  elModalConfirm.addEventListener('click', () => {
    elModalOverlay.classList.add('hidden');
    if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
  });
  elModalCancel.addEventListener('click', () => {
    elModalOverlay.classList.add('hidden');
    _confirmCallback = null;
  });

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className   = `toast toast-${type} visible`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }

  // ── Start ──────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', init);
})();