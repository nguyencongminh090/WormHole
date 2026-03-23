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

  // ── Block / Wall (SVG Brick Style) ─────────────────────────────────────────

  function _drawBlock(ctx, lx, ty) {
    const pad = 1;
    const x   = lx + pad, y = ty + pad;
    const w   = CS - pad * 2, h = CS - pad * 2;
    const br  = 3;    // outer shape corner
    const br2 = 2;    // individual brick corner (matches SVG rounding)
    const GAP = 1;    // mortar thickness in pixels

    // Brick color palette — dark-heavy weighting (similar to real brick variation)
    // DARK:3 / BASE:2 / LIGHT:1  → dark ~50%
    const PALETTE = [
      C.CLR.BLOCK_DARK, C.CLR.BLOCK_DARK, C.CLR.BLOCK_DARK,
      C.CLR.BLOCK_BASE, C.CLR.BLOCK_BASE,
      C.CLR.BLOCK_LIGHT,
    ];
    // Deterministic hash seeded by grid position so colors don't flicker on redraw
    const brickColor = (r, b) => PALETTE[Math.abs(r * 17 + b * 11 + r * b * 3) % PALETTE.length];

    ctx.save();

    // 1 — Cream mortar background, clipped to cell
    _roundRect(ctx, x, y, w, h, br);
    ctx.fillStyle = C.CLR.BLOCK_MORTAR;
    ctx.fill();
    ctx.clip(); // all bricks are clipped to this cell boundary

    // 2 — 5 rows: alternating 3-full-bricks / staggered (half + 2-full + half)
    const rows = 5;
    const bh   = Math.floor((h - GAP * (rows + 1)) / rows);
    // Full brick width when 3 per row
    const bw3  = Math.floor((w - GAP * 4) / 3);

    for (let r = 0; r < rows; r++) {
      const by        = y + GAP + r * (bh + GAP);
      const staggered = r % 2 === 1; // odd rows are staggered

      if (!staggered) {
        // Row with 3 equal bricks
        for (let b = 0; b < 3; b++) {
          const bx = x + GAP + b * (bw3 + GAP);
          _roundRect(ctx, bx, by, bw3, bh, br2);
          ctx.fillStyle = brickColor(r, b);
          ctx.fill();
        }
      } else {
        // Staggered row: half-brick | full | full | half-brick
        const halfW = Math.floor(bw3 / 2);

        // Left half-brick
        _roundRect(ctx, x + GAP, by, halfW, bh, br2);
        ctx.fillStyle = brickColor(r, 0);
        ctx.fill();

        // 2 full bricks
        for (let b = 0; b < 2; b++) {
          const bx = x + GAP + halfW + GAP + b * (bw3 + GAP);
          _roundRect(ctx, bx, by, bw3, bh, br2);
          ctx.fillStyle = brickColor(r, b + 1);
          ctx.fill();
        }

        // Right half-brick — position calculated forward to avoid 1px gap
        const rightHalfX = x + GAP + halfW + GAP + bw3 + GAP + bw3 + GAP;
        _roundRect(ctx, rightHalfX, by, halfW, bh, br2);
        ctx.fillStyle = brickColor(r, 3);
        ctx.fill();
      }
    }

    ctx.restore();

    // 3 — Subtle outer border
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth   = 0.8;
    _roundRect(ctx, x, y, w, h, br);
    ctx.stroke();
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

  // ── Hole / Portal (Cosmic Vortex) ───────────────────────────────────────────

  function _drawHole(ctx, cx, cy, cell, holePairs, col, row) {
    const colorDef = C.HOLE_COLORS.find(c => c.id === cell.holeColorId) || C.HOLE_COLORS[0];
    const r  = CS * C.STONE_R;
    const c1 = colorDef.fill;
    const c2 = colorDef.stroke;

    ctx.save();

    // ─── 1. Outer diffuse glow (atmosphere)
    const atmGrad = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.8);
    atmGrad.addColorStop(0,   _hexToRgba(c1, 0.45));
    atmGrad.addColorStop(0.4, _hexToRgba(c1, 0.15));
    atmGrad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = atmGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // ─── 2. Accretion rings (4 crisp rings that fade toward center)
    const ringCount = 5;
    for (let i = ringCount; i >= 0; i--) {
      const frac   = i / ringCount;
      const ringR  = r * (0.2 + frac * 0.85);
      const alpha  = 0.08 + (1 - frac) * 0.65;
      const lw     = 1.6 - frac * 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = _hexToRgba(c1, alpha);
      ctx.lineWidth   = lw;
      ctx.stroke();
    }

    // ─── 3. Deep void (full radial depth gradient inside outermost ring)
    const voidGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    voidGrad.addColorStop(0,    'rgba(0,0,0,1)');
    voidGrad.addColorStop(0.35, 'rgba(0,0,0,0.9)');
    voidGrad.addColorStop(0.7,  _hexToRgba(c2, 0.7));
    voidGrad.addColorStop(0.88, _hexToRgba(c1, 0.85));
    voidGrad.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = voidGrad;
    ctx.fill();

    // ─── 4. Spiral arms (3 arcs slightly offset in angle, forming a slow vortex)
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#ffffff';
    for (let arm = 0; arm < 4; arm++) {
      const baseAngle = (arm / 4) * Math.PI * 2;
      const sweepFwd  = Math.PI * 0.55;
      const ri = r * 0.18;
      const ro = r * 0.78;
      ctx.beginPath();
      // Approximate spiral by drawing arc between inner and outer radius
      ctx.arc(cx + Math.cos(baseAngle) * r * 0.08,
              cy + Math.sin(baseAngle) * r * 0.08,
              (ri + ro) * 0.5,
              baseAngle, baseAngle + sweepFwd);
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    ctx.restore();

    // ─── 5. Hard bright outer ring (the "event horizon" edge)
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = c1;
    ctx.lineWidth   = 2.5;
    ctx.shadowColor  = c1;
    ctx.shadowBlur   = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ─── 6. Inner ring pulse
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
    ctx.strokeStyle = c1;
    ctx.lineWidth   = 1.5;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ─── 7. Bright central core (star-like)
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.22);
    coreGrad.addColorStop(0,  'rgba(255,255,255,0.92)');
    coreGrad.addColorStop(0.4, _hexToRgba(c1, 0.55));
    coreGrad.addColorStop(1,  'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    ctx.restore();

    // ─── 8. Pair label (A, B, C…)
    const pairKeys  = Object.keys(holePairs);
    const pairIndex = pairKeys.indexOf(cell.holeGroupId);
    const label     = pairIndex >= 0 ? String.fromCharCode(65 + pairIndex) : '?';

    const pair     = holePairs[cell.holeGroupId];
    const isSecond = pair && pair.positions[1] &&
                     pair.positions[1].col === col &&
                     pair.positions[1].row === row;

    // Drop-shadow text
    ctx.save();
    ctx.shadowColor  = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur   = 5;
    ctx.fillStyle    = '#ffffff';
    ctx.font         = `700 ${r * 0.72}px "Inter", sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy - r * 0.05);
    ctx.restore();

    // Subscript end indicator
    if (pair && pair.positions[1]) {
      ctx.font         = `600 ${r * 0.36}px "Inter", sans-serif`;
      ctx.fillStyle    = 'rgba(255,255,255,0.85)';
      ctx.textAlign    = 'center';
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

  // ── Touch Zoom Preview ─────────────────────────────────────────────────────

  /**
   * Render a 3×3 magnified neighbourhood onto a small canvas.
   * @param {HTMLCanvasElement} zc    - the mini canvas (#zoom-canvas)
   * @param {Object}  state           - current game state
   * @param {string}  col             - hovered column letter (e.g. 'e')
   * @param {number}  row             - hovered row number (e.g. 5)
   * @param {string}  tool            - current tool id (C.TOOL.*)
   * @param {string}  holeColorId     - active portal color id
   */
  function drawZoom(zc, state, col, row, tool, holeColorId) {
    const ZCS = 20;           // zoomed cell size (pixels)
    const ZSZ = 7;            // 7×7 grid
    const ZR  = (ZSZ - 1) / 2; // radius = 3
    const dim = ZCS * ZSZ;
    zc.width  = dim;
    zc.height = dim;

    const ctx = zc.getContext('2d');
    const ci  = C.COLS.indexOf(col);
    const ri  = row - 1;

    // Draw 7×7 neighbourhood
    for (let dr = -ZR; dr <= ZR; dr++) {
      for (let dc = -ZR; dc <= ZR; dc++) {
        const gc = C.COLS[ci + dc];
        const gr = ri + 1 + dr;
        const lx = (dc + ZR) * ZCS;
        const ty = (dr + ZR) * ZCS;
        const cx = lx + ZCS / 2;
        const cy = ty + ZCS / 2;

        // Board background — always opaque cream first
        const isCenter = dr === 0 && dc === 0;
        ctx.fillStyle = C.CLR.BOARD_BG;
        ctx.fillRect(lx, ty, ZCS, ZCS);
        // Amber highlight on the centre target cell
        if (isCenter) {
          ctx.fillStyle = 'rgba(240,160,48,0.22)';
          ctx.fillRect(lx, ty, ZCS, ZCS);
        }

        // Grid lines
        ctx.strokeStyle = C.CLR.GRID;
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(lx + 0.5, ty + 0.5, ZCS - 1, ZCS - 1);

        // Existing cell content — scale the draw calls
        if (gc && gr >= 1 && gr <= state.boardSize) {
          const key  = `${gc},${gr}`;
          const cell = state.cells[key];
          if (cell) {
            ctx.save();
            ctx.translate(lx - ZCS * 0, ty - ZCS * 0);
            _drawZoomCell(ctx, ZCS, cx - lx, cy - ty, cell, state);
            ctx.restore();
          }
        }
      }
    }

    // Tool ghost preview in the centre cell
    const lx = ZR * ZCS, ty = ZR * ZCS;
    const cx = lx + ZCS / 2, cy = ty + ZCS / 2;
    ctx.save();
    ctx.globalAlpha = 0.55;
    if (tool === C.TOOL.STONE_X) _drawZoomStone(ctx, cx, cy, C.TYPE.STONE_X, ZCS);
    else if (tool === C.TOOL.STONE_O) _drawZoomStone(ctx, cx, cy, C.TYPE.STONE_O, ZCS);
    else if (tool === C.TOOL.BLOCK) _drawZoomBlock(ctx, lx, ty, ZCS);
    else if (tool === C.TOOL.HOLE) {
      const colorDef = C.HOLE_COLORS.find(c => c.id === holeColorId) || C.HOLE_COLORS[0];
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(cx, cy, ZCS * C.STONE_R, 0, Math.PI * 2);
      ctx.strokeStyle = colorDef.fill;
      ctx.lineWidth   = 3;
      ctx.stroke();
    } else if (tool === C.TOOL.ERASER) {
      ctx.globalAlpha = 0.4;
      ctx.font = `bold ${ZCS * 0.45}px Inter, sans-serif`;
      ctx.fillStyle = '#ff6060';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✕', cx, cy);
    }
    ctx.restore();
  }

  /** Scaled stone for zoom preview */
  function _drawZoomStone(ctx, cx, cy, type, zcs) {
    const r   = zcs * C.STONE_R;
    const isX = type === C.TYPE.STONE_X;
    ctx.save();
    ctx.lineCap = 'round';
    if (isX) {
      const s = r * 0.55;
      ctx.strokeStyle = C.CLR.X_COLOR;
      ctx.lineWidth   = r * 0.38;
      ctx.beginPath();
      ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
      ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
      ctx.strokeStyle = C.CLR.O_COLOR;
      ctx.lineWidth   = r * 0.32;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Drawn cell content at zoom scale */
  function _drawZoomCell(ctx, zcs, cx, cy, cell) {
    if (cell.type === C.TYPE.STONE_X || cell.type === C.TYPE.STONE_O) {
      _drawZoomStone(ctx, cx, cy, cell.type, zcs);
    }
    // Blocks and holes render too small to bother reproducing at 40px
  }

  /** Minimal block for zoom preview */
  function _drawZoomBlock(ctx, lx, ty, zcs) {
    ctx.fillStyle = C.CLR.BLOCK_MORTAR;
    ctx.fillRect(lx + 2, ty + 2, zcs - 4, zcs - 4);
    ctx.fillStyle = C.CLR.BLOCK_BASE;
    ctx.fillRect(lx + 3, ty + 3, zcs - 6, (zcs - 8) / 2);
    ctx.fillRect(lx + 3, ty + 3 + (zcs - 8) / 2 + 2, zcs - 6, (zcs - 8) / 2);
  }

  // ── Colour helpers ──────────────────────────────────────────────────────────

  function _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return { render, pixelToCell, canvasSize, cellCx, cellCy, drawZoom };
})();