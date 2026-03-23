# ⬡ Wormhole Gomoku Editor

A browser-based position editor for **Wormhole Gomoku** — the variant where paired portal holes teleport stones across the board, creating unique 5-in-a-row threats through the wormhole.

**→ [Live Demo on GitHub Pages](https://nguyencongminh090.github.io/WormHole/)**

---

## Features

| Feature | Description |
|---|---|
| 🪨 Place stones | Black (X) or White (O) with auto-incrementing move numbers |
| 🧱 Blocks / Walls | Impassable brick cells |
| ⬡ Portal pairs | Two-click placement with Chebyshev-distance ≥5 validation |
| ✏️ Analysis lines | Colored arrows drawn between any two cells |
| ↩ Undo / Redo | Full 200-step history stack (Ctrl+Z / Ctrl+Y) |
| 📋 Move log | Chronological list of every placed piece |
| 📄 Notation | Export / import compact text format |
| 🖼 Export PNG | Clean board export (no hover/preview overlays) |
| 📋 Copy image | Copy board to clipboard |
| ⌨ Shortcuts | Keyboard keys for every tool |

---

## Keyboard Shortcuts

| Key | Tool |
|---|---|
| `X` | Black Stone |
| `O` | White Stone |
| `B` | Block / Wall |
| `H` | Portal Hole |
| `L` | Analysis Line |
| `E` | Eraser |
| `Esc` | Cancel pending operation |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| Right-click | Quick erase any cell |

---

## Notation Format

```
SIZE:17
X:h6(1),g8(3),f9(5)
O:i6(2),h8(4),i9(6)
BLOCK:d5,l5,n5
PORTAL:red(h13:m13),blue(l8:l13)
LINE:red(h6>l10)
```

- **SIZE** — board dimension (9, 13, 15, 17, 19)
- **X / O** — stone positions with optional move number in parens
- **BLOCK** — wall cell positions
- **PORTAL** — `colorId(pos1:pos2)`, both ends required; Chebyshev distance ≥5 enforced
- **LINE** — `colorId(from>to)` analysis arrows
- Position format: column letter + row number, e.g. `h6`, `n13`
- Available portal colors: `red`, `blue`, `green`, `orange`, `purple`
- Available line colors: `red`, `blue`, `green`, `orange`, `black`

---

## Wormhole Rules (黑洞規則)

- The board contains **at least 2 pairs** of portal holes — each pair connected by the same color.
- **Cannot place pieces on portal cells.**
- Chebyshev distance between any two portals (of any pair) must be **≥ 5**; portals cannot overlap key cells.
- A straight line **may pass through** a portal pair and emerge from the other portal in the same direction.
- Such a line counts as winning only if it contains **≥ 5 distinct pieces** (counting through both portals).

---

## Deploy to GitHub Pages

1. Fork or clone this repo.
2. Push to GitHub.
3. Go to **Settings → Pages → Source: Deploy from branch → `main` → `/ (root)`**.
4. Done — accessible at `https://<your-username>.github.io/<repo-name>/`

No build step, no npm, no bundler. Pure HTML + CSS + JS.

---

## File Structure

```
wormhole-editor/
├── index.html          ← Single HTML entry point
├── assets/
│   └── style.css       ← All styles (CSS variables, dark theme)
└── src/
    ├── constants.js    ← All magic numbers & enums (loaded first)
    ├── state.js        ← Pure-function state management
    ├── renderer.js     ← Canvas drawing engine
    ├── history.js      ← Undo/redo stack + move log
    ├── notation.js     ← Serialize / parse position text
    ├── export.js       ← PNG download & clipboard
    └── app.js          ← Event wiring & main controller (loaded last)
```

**Design principles:**
- Zero dependencies, zero build tools
- Modules communicate only through `window.*` globals (declared in load order)
- All state mutations return new state objects (no in-place mutation)
- `app.js` is the only file that touches the DOM

---

## License

MIT — free to use, share, and modify.