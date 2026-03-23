/**
 * i18n.js — Internationalisation for Zcaro Editor
 * Supports: en (English), vi (Vietnamese)
 *
 * To add a new language:
 *   1. Add its code to TRANSLATIONS below.
 *   2. Translate every key.
 * To add a new key:
 *   1. Add it to 'en' with the English string.
 *   2. Add it to every other language.
 */

window.I18n = (() => {
  'use strict';

  const TRANSLATIONS = {
    en: {
      // App meta
      appName:          'Zcaro Editor',
      appSubtitle:      'by NguyenMinh',

      // Toolbar
      board:            'Board',
      autoSwitch:       'Auto-switch',
      safeMode:         'Safe',
      tapAgain:         'TAP AGAIN TO CONFIRM',
      shareLink:        '🔗 Share Link',
      copy:             '⎘ Copy',
      downloadPNG:      '⬇ PNG',
      clearLines:       '╱ Clear Lines',
      clear:            '✕ Clear',
      undo:             '↩',
      redo:             '↪',

      // Tool titles
      toolBlackStone:   'Black Stone (X)  [key: x]',
      toolWhiteStone:   'White Stone (O)  [key: o]',
      toolBlock:        'Block / Wall  [key: b]',
      toolHole:         'Portal Hole  [key: h]',
      toolLine:         'Analysis Line  [key: l]',
      toolEraser:       'Eraser  [key: e]',

      // Panels
      panelPortals:     '⬡ Portals',
      panelHistory:     '📋 History',
      panelShortcuts:   '⌨ Shortcuts',
      panelNotation:    'Position Notation',

      // Notation
      notationPlaceholder: 'Paste notation here and click Apply to load a position…',
      btnCopy:          'Copy',
      btnApply:         '↳ Apply',
      formatReference:  'Format reference',

      // History
      clearHistory:     'Clear',
      noMovesYet:       'No moves yet.',

      // Portal hint
      portalHint:       '✦ Click a second cell to complete the portal pair.',
      cancel:           'Cancel',

      // Status bar
      statusRightClick: 'Right-click = quick erase',

      // Shortcuts table
      shortcutBlack:    'Black Stone',
      shortcutWhite:    'White Stone',
      shortcutBlock:    'Block',
      shortcutHole:     'Portal Hole',
      shortcutLine:     'Line',
      shortcutEraser:   'Eraser',
      shortcutEsc:      'Cancel pending',
      shortcutUndo:     'Undo',
      shortcutRedo:     'Redo',
      shortcutRightClick: 'Quick erase',

      // Modal
      modalConfirm:     'Confirm',
      modalCancel:      'Cancel',
      modalDefaultMsg:  'Are you sure?',

      // Toasts
      toastLinkCopied:  'Shareable link copied to clipboard!',
      toastLinkFailed:  'Failed to copy link.',
      toastClipFailed:  'Failed to write to clipboard.',
      toastBoardChanged:'Board cleared.',
      toastParseOk:     'Position loaded.',
      toastParseFail:   'Failed to parse notation.',
      changeBoardConfirm: 'Change board size? This will clear the board.',
      clearBoardConfirm:  'Clear the entire board?',
    },

    vi: {
      // App meta
      appName:          'Zcaro Editor',
      appSubtitle:      '',

      // Toolbar
      board:            'Bàn cờ',
      autoSwitch:       'Đánh 2 bên',
      safeMode:         'Nhấn 2 lần ',
      tapAgain:         'Vị trí hiện tại',
      shareLink:        '🔗 Chia sẻ',
      copy:             '⎘ Sao chép',
      downloadPNG:      '⬇ PNG',
      clearLines:       '╱ Xóa đường',
      clear:            '✕ Xóa tất cả',
      undo:             '↩',
      redo:             '↪',

      // Tool titles
      toolBlackStone:   'Quân Đen (X)  [phím: x]',
      toolWhiteStone:   'Quân Trắng (O)  [phím: o]',
      toolBlock:        'Khoá  [phím: b]',
      toolHole:         'Cổng dịch chuyển  [phím: h]',
      toolLine:         'Đường phân tích  [phím: l]',
      toolEraser:       'Xoá  [phím: e]',

      // Panels
      panelPortals:     '⬡ Cổng dịch chuyển',
      panelHistory:     '📋 Lịch sử',
      panelShortcuts:   '⌨ Phím tắt',
      panelNotation:    'Ký hiệu vị trí',

      // Notation
      notationPlaceholder: 'Dán ký hiệu vào đây và nhấn Áp dụng để tải vị trí…',
      btnCopy:          'Sao chép',
      btnApply:         '↳ Áp dụng',
      formatReference:  'Tham chiếu định dạng',

      // History
      clearHistory:     'Xóa',
      noMovesYet:       'Chưa có nước đi nào.',

      // Portal hint
      portalHint:       '✦ Nhấn ô thứ hai để hoàn thành cổng.',
      cancel:           'Hủy',

      // Status bar
      statusRightClick: 'Chuột phải = xóa nhanh',

      // Shortcuts table
      shortcutBlack:    'Quân Đen',
      shortcutWhite:    'Quân Trắng',
      shortcutBlock:    'Khoá',
      shortcutHole:     'Cổng dịch chuyển',
      shortcutLine:     'Đường',
      shortcutEraser:   'Xoá',
      shortcutEsc:      'Hủy thao tác',
      shortcutUndo:     'Hoàn tác',
      shortcutRedo:     'Làm lại',
      shortcutRightClick: 'Xóa nhanh',

      // Modal
      modalConfirm:     'Xác nhận',
      modalCancel:      'Hủy',
      modalDefaultMsg:  'Bạn có chắc không?',

      // Toasts
      toastLinkCopied:  'Đã sao chép liên kết chia sẻ!',
      toastLinkFailed:  'Sao chép liên kết thất bại.',
      toastClipFailed:  'Không ghi được vào clipboard.',
      toastBoardChanged:'Đã xóa bàn cờ.',
      toastParseOk:     'Đã tải vị trí.',
      toastParseFail:   'Phân tích ký hiệu thất bại.',
      changeBoardConfirm: 'Đổi kích thước bàn? Điều này sẽ xóa bàn cờ.',
      clearBoardConfirm:  'Xóa toàn bộ bàn cờ?',
    },
  };

  const SUPPORTED = Object.keys(TRANSLATIONS);
  let _lang = localStorage.getItem('zcaro_lang') || 'en';
  if (!SUPPORTED.includes(_lang)) _lang = 'en';

  /** Translate a key. Falls back to English, then the raw key. */
  function t(key) {
    return (TRANSLATIONS[_lang] && TRANSLATIONS[_lang][key]) ||
           (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) ||
           key;
  }

  function getLang() { return _lang; }

  /**
   * Switch language and re-apply all [data-i18n] elements.
   * Dispatches a 'langchange' event on document so app.js can update dynamic strings.
   */
  function setLang(code) {
    if (!SUPPORTED.includes(code)) return;
    _lang = code;
    localStorage.setItem('zcaro_lang', code);
    _applyDOM();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: code } }));
  }

  /** Apply translations to all elements with [data-i18n] and [data-i18n-title]. */
  function _applyDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    // Update <html lang>
    document.documentElement.lang = _lang;
    document.title = t('appName');
  }

  /** Call once on page load after DOM is ready. */
  function init() { _applyDOM(); }

  return { t, getLang, setLang, init, SUPPORTED };
})();
