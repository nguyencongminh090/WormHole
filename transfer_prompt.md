# Transfer Prompt: ZCR Board Detection to WebAssembly (OpenCV.js)

**Context:**
We are building a Web Application to automatically detect a Gomoku/Caro board from a highly noisy image (ZCR dataset), extract piece coordinates, and render a clean digital board. 

**Role:**
You are an Expert AI Web Developer and Computer Vision Engineer. Your task is to translate the following Python-based OpenCV pipeline into a pure Client-side JavaScript implementation using **OpenCV.js (WASM)**.

*(Note: Do not focus on UI/UX or styling. Focus entirely on the Computer Vision logic, memory management, and HTML5 Canvas rendering).*

---

## 1. Technical Stack & Constraints
- **Computer Vision:** `opencv.js` (WebAssembly port of OpenCV).
- **Rendering:** HTML5 `<canvas>` for drawing the final in-painted result.
- **Crucial Constraint:** You must strictly manage memory using `mat.delete()` in JS to prevent memory leaks in the browser. 

---

## 2. The Algorithm Pipeline (ZCR Pipeline)

Translate the following established algorithm step-by-step from Python logic to `opencv.js`:

### Step 1: Grid Bounding Box (Isolating the Board)
*Goal: Remove external noise like User Avatars or Browser UI.*
- Read image to grayscale. Apply Canny Edge Detection (`threshold1=50, threshold2=150`).
- Apply Morphological OPEN with a horizontal kernel (30x1) and a vertical kernel (1x30).
- ADD the two resulting masks together.
- DILATE the mask (5x5 kernel, 2 iterations).
- Find the largest external contour (`cv.findContours`) and extract its Bounding Box `(x, y, w, h)`.

### Step 2: Dynamic Grid Extraction (Projection)
*Goal: Dynamically find all grid lines without hardcoding a 15x15 or 17x17 size.*
- Crop the grayscale image to the Bounding Box. Apply Canny Edge.
- Compute the sum of edge pixels across columns (`v_proj`) and rows (`h_proj`). 
- Threshold: Any line segment where the sum exceeds `20%` of the crop length is considered part of a valid grid line.
- Since lines have thickness, group nearby peaks (distance < 10 pixels) by taking their average coordinate.

### Step 3: Semantic Cell Classification
*Goal: Identify X, O, Walls (W), Empty (.), and specifically Noise/Coordinates (C).*
- Iterate through each cell defined by the intersecting grid lines. Crop the cell with a **15% inward margin** to avoid black grid lines.
- Convert cell to HSV. Calculate Variance of gray, Mean Saturation (S channel), and Edge Ratio (mean of Canny / 255.0).
- Apply a binary inverse threshold (thresh=120) to find black contours in the cell. Extract the maximum contour area (`max_area`).
- **Classification Rules:**
  1. **Wall (W):** `edge_ratio > 0.2` AND `mean_saturation > 100`.
  2. **Pieces (X or O):** `max_area >= 200`. Check the center 7x7 patch of the cell: if the center is bright (`mean > 160`), it's an **`O`**. If dark, it's an **`X`**.
  3. **Noise/Coordinate (C):** `5 < max_area < 200` AND `variance > 500`. (These are letters like 'a', 'b' or numbers '1', '2' that reside inside the bounding box).
  4. **Empty (.):** Everything else.

### Step 4: Semantic Cropping
*Goal: Remove coordinate rows/cols and empty padding to return a pure Playable Area (e.g., exactly 17x17).*
- Build a 2D Semantic Matrix from Step 3.
- Identify "Coordinate Rows" and "Coordinate Cols": Any row or column that contains **3 or more `C` (Noise) labels**.
- Crop the matrix strictly BETWEEN these coordinate bounds (e.g., crop from `top_coord_row + 1` to `bottom_coord_row - 1`).
- The resulting cropped matrix is the pure Playable Area.

### Step 5: Digital In-painting (HTML5 Canvas)
- Write a JavaScript function that takes the cropped Semantic Matrix and renders it on an HTML5 `<canvas>`.
- Fill with a beige wooden background `#E6D7B9`. Draw grid lines `#64503C`.
- Draw pieces based on matrix data: Red bricks for `W`, thick black crosses for `X`, and black circles for `O`.
- Draw coordinate characters (`a, b, c...` and `1, 2, 3...`) in the margin outside the grid.

---

## 3. Output Requirements
1. Provide the core JavaScript class or functions implementing the `opencv.js` logic.
2. Clearly separate the CV processing function and the Canvas rendering function.
3. Ensure you show how to safely initialize OpenCV (waiting for `cv.onRuntimeInitialized`) and cleanly delete all `cv.Mat` objects.
