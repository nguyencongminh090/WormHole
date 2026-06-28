/**
 * ZCR Pipeline - OpenCV.js Implementation
 * Handles Semantic Cropping, Grids Extraction, and Pieces Classification.
 */

class ZCRPipeline {
  constructor() {
    this.ready = false;
    if (typeof cv !== 'undefined') {
      if (cv.getBuildInformation) {
        this.ready = true;
      } else {
        cv['onRuntimeInitialized'] = () => {
          this.ready = true;
        };
      }
    } else {
        // Assume it will be loaded eventually
        window.addEventListener('load', () => {
            if (typeof cv !== 'undefined') {
                cv['onRuntimeInitialized'] = () => {
                    this.ready = true;
                };
            }
        });
    }
  }

  // Memory management helper
  cleanup(mats) {
    for (let mat of mats) {
      if (mat != null && !mat.isDeleted()) {
        mat.delete();
      }
    }
  }

  /**
   * Process image and return the pure semantic matrix.
   * @param {HTMLImageElement|HTMLCanvasElement} imgElement 
   * @returns {Array<Array<String>>} semanticMatrix
   */
  processImage(imgElement) {
    if (!this.ready) throw new Error("OpenCV is not ready");
    
    let mats = []; // Track all allocated mats
    try {
      let src = cv.imread(imgElement);
      mats.push(src);
      
      // Step 1: Grid Bounding Box
      let gray = new cv.Mat();
      mats.push(gray);
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      
      let edges = new cv.Mat();
      mats.push(edges);
      cv.Canny(gray, edges, 50, 150);
      
      let kernelH = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(30, 1));
      let kernelV = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 30));
      mats.push(kernelH, kernelV);
      
      let morphH = new cv.Mat();
      let morphV = new cv.Mat();
      mats.push(morphH, morphV);
      
      cv.morphologyEx(edges, morphH, cv.MORPH_OPEN, kernelH);
      cv.morphologyEx(edges, morphV, cv.MORPH_OPEN, kernelV);
      
      let mask = new cv.Mat();
      mats.push(mask);
      cv.add(morphH, morphV, mask);
      
      let kernelDilate = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      mats.push(kernelDilate);
      cv.dilate(mask, mask, kernelDilate, new cv.Point(-1, -1), 2);
      
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      mats.push(contours, hierarchy);
      
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      if (contours.size() === 0) throw new Error("No board found");
      
      let maxArea = 0;
      let maxContourIdx = -1;
      for (let i = 0; i < contours.size(); ++i) {
        let area = cv.contourArea(contours.get(i));
        if (area > maxArea) {
          maxArea = area;
          maxContourIdx = i;
        }
      }
      
      let bbox = cv.boundingRect(contours.get(maxContourIdx));
      
      // Step 2: Dynamic Grid Extraction
      let cropRect = bbox;
      let cropGray = gray.roi(cropRect);
      let cropSrc = src.roi(cropRect);
      mats.push(cropGray, cropSrc);
      
      let cropEdges = new cv.Mat();
      mats.push(cropEdges);
      cv.Canny(cropGray, cropEdges, 50, 150);
      
      // Projection
      let h_proj = new Int32Array(cropEdges.rows).fill(0);
      let v_proj = new Int32Array(cropEdges.cols).fill(0);
      
      for (let y = 0; y < cropEdges.rows; y++) {
        for (let x = 0; x < cropEdges.cols; x++) {
          let val = cropEdges.ucharPtr(y, x)[0];
          if (val > 0) {
            h_proj[y]++;
            v_proj[x]++;
          }
        }
      }
      
      let threshH = cropEdges.cols * 0.2;
      let threshV = cropEdges.rows * 0.2;
      
      let getPeaks = (proj, thresh) => {
        let peaks = [];
        for (let i = 0; i < proj.length; i++) {
          if (proj[i] > thresh) {
            peaks.push(i);
          }
        }
        // Group nearby peaks (< 10 px)
        let grouped = [];
        if (peaks.length === 0) return grouped;
        let currentGroup = [peaks[0]];
        for (let i = 1; i < peaks.length; i++) {
          if (peaks[i] - currentGroup[currentGroup.length - 1] < 10) {
            currentGroup.push(peaks[i]);
          } else {
            let sum = 0;
            for(let p of currentGroup) sum += p;
            grouped.push(Math.round(sum / currentGroup.length));
            currentGroup = [peaks[i]];
          }
        }
        let sum = 0;
        for(let p of currentGroup) sum += p;
        grouped.push(Math.round(sum / currentGroup.length));
        return grouped;
      };
      
      let rowLines = getPeaks(h_proj, threshH);
      let colLines = getPeaks(v_proj, threshV);
      
      if (rowLines.length < 5 || colLines.length < 5) throw new Error("Invalid grid");
      
      // Step 3: Semantic Cell Classification
      let numRows = rowLines.length - 1;
      let numCols = colLines.length - 1;
      let rawMatrix = Array(numRows).fill(null).map(() => Array(numCols).fill('.'));
      
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          let y1 = rowLines[r];
          let y2 = rowLines[r+1];
          let x1 = colLines[c];
          let x2 = colLines[c+1];
          
          let w = x2 - x1;
          let h = y2 - y1;
          
          // 15% inward margin
          let mx = Math.floor(w * 0.15);
          let my = Math.floor(h * 0.15);
          
          let cw = w - 2 * mx;
          let ch = h - 2 * my;
          
          if (cw <= 0 || ch <= 0) continue;
          let cellRect = new cv.Rect(x1 + mx, y1 + my, cw, ch);
          
          let cell = cropSrc.roi(cellRect);
          let cellGray = cropGray.roi(cellRect);
          let cellEdges = cropEdges.roi(cellRect);
          
          let hsv = new cv.Mat();
          cv.cvtColor(cell, hsv, cv.COLOR_RGBA2RGB);
          cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
          
          // Calculate stats
          let meanStdGray = new cv.Mat();
          let meanStdHSV = new cv.Mat();
          let stddevGray = new cv.Mat();
          let stddevHSV = new cv.Mat();
          
          cv.meanStdDev(cellGray, meanStdGray, stddevGray);
          cv.meanStdDev(hsv, meanStdHSV, stddevHSV);
          
          let variance = Math.pow(stddevGray.doubleAt(0,0), 2);
          let meanSat = meanStdHSV.doubleAt(1,0); // S channel
          
          let edgeMean = cv.mean(cellEdges)[0];
          let edgeRatio = edgeMean / 255.0;
          
          // Binary inverse threshold to find black contours
          let cellThresh = new cv.Mat();
          cv.threshold(cellGray, cellThresh, 120, 255, cv.THRESH_BINARY_INV);
          
          let cellContours = new cv.MatVector();
          let cellHierarchy = new cv.Mat();
          cv.findContours(cellThresh, cellContours, cellHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          
          let maxCellArea = 0;
          for (let i = 0; i < cellContours.size(); ++i) {
            let a = cv.contourArea(cellContours.get(i));
            if (a > maxCellArea) maxCellArea = a;
          }
          
          // Rules
          if (edgeRatio > 0.2 && meanSat > 100) {
            rawMatrix[r][c] = 'W'; // Wall
          } else if (maxCellArea >= 200) {
            // Check center 7x7
            let cx = Math.floor(cellGray.cols / 2);
            let cy = Math.floor(cellGray.rows / 2);
            let pSize = 7;
            let px = Math.max(0, cx - 3);
            let py = Math.max(0, cy - 3);
            let pw = Math.min(cellGray.cols - px, pSize);
            let ph = Math.min(cellGray.rows - py, pSize);
            
            if (pw > 0 && ph > 0) {
              let pRect = new cv.Rect(px, py, pw, ph);
              let patch = cellGray.roi(pRect);
              let patchMean = cv.mean(patch)[0];
              rawMatrix[r][c] = patchMean > 160 ? 'O' : 'X';
              patch.delete();
            } else {
              rawMatrix[r][c] = 'X';
            }
          } else if (maxCellArea > 5 && maxCellArea < 200 && variance > 500) {
            rawMatrix[r][c] = 'C'; // Noise/Coord
          } else {
            rawMatrix[r][c] = '.';
          }
          
          // cleanup loop mats
          cell.delete(); cellGray.delete(); cellEdges.delete(); hsv.delete();
          meanStdGray.delete(); meanStdHSV.delete(); stddevGray.delete(); stddevHSV.delete();
          cellThresh.delete(); cellContours.delete(); cellHierarchy.delete();
        }
      }
      
      // Step 4: Semantic Cropping
      let topRow = 0, bottomRow = numRows - 1;
      let leftCol = 0, rightCol = numCols - 1;
      
      for (let r = 0; r < numRows; r++) {
        let cCount = rawMatrix[r].filter(v => v === 'C').length;
        if (cCount >= 3) {
          if (r < numRows / 2) topRow = r;
          else { bottomRow = r; break; }
        }
      }
      
      for (let c = 0; c < numCols; c++) {
        let cCount = 0;
        for (let r = 0; r < numRows; r++) if (rawMatrix[r][c] === 'C') cCount++;
        
        if (cCount >= 3) {
          if (c < numCols / 2) leftCol = c;
          else { rightCol = c; break; }
        }
      }
      
      // Crop matrix strictly BETWEEN bounds
      let startRow = (topRow === 0 && rawMatrix[0].filter(v => v==='C').length < 3) ? 0 : topRow + 1;
      let endRow = (bottomRow === numRows - 1 && rawMatrix[numRows-1].filter(v => v==='C').length < 3) ? bottomRow : bottomRow - 1;
      let startCol = (leftCol === 0 && rawMatrix.map(row => row[0]).filter(v => v==='C').length < 3) ? 0 : leftCol + 1;
      let endCol = (rightCol === numCols - 1 && rawMatrix.map(row => row[numCols-1]).filter(v => v==='C').length < 3) ? rightCol : rightCol - 1;
      
      // Safety check for bounds
      if (startRow > endRow || startCol > endCol) {
        startRow = 0; endRow = numRows - 1;
        startCol = 0; endCol = numCols - 1;
      }
      
      let semanticMatrix = [];
      for (let r = startRow; r <= endRow; r++) {
        let row = [];
        for (let c = startCol; c <= endCol; c++) {
          let val = rawMatrix[r][c];
          row.push(val === 'C' ? '.' : val); // Clean remaining C's if any
        }
        semanticMatrix.push(row);
      }
      
      this.cleanup(mats);
      return semanticMatrix;
      
    } catch (e) {
      this.cleanup(mats);
      throw e;
    }
  }
}

// Export for browser
window.ZCRPipeline = ZCRPipeline;
