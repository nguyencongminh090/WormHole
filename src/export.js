/**
 * export.js
 * Export the board as a PNG image.
 * Exposed as window.Export.
 */

window.Export = (() => {
  'use strict';

  /**
   * Render the board without UI overlays and trigger a PNG download.
   * @param {HTMLCanvasElement} liveCanvas  — the live board canvas
   * @param {Object} state
   * @param {string} [filename]
   */
  function downloadPNG(liveCanvas, state, filename) {
    // Off-screen canvas for clean export
    const offscreen = document.createElement('canvas');
    Renderer.render(offscreen, state, {}, /* forExport */ true);

    filename = filename || _defaultFilename();

    offscreen.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  /**
   * Return the canvas data URL (for preview or clipboard).
   */
  function toDataURL(state) {
    const offscreen = document.createElement('canvas');
    Renderer.render(offscreen, state, {}, true);
    return offscreen.toDataURL('image/png');
  }

  /**
   * Copy board image to clipboard (modern browsers).
   */
  async function copyToClipboard(state) {
    const offscreen = document.createElement('canvas');
    Renderer.render(offscreen, state, {}, true);

    return new Promise((resolve, reject) => {
      offscreen.toBlob(async blob => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          resolve();
        } catch (e) {
          reject(e);
        }
      }, 'image/png');
    });
  }

  function _defaultFilename() {
    const now = new Date();
    const ts  = `${now.getFullYear()}${_pad(now.getMonth()+1)}${_pad(now.getDate())}_`
              + `${_pad(now.getHours())}${_pad(now.getMinutes())}`;
    return `wormhole_${ts}.png`;
  }

  function _pad(n) { return String(n).padStart(2, '0'); }

  return { downloadPNG, toDataURL, copyToClipboard };
})();