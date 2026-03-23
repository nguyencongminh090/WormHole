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
    // Margin area
    ctx.fillStyle = C.CLR.BOARD_MARGIN;
    ctx.fillRect(0, 0, dim, dim);
    // Paper board fill
    ctx.fillStyle = C.CLR.BOARD_BG;
    ctx.fillRect(M, M, sz * CS, sz * CS);
    // Subtle paper texture — faint noise dots
    ctx.fillStyle = 'rgba(0,0,0,0.012)';
    for (let i = 0; i < 300; i++) {
      const px = M + Math.random() * sz * CS;
      const py = M + Math.random() * sz * CS;
      ctx.fillRect(px, py, 1, 1);
    }
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
    ctx.font         = `600 ${CS * 0.36}px "Inter", sans-serif`;
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
        _drawStone(ctx, cx, cy, cell.type);
        break;
      case C.TYPE.BLOCK:
        _drawBlock(ctx, cellLeft(col), cellTop(row));
        break;
      case C.TYPE.HOLE:
        _drawHole(ctx, cx, cy, cell, state.holePairs, col, row);
        break;
    }
  }

  // ── Stone (X / O symbol) ───────────────────────────────────────────────────

  function _drawStone(ctx, cx, cy, type) {
    const r   = CS * C.STONE_R;
    const isX = type === C.TYPE.STONE_X;

    ctx.save();
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    if (isX) {
      // Bold X cross
      const s = r * 0.55;
      ctx.strokeStyle = C.CLR.X_COLOR;
      ctx.lineWidth   = r * 0.38;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
      ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
      ctx.stroke();
    } else {
      // Bold O ring
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
      ctx.strokeStyle = C.CLR.O_COLOR;
      ctx.lineWidth   = r * 0.32;
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Block / Wall (3D Brick) ────────────────────────────────────────────────

  function _drawBlock(ctx, lx, ty) {
    const pad = 1;
    const x = lx + pad, y = ty + pad;
    const w = CS - pad * 2, h = CS - pad * 2;
    const br = 3; // brick corner radius
    const mortarW = 1.5;

    // Mortar background (dark grout fills entire cell)
    ctx.fillStyle = C.CLR.BLOCK_MORTAR;
    _roundRect(ctx, x, y, w, h, br + 1);
    ctx.fill();

    // Brick layout: 3 rows, staggered
    const rows = 3;
    const bh = (h - mortarW * (rows + 1)) / rows;
    const bricksPerRow = [2, 3, 2]; // alternating pattern

    for (let r = 0; r < rows; r++) {
      const by = y + mortarW + r * (bh + mortarW);
      const numBricks = bricksPerRow[r];
      const bw = (w - mortarW * (numBricks + 1)) / numBricks;

      for (let b = 0; b < numBricks; b++) {
        const bx = x + mortarW + b * (bw + mortarW);

        // Base brick fill with subtle gradient
        const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
        grad.addColorStop(0, C.CLR.BLOCK_LIGHT);
        grad.addColorStop(0.4, C.CLR.BLOCK_BASE);
        grad.addColorStop(1, C.CLR.BLOCK_DARK);
        ctx.fillStyle = grad;
        _roundRect(ctx, bx, by, bw, bh, br);
        ctx.fill();

        // Top bevel highlight
        ctx.strokeStyle = 'rgba(255,200,150,0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(bx + br, by + 0.5);
        ctx.lineTo(bx + bw - br, by + 0.5);
        ctx.stroke();

        // Bottom shadow
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(bx + br, by + bh - 0.5);
        ctx.lineTo(bx + bw - br, by + bh - 0.5);
        ctx.stroke();
      }
    }
  }

  /** Rounded rect helper */
  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ── Hole / Portal (Wormhole Effect) ────────────────────────────────────────

  function _drawHole(ctx, cx, cy, cell, holePairs, col, row) {
    const colorDef = C.HOLE_COLORS.find(c => c.id === cell.holeColorId) || C.HOLE_COLORS[0];
    const r        = CS * C.STONE_R;

    ctx.save();

    // Outer glow
    ctx.shadowColor = colorDef.fill;
    ctx.shadowBlur  = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.01)';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Concentric rings (event horizon)
    for (let i = 4; i >= 0; i--) {
      const frac  = i / 4;
      const ringR = r * (0.3 + frac * 0.75);
      const alpha = 0.15 + (1 - frac) * 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = _hexToRgba(colorDef.fill, alpha);
      ctx.lineWidth = 1.2 - frac * 0.4;
      ctx.stroke();
    }

    // Radial gradient void (center is pure black, edges fade to color)
    const voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.95);
    voidGrad.addColorStop(0, 'rgba(0,0,0,0.92)');
    voidGrad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
    voidGrad.addColorStop(0.85, _hexToRgba(colorDef.fill, 0.8));
    voidGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
    ctx.fillStyle = voidGrad;
    ctx.fill();

    // Bright border ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = colorDef.stroke;
    ctx.lineWidth   = 2.2;
    ctx.stroke();

    // Inner bright rim
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    ctx.strokeStyle = colorDef.fill;
    ctx.lineWidth   = 1;
    ctx.globalAlpha  = 0.5;
    ctx.stroke();
    ctx.globalAlpha  = 1;

    // Swirl accent lines
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    for (let a = 0; a < 3; a++) {
      const startAngle = (a * Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.65, startAngle, startAngle + Math.PI * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    // Pair label (A, B, C…)
    const pairKeys  = Object.keys(holePairs);
    const pairIndex = pairKeys.indexOf(cell.holeGroupId);
    const label     = pairIndex >= 0 ? String.fromCharCode(65 + pairIndex) : '?';

    // Which end of the pair?
    const pair     = holePairs[cell.holeGroupId];
    const isSecond = pair && pair.positions[1] &&
                     pair.positions[1].col === col &&
                     pair.positions[1].row === row;

    // Label text with drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur  = 3;
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `700 ${r * 0.72}px "Inter", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy - r * 0.05);
    ctx.restore();

    // Draw subscript end indicator (1 or 2) if pair is complete
    if (pair && pair.positions[1]) {
      ctx.font      = `600 ${r * 0.36}px "Inter", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isSecond ? '₂' : '₁', cx + r * 0.38, cy + r * 0.38);
    }
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

  // ── Colour helpers ──────────────────────────────────────────────────────────

  function _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return { render, pixelToCell, canvasSize, cellCx, cellCy };
})();