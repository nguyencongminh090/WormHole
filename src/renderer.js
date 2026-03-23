/**
 * renderer.js
 * All canvas drawing logic for the board and pieces.
 * Exposed as window.Renderer.
 */

window.Renderer = (() => {
  'use strict';

  const CS = C.CELL_SIZE;
  const M  = C.MARGIN;

  // ── Coordinate helpers ─────────────────────────────────────────────────────

  function colIdx(letter)     { return C.COLS.indexOf(letter); }
  function cellCx(col)        { return M + colIdx(col) * CS + CS / 2; }
  function cellCy(row)        { return M + (row - 1) * CS + CS / 2; }
  function cellLeft(col)      { return M + colIdx(col) * CS; }
  function cellTop(row)       { return M + (row - 1) * CS; }

  /** Canvas pixel → {col, row} | null */
  function pixelToCell(px, py, boardSize) {
    const ci = Math.floor((px - M) / CS);
    const ri = Math.floor((py - M) / CS);
    if (ci < 0 || ci >= boardSize || ri < 0 || ri >= boardSize) return null;
    return { col: C.COLS[ci], row: ri + 1 };
  }

  /** Canvas size for a given board */
  function canvasSize(boardSize) {
    return M * 2 + boardSize * CS;
  }

  // ── Main render ────────────────────────────────────────────────────────────

  /**
   * Full board redraw.
   * @param {HTMLCanvasElement} canvas
   * @param {Object} state      — game state
   * @param {Object} uiState    — transient UI (hover, pendingHole, linePreview)
   * @param {boolean} forExport — if true, skip hover/preview
   */
  function render(canvas, state, uiState = {}, forExport = false) {
    const sz  = state.boardSize;
    const dim = canvasSize(sz);
    canvas.width  = dim;
    canvas.height = dim;

    const ctx = canvas.getContext('2d');

    _drawBackground(ctx, sz, dim);
    _drawGrid(ctx, sz);
    _drawCoords(ctx, sz);

    // Cell highlights
    if (!forExport) {
      if (uiState.hoverCell) _drawCellBg(ctx, uiState.hoverCell.col, uiState.hoverCell.row, C.CLR.HOVER);
    }
    if (state.lastMovePos) _drawCellBg(ctx, state.lastMovePos.col, state.lastMovePos.row, C.CLR.LAST_MOVE);

    // Pending hole hint
    if (!forExport && uiState.pendingHolePos) {
      _drawCellBg(ctx, uiState.pendingHolePos.col, uiState.pendingHolePos.row, C.CLR.PENDING_HOLE);
    }

    // All cells
    for (const [key, cell] of Object.entries(state.cells)) {
      const [col, rowStr] = key.split(',');
      const row = parseInt(rowStr, 10);
      _drawCell(ctx, col, row, cell, state);
    }

    // Analysis lines
    state.lines.forEach(line => _drawLine(ctx, line));

    // Live preview of line being drawn
    if (!forExport && uiState.linePreview && uiState.mousePos) {
      _drawLinePreview(ctx, uiState.linePreview.from, uiState.mousePos);
    }
  }

  // ── Background & grid ──────────────────────────────────────────────────────

  function _drawBackground(ctx, sz, dim) {
    // Solid margin background
    ctx.fillStyle = C.CLR.BOARD_MARGIN;
    ctx.fillRect(0, 0, dim, dim);
    // Solid board fill
    ctx.fillStyle = C.CLR.BOARD_BG;
    ctx.fillRect(M, M, sz * CS, sz * CS);
  }

  function _drawGrid(ctx, sz) {
    ctx.strokeStyle = C.CLR.GRID;
    ctx.lineWidth   = 0.7;
    for (let i = 0; i <= sz; i++) {
      // Vertical
      ctx.beginPath();
      ctx.moveTo(M + i * CS, M);
      ctx.lineTo(M + i * CS, M + sz * CS);
      ctx.stroke();
      // Horizontal
      ctx.beginPath();
      ctx.moveTo(M,           M + i * CS);
      ctx.lineTo(M + sz * CS, M + i * CS);
      ctx.stroke();
    }
  }

  function _drawCoords(ctx, sz) {
    ctx.fillStyle    = C.CLR.LABEL;
    ctx.font         = `700 ${CS * 0.36}px "Syne", "Inter", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < sz; i++) {
      // Column letters — top
      const cx = M + i * CS + CS / 2;
      ctx.fillText(C.COLS[i].toUpperCase(), cx, M / 2);
      // Row numbers — left
      const cy = M + i * CS + CS / 2;
      ctx.fillText(String(i + 1), M / 2, cy);
    }
  }

  // ── Cell highlight ─────────────────────────────────────────────────────────

  function _drawCellBg(ctx, col, row, color) {
    ctx.fillStyle = color;
    ctx.fillRect(cellLeft(col), cellTop(row), CS, CS);
  }

  // ── Dispatch per cell type ─────────────────────────────────────────────────

  function _drawCell(ctx, col, row, cell, state) {
    const cx = cellCx(col);
    const cy = cellCy(row);

    switch (cell.type) {
      case C.TYPE.STONE_X:
      case C.TYPE.STONE_O:
        _drawStone(ctx, cx, cy, cell.type, state.showMoveNumbers ? cell.moveNum : null);
        break;
      case C.TYPE.BLOCK:
        _drawBlock(ctx, cellLeft(col), cellTop(row));
        break;
      case C.TYPE.HOLE:
        _drawHole(ctx, cx, cy, cell, state.holePairs, col, row);
        break;
    }
  }

  // ── Stone ──────────────────────────────────────────────────────────────────

  function _drawStone(ctx, cx, cy, type, moveNum) {
    const r   = CS * C.STONE_R;
    const isX = type === C.TYPE.STONE_X;
    const hasNum = (moveNum !== null && moveNum !== undefined);

    ctx.save();
    ctx.lineCap = 'round';

    if (isX) {
      // ── Black X: bold cross, no circle ──────────────────────────────────
      if (hasNum) {
        // Faint cross behind number
        const s = r * 0.38;
        ctx.strokeStyle = 'rgba(30,32,51,0.18)';
        ctx.lineWidth   = r * 0.20;
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
        ctx.stroke();
        // Number
        const fs = r * (moveNum > 99 ? 0.56 : 0.72);
        ctx.fillStyle    = C.CLR.STONE_X_NUM_PLAIN;
        ctx.font         = `bold ${fs}px "Syne", sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(moveNum), cx, cy);
      } else {
        // Bold X cross
        const s = r * 0.42;
        ctx.strokeStyle = C.CLR.STONE_X_PLAIN;
        ctx.lineWidth   = r * 0.28;
        ctx.beginPath();
        ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
        ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
        ctx.stroke();
      }
    } else {
      // ── White O: open ring, no filled circle ─────────────────────────────
      if (hasNum) {
        // Faint ring behind number
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30,32,51,0.14)';
        ctx.lineWidth   = r * 0.14;
        ctx.stroke();
        // Number
        const fs = r * (moveNum > 99 ? 0.56 : 0.72);
        ctx.fillStyle    = C.CLR.STONE_O_NUM_PLAIN;
        ctx.font         = `bold ${fs}px "Syne", sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(moveNum), cx, cy);
      } else {
        // Bold O ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.44, 0, Math.PI * 2);
        ctx.strokeStyle = C.CLR.STONE_O_PLAIN;
        ctx.lineWidth   = r * 0.26;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // ── Block / Wall ───────────────────────────────────────────────────────────

  function _drawBlock(ctx, lx, ty) {
    const pad = 1;
    const x = lx + pad, y = ty + pad;
    const w = CS - pad * 2, h = CS - pad * 2;

    // Base fill
    ctx.fillStyle = C.CLR.BLOCK_BASE;
    ctx.fillRect(x, y, w, h);

    // Brick mortar lines
    ctx.strokeStyle = C.CLR.BLOCK_MORTAR;
    ctx.lineWidth   = 1;

    const rows = 3;
    const bh   = h / rows;

    for (let r = 0; r < rows; r++) {
      const by = y + r * bh;
      // Horizontal mortar
      ctx.beginPath();
      ctx.moveTo(x, by); ctx.lineTo(x + w, by);
      ctx.stroke();
      // Vertical mortar (offset every other row)
      const vx = x + (r % 2 === 0 ? w * 0.5 : w * 0.25);
      if (vx > x && vx < x + w) {
        ctx.beginPath();
        ctx.moveTo(vx, by); ctx.lineTo(vx, by + bh);
        ctx.stroke();
      }
    }
    // Bottom line
    ctx.beginPath();
    ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h);
    ctx.stroke();

    // Highlight top edge
    ctx.strokeStyle = C.CLR.BLOCK_LIGHT;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + w, y);
    ctx.stroke();
  }

  // ── Hole / Portal ──────────────────────────────────────────────────────────

  function _drawHole(ctx, cx, cy, cell, holePairs, col, row) {
    const colorDef = C.HOLE_COLORS.find(c => c.id === cell.holeColorId) || C.HOLE_COLORS[0];
    const r        = CS * C.STONE_R;

    // Glow ring
    ctx.save();
    ctx.shadowColor = colorDef.fill;
    ctx.shadowBlur  = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle   = colorDef.fill;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = colorDef.stroke;
    ctx.lineWidth   = 2;
    ctx.stroke();

    // Inner dark void
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fill();

    // Pair label (A, B, C…)
    const pairKeys  = Object.keys(holePairs);
    const pairIndex = pairKeys.indexOf(cell.holeGroupId);
    const label     = pairIndex >= 0 ? String.fromCharCode(65 + pairIndex) : '?';

    // Which end of the pair?
    const pair     = holePairs[cell.holeGroupId];
    const isSecond = pair && pair.positions[1] &&
                     pair.positions[1].col === col &&
                     pair.positions[1].row === row;
    const subLabel = (pair && pair.positions[1]) ? (isSecond ? '₂' : '₁') : '₁';

    ctx.fillStyle    = '#ffffff';
    ctx.font         = `800 ${r * 0.72}px "Syne", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy - r * 0.1);

    // Draw subscript end indicator (₁ or ₂) if pair is complete
    if (pair && pair.positions[1]) {
      ctx.font         = `${r * 0.38}px "Space Mono", monospace`;
      ctx.fillStyle    = 'rgba(255,255,255,0.75)';
      ctx.fillText(isSecond ? '2' : '1', cx + r * 0.32, cy + r * 0.36);
    }

  // ── Analysis lines ─────────────────────────────────────────────────────────

  function _drawLine(ctx, line) {
    const colorDef = C.LINE_COLORS.find(c => c.id === line.colorId) || C.LINE_COLORS[0];
    ctx.save();
    ctx.strokeStyle = colorDef.hex;
    ctx.lineWidth   = C.CLR.LINE_W;
    ctx.lineCap     = 'round';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cellCx(line.from.col), cellCy(line.from.row));
    ctx.lineTo(cellCx(line.to.col),   cellCy(line.to.row));
    ctx.stroke();

    // Arrowhead at end
    _drawArrow(ctx,
      cellCx(line.from.col), cellCy(line.from.row),
      cellCx(line.to.col),   cellCy(line.to.row),
      colorDef.hex
    );
    ctx.restore();
  }

  function _drawArrow(ctx, x1, y1, x2, y2, color) {
    const angle  = Math.atan2(y2 - y1, x2 - x1);
    const len    = 9;
    const spread = Math.PI / 6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len * Math.cos(angle - spread), y2 - len * Math.sin(angle - spread));
    ctx.lineTo(x2 - len * Math.cos(angle + spread), y2 - len * Math.sin(angle + spread));
    ctx.closePath();
    ctx.fill();
  }

  function _drawLinePreview(ctx, fromCell, mousePos) {
    ctx.save();
    ctx.strokeStyle = C.CLR.PREVIEW_LINE;
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cellCx(fromCell.col), cellCy(fromCell.row));
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
    ctx.restore();
  }
} 

  // ── Public API ─────────────────────────────────────────────────────────────
  return { render, pixelToCell, canvasSize, cellCx, cellCy };
})();