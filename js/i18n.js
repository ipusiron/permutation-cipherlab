/* ============================================================================
 * Permutation CipherLab - 画面の日英切り替え
 * ============================================================================
 *
 * index.html は日本語のまま書いておく。読み込んだ直後に、日本語を含む文字列（テキストノードと
 * placeholder・aria-label・title）を控え、英語では js/i18n-en.js の対応表で入れ替え、
 * 日本語に戻すときは控えた原文に戻す。
 * JavaScript があとから書き換えた所（結果・鍵の表示など）は入れ替えない。それらは
 * messages.js の文言で描き直す。[data-i18n-skip] の中も入れ替えない。
 * ============================================================================ */
(function (root) {
  'use strict';

  const JA_RANGES = [[0x3000, 0x30ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xff00, 0xffef]];
  const ATTRS = ['placeholder', 'aria-label', 'title'];

  function hasJapanese(text) {
    for (const ch of String(text ?? '')) {
      const cp = ch.codePointAt(0);
      if (JA_RANGES.some(([a, b]) => cp >= a && cp <= b)) return true;
    }
    return false;
  }

  const normalize = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();

  let records = null;
  let current = 'ja';

  function skipped(el) {
    return !el || Boolean(el.closest('script, style, noscript, [data-i18n-skip]'));
  }

  /** 日本語を含む文字列を控える（画面を描く前に1回だけ呼ぶ） */
  function collect(rootEl) {
    records = { text: [], attr: [] };
    const walker = rootEl.ownerDocument.createTreeWalker(rootEl, 4 /* NodeFilter.SHOW_TEXT */);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (skipped(node.parentElement) || !hasJapanese(node.nodeValue)) continue;
      records.text.push({ node, ja: node.nodeValue, key: normalize(node.nodeValue) });
    }
    for (const el of rootEl.querySelectorAll('*')) {
      if (skipped(el)) continue;
      for (const attr of ATTRS) {
        const value = el.getAttribute(attr);
        if (value && hasJapanese(value)) records.attr.push({ el, attr, ja: value, key: normalize(value) });
      }
    }
    current = 'ja';
    return records;
  }

  /** 英語の文字列。原文の前後の空白は、英語の側に空白がなければ残す */
  function english(rec, dict) {
    const en = dict[rec.key];
    if (en === undefined) return rec.ja;
    const lead = rec.ja.match(/^\s*/)[0];
    const trail = rec.ja.match(/\s*$/)[0];
    return (en.startsWith(' ') ? '' : lead) + en + (en.endsWith(' ') ? '' : trail);
  }

  /** 控えた文字列を lang（'ja'／'en'）に入れ替える。控えた時の文字列のままの所だけ */
  function apply(lang, dict) {
    if (!records) return;
    const valueFor = (rec, which) => (which === 'ja' ? rec.ja : english(rec, dict));
    for (const rec of records.text) {
      if (rec.node.nodeValue !== valueFor(rec, current)) continue;
      rec.node.nodeValue = valueFor(rec, lang);
    }
    for (const rec of records.attr) {
      const before = current === 'ja' ? rec.ja : (dict[rec.key] ?? rec.ja);
      if (rec.el.getAttribute(rec.attr) !== before) continue;
      rec.el.setAttribute(rec.attr, lang === 'ja' ? rec.ja : (dict[rec.key] ?? rec.ja));
    }
    current = lang;
  }

  /** 対応表にない原文（テストと確認用） */
  function missing(dict) {
    if (!records) return [];
    return [...new Set([...records.text, ...records.attr].map(r => r.key).filter(k => dict[k] === undefined))];
  }

  /** 初めの言語: ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語） */
  function initialLanguage(search, stored, navigatorLanguage) {
    const fromUrl = new URLSearchParams(search || '').get('lang');
    if (fromUrl === 'ja' || fromUrl === 'en') return fromUrl;
    if (stored === 'ja' || stored === 'en') return stored;
    return /^ja\b/i.test(String(navigatorLanguage || '')) ? 'ja' : 'en';
  }

  const api = { hasJapanese, normalize, collect, apply, missing, initialLanguage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PclI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
