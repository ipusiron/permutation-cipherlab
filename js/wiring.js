/* ============================================================================
 * Permutation CipherLab - 配線図（SVG）
 * ============================================================================
 * 上の段の位置 i から下の段の位置 j へ線を引く。属性とクラスだけで組み立て、
 * style 属性は使わない（CSP の style-src 'self' のまま描ける）。
 * 図は自然な大きさで描き、はみ出す分は外側の枠で横にスクロールさせる。
 * ============================================================================ */
(function (root) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const CELL = 40;
  const BOX = 30;
  const LEFT = 64;
  const RIGHT = 12;
  const TOP_Y = 26;
  const BOTTOM_Y = 116;
  const HEIGHT = 166;

  function el(name, attrs, text) {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /** 箱の中に出す文字。空白は ␣、見えない文字は U+XXXX の形にする */
  function displayChar(ch) {
    if (ch === null || ch === undefined) return { text: '', small: false };
    if (ch === ' ') return { text: '␣', small: false };
    if (/[\p{C}\p{Z}]/u.test(ch)) {
      return { text: 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'), small: true };
    }
    return { text: ch, small: false };
  }

  const cx = i => LEFT + i * CELL + CELL / 2;

  function box(group, x, y, label, cls) {
    const shown = displayChar(label);
    group.append(el('rect', {
      x: x - BOX / 2, y, width: BOX, height: BOX, rx: 5,
      class: `wbox ${cls}${label === null ? ' empty' : ''}`,
    }));
    if (shown.text) {
      group.append(el('text', {
        x, y: y + BOX / 2, class: `wchar${shown.small ? ' small' : ''}`,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
      }, shown.text));
    }
  }

  /**
   * opts:
   *   n            位置の数
   *   top, bottom  各位置の箱に出す文字（null は空の箱）。省略すると位置の番号
   *   links        [[上の位置, 下の位置], …]（0始まり）。配列の順に引く
   *   drawn        引く本数（省略時はすべて）
   *   topTitle, bottomTitle  左端の見出し
   *   label        図全体の説明（aria-label）
   */
  function render(svg, opts) {
    const n = opts.n;
    const width = LEFT + n * CELL + RIGHT;
    const drawn = Math.max(0, Math.min(opts.links.length, opts.drawn ?? opts.links.length));
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${width} ${HEIGHT}`);
    svg.setAttribute('width', width);
    svg.setAttribute('height', HEIGHT);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label || '');

    const wires = el('g', { class: 'wires' });
    opts.links.forEach(([from, to], k) => {
      if (k >= drawn) return;
      const x1 = cx(from);
      const x2 = cx(to);
      const y1 = TOP_Y + BOX;
      const y2 = BOTTOM_Y - 7;
      const ym = (y1 + y2) / 2;
      const cls = ['wire'];
      if (from === to) cls.push('fixed');
      if (opts.drawn !== undefined && k === drawn - 1 && drawn < opts.links.length) cls.push('active');
      wires.append(el('path', { d: `M ${x1} ${y1} C ${x1} ${ym}, ${x2} ${ym}, ${x2} ${y2}`, class: cls.join(' ') }));
      // 矢じりは三角形で描く（marker は使わない）
      wires.append(el('polygon', {
        points: `${x2 - 5},${y2 - 1} ${x2 + 5},${y2 - 1} ${x2},${BOTTOM_Y}`,
        class: `tip${cls.includes('active') ? ' active' : ''}`,
      }));
    });
    svg.append(wires);

    const boxes = el('g', { class: 'boxes' });
    for (let i = 0; i < n; i++) {
      const x = cx(i);
      boxes.append(el('text', { x, y: TOP_Y - 8, class: 'wpos', 'text-anchor': 'middle' }, String(i + 1)));
      boxes.append(el('text', { x, y: BOTTOM_Y + BOX + 18, class: 'wpos', 'text-anchor': 'middle' }, String(i + 1)));
      box(boxes, x, TOP_Y, opts.top ? opts.top[i] ?? null : String(i + 1), 'top');
      box(boxes, x, BOTTOM_Y, opts.bottom ? opts.bottom[i] ?? null : String(i + 1), 'bottom');
    }
    if (opts.topTitle) boxes.append(el('text', { x: 6, y: TOP_Y + BOX / 2, class: 'wtitle', 'dominant-baseline': 'central' }, opts.topTitle));
    if (opts.bottomTitle) {
      boxes.append(el('text', { x: 6, y: BOTTOM_Y + BOX / 2, class: 'wtitle', 'dominant-baseline': 'central' }, opts.bottomTitle));
    }
    svg.append(boxes);
  }

  const api = { render, displayChar, CELL, LEFT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PclWiring = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
