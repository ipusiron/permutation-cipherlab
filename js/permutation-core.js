/* ============================================================================
 * Permutation CipherLab - 計算部（DOMに依存しない）
 * ============================================================================
 *
 * 鍵は内部では「送る向き」の配列 p（1始まり）で持つ。
 *   送る向き   : 平文の i 文字目を、暗号文の位置 p[i] へ送る（本ツールの既定）
 *   取り出す向き: 暗号文の i 文字目を、平文の q[i] 文字目から取る（Stinson の教科書・dCode）
 * 同じ並べ替えを2通りに書いたもので、q は p の逆の順列になる。
 *
 * 文字は NFC に正規化したあと、1コードポイントずつ扱う（絵文字を途中で切らない）。
 * 文言は持たない。エラーや注意は { key, params } で返し、表示の直前に messages.js で文にする。
 * ブラウザーでは window.PermutationCore、Node では require() で読む。
 * ============================================================================ */
(function (root) {
  'use strict';

  const MIN_LENGTH = 2;
  const MAX_LENGTH = 64;
  const DIRECTIONS = ['to', 'from'];

  // 区切りとして受け付ける文字（NFKC で全角の数字・ハイフン・カンマ・空白は半角になる）
  const SEPARATORS = /[\s,、\-‐‑‒–—―−ー]+/u;

  /** テキストを1コードポイントずつの配列にする（NFC） */
  function toUnits(text) {
    return Array.from(String(text ?? '').normalize('NFC'));
  }

  /** 1から n までが1回ずつ入っているか。理由は { key, params } で返す */
  function validatePermutation(perm) {
    if (!Array.isArray(perm) || perm.length < MIN_LENGTH || perm.length > MAX_LENGTH) {
      return { ok: false, error: { key: 'key.length', params: { min: MIN_LENGTH, max: MAX_LENGTH } } };
    }
    const n = perm.length;
    if (perm.some(x => !Number.isInteger(x))) {
      return { ok: false, error: { key: 'key.format' } };
    }
    const outOfRange = [...new Set(perm.filter(x => x < 1 || x > n))];
    if (outOfRange.length) {
      return { ok: false, error: { key: 'key.range', params: { values: outOfRange.join(', '), n } } };
    }
    const seen = new Set();
    const dup = new Set();
    for (const x of perm) {
      if (seen.has(x)) dup.add(x);
      seen.add(x);
    }
    if (dup.size) {
      const missing = [];
      for (let i = 1; i <= n; i++) if (!seen.has(i)) missing.push(i);
      return {
        ok: false,
        error: { key: 'key.duplicate', params: { values: [...dup].join(', '), missing: missing.join(', ') } },
      };
    }
    return { ok: true };
  }

  /** 鍵の文字列を数の配列にする（向きの変換はしない） */
  function parseNumbers(str) {
    const text = String(str ?? '').normalize('NFKC').trim();
    if (!text) return { ok: false, error: { key: 'key.empty' } };
    const parts = text.split(SEPARATORS).filter(Boolean);
    if (!parts.length) return { ok: false, error: { key: 'key.empty' } };
    if (parts.some(x => !/^\d{1,3}$/.test(x))) return { ok: false, error: { key: 'key.format' } };
    return { ok: true, values: parts.map(x => Number.parseInt(x, 10)) };
  }

  /** 逆の順列（送る向き⇔取り出す向き、暗号化の鍵⇔復号の鍵） */
  function inversePermutation(perm) {
    const inv = new Array(perm.length);
    perm.forEach((to, i) => { inv[to - 1] = i + 1; });
    return inv;
  }

  /** 書かれた向きの数列を、内部の送る向きの配列にする */
  function fromNotation(values, direction) {
    return direction === 'from' ? inversePermutation(values) : values.slice();
  }

  /** 内部の送る向きの配列を、指定した向きの数列にする */
  function toNotation(perm, direction) {
    return direction === 'from' ? inversePermutation(perm) : perm.slice();
  }

  /** 鍵の文字列を読み、検証して送る向きの配列を返す */
  function parseKey(str, direction = 'to') {
    const parsed = parseNumbers(str);
    if (!parsed.ok) return parsed;
    const v = validatePermutation(parsed.values);
    if (!v.ok) return v;
    return { ok: true, perm: fromNotation(parsed.values, direction) };
  }

  /** 鍵を「3-1-4-2」の形で書く */
  function formatKey(perm, direction = 'to') {
    return toNotation(perm, direction).join('-');
  }

  /** 0 以上 max 未満の一様な整数（剰余の偏りを棄却して除く） */
  function randomBelow(max, getRandomValues) {
    const range = 0x100000000;
    const limit = range - (range % max);
    const buf = new Uint32Array(1);
    for (;;) {
      getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % max;
    }
  }

  /** 暗号用の乱数で n 個の順列を作る（Fisher–Yates） */
  function randomPermutation(n, getRandomValues) {
    if (typeof getRandomValues !== 'function') throw new Error('crypto.getRandomValues is required');
    const arr = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--) {
      const j = randomBelow(i + 1, getRandomValues);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** 埋字は1コードポイントの見える文字。空なら埋字なし */
  function validatePadChar(padChar) {
    const units = toUnits(padChar);
    if (units.length === 0) return { ok: true, padChar: '' };
    if (units.length > 1) return { ok: false, error: { key: 'pad.length' } };
    if (/[\p{C}\s]/u.test(units[0])) return { ok: false, error: { key: 'pad.invisible' } };
    return { ok: true, padChar: units[0] };
  }

  /** 1ブロックを送る向きの鍵で並べ替える（長さは鍵と同じ） */
  function permuteBlock(units, perm) {
    const out = new Array(perm.length);
    for (let i = 0; i < perm.length; i++) out[perm[i] - 1] = units[i];
    return out;
  }

  /**
   * 暗号化。最後のブロックが短いとき、pad が真で埋字があれば埋めてから並べ替え、
   * そうでなければ並べ替えずにそのまま残す。
   */
  function encrypt(text, perm, { pad = true, padChar = 'X' } = {}) {
    const n = perm.length;
    const units = toUnits(text);
    const usePad = Boolean(pad && padChar);
    const blocks = [];
    const out = [];
    for (let s = 0; s < units.length; s += n) {
      const plain = units.slice(s, s + n);
      const block = { index: blocks.length, plain, cipher: null, padCount: 0, permuted: true };
      if (plain.length < n) {
        if (usePad) {
          block.padCount = n - plain.length;
          block.plain = plain.concat(new Array(block.padCount).fill(padChar));
        } else {
          block.permuted = false;
        }
      }
      block.cipher = block.permuted ? permuteBlock(block.plain, perm) : block.plain.slice();
      out.push(...block.cipher);
      blocks.push(block);
    }
    const notes = [];
    const last = blocks[blocks.length - 1];
    if (last && !last.permuted) notes.push({ key: 'enc.shortBlockKept', params: { count: last.plain.length, n } });
    if (usePad && units.length && units[units.length - 1] === padChar) {
      notes.push({ key: 'enc.endsWithPad', params: { pad: padChar } });
    }
    return {
      output: out.join(''),
      blocks,
      length: units.length,
      padCount: last ? last.padCount : 0,
      notes,
    };
  }

  /**
   * 復号。n 字にそろったブロックは逆の鍵で戻す。短い最後のブロックは並べ替えずに残す。
   * trimPad が真で、暗号文が n の倍数のときだけ、末尾の埋字を最大 n−1 字まで除く。
   */
  function decrypt(text, perm, { trimPad = true, padChar = 'X' } = {}) {
    const n = perm.length;
    const inv = inversePermutation(perm);
    const units = toUnits(text);
    const blocks = [];
    const out = [];
    for (let s = 0; s < units.length; s += n) {
      const cipher = units.slice(s, s + n);
      const block = { index: blocks.length, cipher, plain: null, permuted: cipher.length === n };
      block.plain = block.permuted ? permuteBlock(cipher, inv) : cipher.slice();
      out.push(...block.plain);
      blocks.push(block);
    }
    const notes = [];
    let trimmed = 0;
    const last = blocks[blocks.length - 1];
    if (last && !last.permuted) {
      notes.push({ key: 'dec.shortBlockKept', params: { count: last.cipher.length, n } });
    } else if (trimPad && padChar && last) {
      while (trimmed < n - 1 && out.length > 0 && out[out.length - 1] === padChar) {
        out.pop();
        trimmed++;
      }
      if (trimmed) notes.push({ key: 'dec.trimmed', params: { count: trimmed, pad: padChar } });
    }
    return { output: out.join(''), blocks, trimmed, length: units.length, notes };
  }

  /**
   * 1ブロックの途中経過。最初の step 本の線（平文の位置 0..step-1）だけを引いた状態で、
   * 暗号文の各位置に入った文字（まだなら null）を返す。
   */
  function partialBlock(units, perm, step) {
    const n = perm.length;
    const k = Math.max(0, Math.min(n, step));
    const out = new Array(n).fill(null);
    for (let i = 0; i < k; i++) out[perm[i] - 1] = units[i] ?? null;
    return out;
  }

  /** 2つの鍵を続けてかけた結果（先に a、次に b）を1つの鍵にする */
  function compose(a, b) {
    return a.map(to => b[to - 1]);
  }

  /** 保存した鍵の一覧を検証する（壊れた項目は数だけ返して捨てる） */
  function sanitizeSaved(list) {
    if (!Array.isArray(list)) return { items: [], dropped: 0 };
    const items = [];
    let dropped = 0;
    const names = new Set();
    for (const item of list) {
      const ok = item && typeof item.name === 'string' && typeof item.pattern === 'string'
        && item.name.trim() && item.name.length <= 60 && !names.has(item.name);
      const parsed = ok ? parseKey(item.pattern, 'to') : null;
      if (!parsed || !parsed.ok) { dropped++; continue; }
      names.add(item.name);
      items.push({ name: item.name, pattern: formatKey(parsed.perm, 'to') });
    }
    return { items, dropped };
  }

  const api = {
    MIN_LENGTH,
    MAX_LENGTH,
    DIRECTIONS,
    toUnits,
    validatePermutation,
    parseNumbers,
    parseKey,
    formatKey,
    inversePermutation,
    fromNotation,
    toNotation,
    randomBelow,
    randomPermutation,
    validatePadChar,
    permuteBlock,
    encrypt,
    decrypt,
    partialBlock,
    compose,
    sanitizeSaved,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PermutationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
