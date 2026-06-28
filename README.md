<p align="center">
  <img src="zcaro-icon-only.svg" width="120" alt="Zcaro Logo">
</p>

<h1 align="center">Zcaro Wormhole Gomoku Editor</h1>

<p align="center">
  <strong>A premium, browser-based position editor for Wormhole Gomoku.</strong>
</p>

Zcaro is an advanced position editor designed specifically for **Wormhole Gomoku** — a variant of Gomoku where paired portal holes teleport stones across the board, creating complex 5-in-a-row threats through spatial anomalies. Zcaro features a Pro Max UI/UX design with a deep glassmorphism aesthetic, robust undo/redo capabilities, and a proprietary position notation system.

**→ [Live Demo on GitHub Pages](https://nguyencongminh090.github.io/WormHole/)**

---

## Key Features

- **Wormhole Mechanics**: Full support for portal pairs with Chebyshev-distance validation (≥5) and teleportation line-of-sight tracking.
- **Pro Max UI/UX**: Nested Bento-box layouts, deep backdrop blur (glassmorphism), high-end typography, and push/pull sidebar transitions.
- **Multi-Theme Engine**: Seamlessly switch between Dark Space, Light Minimal, Classic Paper, and Cyberpunk themes.
- **Robust State Management**: Immutable state trees enabling a 200-step deep Undo/Redo stack.
- **Computer Vision Ready**: Integration layer for OpenCV.js to scan physical boards and digitize states (Upload ZCR).
- **Export & Share**: Generate clean PNG exports, copy board images to the clipboard, or generate shareable URLs via notation parsing.
- **Multi-language**: Built-in localization support (EN / VI).

---

## Tech Stack

- **Core**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS (via CDN for zero-build usage), Custom CSS Variables for themes
- **Rendering**: HTML5 `<canvas>` (Static grid layer + Dynamic piece layer)
- **Computer Vision**: OpenCV.js (via CDN for board scanning)
- **Icons**: Inline SVGs
- **Deployment**: GitHub Pages (Static site)

---

## Prerequisites

Zcaro is designed with a **zero-build philosophy**. There are no dependencies, no package managers, and no build steps required to run the application locally. 

All you need is:
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Git (optional, for cloning)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/nguyencongminh090/WormHole.git
cd WormHole
```

### 2. Run Locally

Because there is no build step, you can simply open the `index.html` file in your browser:

**Using a local web server (recommended to avoid CORS issues with modules/assets):**

```bash
# Using Python 3
python -m http.server 3000

# Using Node (npx)
npx serve .
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Or directly:**
Simply double-click `index.html` in your file explorer.

---

## Architecture

Zcaro is built on a pure functional state-management paradigm with an explicit separation of concerns, ensuring maximum performance on the canvas while keeping the DOM reactive.

### Directory Structure

```text
wormhole-editor/
├── index.html          # Single HTML entry point (UI layout)
├── zcaro-icon-only.svg # Project Logo
├── assets/
│   └── style.css       # Core styling (CSS variables, glassmorphism utilities)
└── src/
    ├── constants.js    # Enums, magic numbers, and localization dictionaries
    ├── state.js        # Pure-function state management (immutable objects)
    ├── renderer.js     # Dual-canvas drawing engine (Static grid + Dynamic pieces)
    ├── history.js      # Undo/redo stack and move log management
    ├── notation.js     # Serialization/parsing of the proprietary FEN-like format
    ├── export.js       # PNG download and clipboard rendering
    ├── cv_pipeline.js  # OpenCV image processing for physical board scanning
    └── app.js          # Event wiring, DOM manipulation, and main controller
```

### Rendering Engine (`renderer.js`)

Zcaro uses a **Dual-Canvas Architecture** to maximize performance:
1. **Static Canvas (`#canvas-static`)**: Draws the board grid, coordinates, and background elements only when the board size changes or the theme updates.
2. **Dynamic Canvas (`#canvas-dynamic`)**: Draws stones, portals, blocks, and analysis lines. This layer clears and redraws upon every state mutation.

### State Management (`state.js`)

State mutations do not happen in place. Every action returns a **new state object**, which is then pushed to the `History` stack.
```javascript
// Example Flow:
const newState = State.placePiece(currentState, x, y, playerColor);
History.push(newState);
Renderer.draw(newState);
```

---

## Notation Format

Zcaro uses a proprietary, compact text format to serialize board states for sharing and history tracking.

**Example Notation:**
```text
SIZE:17
X:h6(1),g8(3),f9(5)
O:i6(2),h8(4),i9(6)
BLOCK:d5,l5,n5
PORTAL:red(h13:m13),blue(l8:l13)
LINE:red(h6>l10)
```

**Syntax Rules:**
- **SIZE**: Board dimension (e.g., 9, 13, 15, 17, 19).
- **X / O**: Stone positions with an optional move number in parentheses.
- **BLOCK**: Impassable wall cell positions.
- **PORTAL**: `colorId(pos1:pos2)`. Both ends are required. Chebyshev distance must be ≥5.
- **LINE**: `colorId(from>to)` representing analysis arrows.
- **Coordinates**: Standard algebraic notation (column letter + row number, e.g., `h6`).

---

## Wormhole Rules (黑洞規則)

1. The board contains **at least 2 pairs** of portal holes — each pair connected by the same color.
2. **Cannot place pieces on portal cells.**
3. Chebyshev distance between any two portals (of any pair) must be **≥ 5**. Portals cannot overlap key structural cells.
4. A straight line **may pass through** a portal pair and emerge from the other portal in the same direction.
5. Such a line counts as winning only if it contains **≥ 5 distinct pieces** (counting through both portals).

---

## Keyboard Shortcuts

Zcaro is designed for power users with full keyboard accessibility.

| Key | Tool |
|---|---|
| `X` | Black Stone |
| `O` | White Stone |
| `B` | Block / Wall |
| `H` | Portal Hole |
| `L` | Analysis Line |
| `E` | Eraser |
| `Esc` | Cancel pending operation |
| `Ctrl+Z` / `Cmd+Z`| Undo |
| `Ctrl+Y` / `Cmd+Y`| Redo |
| `Right-click` | Quick erase any cell |

---

## Deployment

Zcaro is a static frontend application, making it trivial to deploy to any static hosting provider.

### GitHub Pages (Current Setup)

1. Fork or clone this repository.
2. Push your changes to GitHub.
3. Navigate to your repository **Settings → Pages**.
4. Set **Source** to `Deploy from a branch`.
5. Select the `main` branch and the `/ (root)` folder.
6. Save. Your application will be live at `https://<your-username>.github.io/<repo-name>/`.

### Vercel / Netlify / Render

1. Connect your GitHub repository to the hosting provider.
2. Leave the "Build Command" empty.
3. Set the "Output Directory" to the root (`./` or empty).
4. Deploy.

---

## License

This project is licensed under the MIT License — free to use, share, and modify.