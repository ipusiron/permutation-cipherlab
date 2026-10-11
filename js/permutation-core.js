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

  /* ==========================================================================
   * 順列の性質
   * ========================================================================== */

  /** 巡回表記。位置 i の文字は p[i] へ移る。各巡回は最小の位置から始める（長さ1も含む） */
  function cycles(perm) {
    const seen = new Array(perm.length).fill(false);
    const out = [];
    for (let i = 0; i < perm.length; i++) {
      if (seen[i]) continue;
      const cyc = [];
      for (let j = i; !seen[j]; j = perm[j] - 1) {
        seen[j] = true;
        cyc.push(j + 1);
      }
      out.push(cyc);
    }
    return out;
  }

  const gcd = (a, b) => (b ? gcd(b, a % b) : a);

  /** 位数（同じ鍵を何回かけると元に戻るか）＝巡回の長さの最小公倍数 */
  function order(perm) {
    return cycles(perm).reduce((acc, c) => (acc / gcd(acc, c.length)) * c.length, 1);
  }

  /** 動かない位置（1始まり） */
  function fixedPoints(perm) {
    return perm.map((to, i) => (to === i + 1 ? i + 1 : 0)).filter(Boolean);
  }

  /** 2回かけると元に戻るか（自分自身が逆の順列） */
  function isInvolution(perm) {
    return perm.every((to, i) => perm[to - 1] === i + 1);
  }

  /** 同じ鍵を k 回続けてかけた鍵 */
  function power(perm, k) {
    let out = perm.map((_, i) => i + 1);
    for (let t = 0; t < k; t++) out = compose(out, perm);
    return out;
  }

  /** 置換行列。M[j][i] = 1 は「平文の位置 i+1 の文字が暗号文の位置 j+1 へ移る」（暗号文の列ベクトル＝M×平文の列ベクトル） */
  function permutationMatrix(perm) {
    const n = perm.length;
    const m = Array.from({ length: n }, () => new Array(n).fill(0));
    perm.forEach((to, i) => { m[to - 1][i] = 1; });
    return m;
  }

  /** log2(n!)（鍵の数のビット数） */
  function log2Factorial(n) {
    let s = 0;
    for (let k = 2; k <= n; k++) s += Math.log2(k);
    return s;
  }

  /* ==========================================================================
   * ほかの転置式暗号を、長さ L の1つの順列（送る向き）にする
   * どれも「暗号文の k 文字目に平文の何文字目が来るか」（読む順）を作り、送る向きに直す
   * ========================================================================== */

  function fromReadOrder(readOrder) {
    const perm = new Array(readOrder.length);
    readOrder.forEach((src, k) => { perm[src] = k + 1; });
    return perm;
  }

  function checkLength(L) {
    if (!Number.isInteger(L) || L < MIN_LENGTH || L > MAX_LENGTH) {
      return { ok: false, error: { key: 'convert.length', params: { min: MIN_LENGTH, max: MAX_LENGTH } } };
    }
    return null;
  }

  /** レールフェンス。sequential＝1→2→…→r→1…（Day034 の方式1）、zigzag＝端で折り返す（方式2） */
  function railFence(L, rails, method = 'sequential') {
    const bad = checkLength(L);
    if (bad) return bad;
    if (!Number.isInteger(rails) || rails < 2 || rails >= L) {
      return { ok: false, error: { key: 'convert.rails', params: { max: L - 1 } } };
    }
    const period = method === 'zigzag' ? 2 * (rails - 1) : rails;
    const railOf = (i) => {
      const k = i % period;
      return method === 'zigzag' && k >= rails ? period - k : k;
    };
    const readOrder = [];
    for (let r = 0; r < rails; r++) for (let i = 0; i < L; i++) if (railOf(i) === r) readOrder.push(i);
    return { ok: true, perm: fromReadOrder(readOrder) };
  }

  /** スキュタレー（Day010 と同じ）。行数 rows の表に行方向で書き、列方向に読む。空きのマスは飛ばす */
  function scytale(L, rows) {
    const bad = checkLength(L);
    if (bad) return bad;
    if (!Number.isInteger(rows) || rows < 2 || rows >= L) {
      return { ok: false, error: { key: 'convert.rows', params: { max: L - 1 } } };
    }
    const cols = Math.ceil(L / rows);
    const readOrder = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) if (r * cols + c < L) readOrder.push(r * cols + c);
    return { ok: true, perm: fromReadOrder(readOrder) };
  }

  /** 縦列転置の鍵（Day043 と同じ読み方）。数列は列の順位、キーワードはアルファベット順（同じ文字は左が先） */
  function columnarRanks(str) {
    const text = String(str ?? '').normalize('NFKC').trim();
    if (/\d/.test(text)) {
      const parsed = parseNumbers(text);
      if (!parsed.ok) return parsed;
      const v = validatePermutation(parsed.values);
      return v.ok ? { ok: true, ranks: parsed.values } : v;
    }
    const letters = text.toUpperCase().replace(/[^A-Z]/g, '');
    if (letters.length < MIN_LENGTH || letters.length > MAX_LENGTH) {
      return { ok: false, error: { key: 'convert.keyword', params: { min: MIN_LENGTH, max: MAX_LENGTH } } };
    }
    const idx = [...letters].map((ch, i) => [ch, i]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]));
    const ranks = new Array(letters.length);
    idx.forEach(([, i], r) => { ranks[i] = r + 1; });
    return { ok: true, ranks };
  }

  /** 縦列転置。長さ L の文を列数 ranks.length の表に行方向で書き、順位の小さい列から上→下に読む（不完全な表も可） */
  function columnar(L, ranks) {
    const bad = checkLength(L);
    if (bad) return bad;
    const cols = ranks.length;
    if (cols >= L) return { ok: false, error: { key: 'convert.columns', params: { max: L - 1 } } };
    const colOrder = ranks.map((r, c) => [r, c]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const readOrder = [];
    for (const c of colOrder) for (let i = c; i < L; i += cols) readOrder.push(i);
    return { ok: true, perm: fromReadOrder(readOrder) };
  }

  /** 経路暗号（渦巻き）。rows×cols の表に行方向で書き、左上から時計回りに内側へ読む */
  function spiral(rows, cols) {
    const L = rows * cols;
    const bad = checkLength(L);
    if (bad) return bad;
    if (rows < 2 || cols < 2) return { ok: false, error: { key: 'convert.grid' } };
    const readOrder = [];
    let top = 0, bottom = rows - 1, left = 0, right = cols - 1;
    while (top <= bottom && left <= right) {
      for (let c = left; c <= right; c++) readOrder.push(top * cols + c);
      for (let r = top + 1; r <= bottom; r++) readOrder.push(r * cols + right);
      if (top < bottom) for (let c = right - 1; c >= left; c--) readOrder.push(bottom * cols + c);
      if (left < right) for (let r = bottom - 1; r > top; r--) readOrder.push(r * cols + left);
      top++; bottom--; left++; right--;
    }
    return { ok: true, perm: fromReadOrder(readOrder) };
  }

  /** 逆順（文字の並びを後ろから読む） */
  function reverse(L) {
    const bad = checkLength(L);
    if (bad) return bad;
    return { ok: true, perm: Array.from({ length: L }, (_, i) => L - i) };
  }

  /* ==========================================================================
   * 既知平文: 平文と暗号文の組から、矛盾しない鍵（送る向き）を求めて数える
   * ========================================================================== */
  const COUNT_LIMIT = 20;   // 数え上げは n≤20 まで（2^n の表を使う）

  /** 1つの完全マッチング（増加路法）。見つからなければ null */
  function findMatching(allowed) {
    const n = allowed.length;
    const matchOfCipher = new Array(n).fill(-1);
    const tryAssign = (i, seen) => {
      for (const j of allowed[i]) {
        if (seen[j]) continue;
        seen[j] = true;
        if (matchOfCipher[j] < 0 || tryAssign(matchOfCipher[j], seen)) {
          matchOfCipher[j] = i;
          return true;
        }
      }
      return false;
    };
    for (let i = 0; i < n; i++) if (!tryAssign(i, new Array(n).fill(false))) return null;
    const perm = new Array(n);
    matchOfCipher.forEach((i, j) => { perm[i] = j + 1; });
    return perm;
  }

  /** 完全マッチングの数（n≤20）。2^53 を超える場合は Infinity にせず近似値になるので、上限を返す側で扱う */
  function countMatchings(allowed) {
    const n = allowed.length;
    const masks = allowed.map(list => list.reduce((m, j) => m | (1 << j), 0));
    const dp = new Float64Array(1 << n);
    dp[0] = 1;
    for (let mask = 0; mask < (1 << n); mask++) {
      const v = dp[mask];
      if (!v) continue;
      let i = 0;
      for (let x = mask; x; x &= x - 1) i++;
      if (i >= n) continue;
      let free = masks[i] & ~mask;
      while (free) {
        const bit = free & -free;
        dp[mask | bit] += v;
        free ^= bit;
      }
    }
    return dp[(1 << n) - 1];
  }

  /**
   * 平文と暗号文（同じ鍵・同じ埋字で作ったもの）から、ブロック長 n の鍵を調べる。
   * 完全なブロックだけを使う。返す値: consistent（矛盾しない鍵があるか）、count（鍵の数。n>20 は null）、
   * key（1つ。count が1なら唯一の鍵）、candidates（平文の各位置が行けそうな暗号文の位置）、blocks（使ったブロック数）
   */
  function knownPlaintext(plainText, cipherText, n) {
    const P = toUnits(plainText);
    const Cu = toUnits(cipherText);
    const blocks = Math.floor(Math.min(P.length, Cu.length) / n);
    if (blocks < 1) return { ok: false, error: { key: 'kpa.tooShort', params: { n } } };
    const allowed = [];
    for (let i = 0; i < n; i++) {
      const list = [];
      for (let j = 0; j < n; j++) {
        let ok = true;
        for (let r = 0; r < blocks && ok; r++) ok = P[r * n + i] === Cu[r * n + j];
        if (ok) list.push(j);
      }
      allowed.push(list);
    }
    const key = findMatching(allowed);
    const count = !key ? 0 : n <= COUNT_LIMIT ? countMatchings(allowed) : null;
    return {
      ok: true,
      n,
      blocks,
      consistent: Boolean(key),
      count,
      key,
      candidates: allowed.map(list => list.map(j => j + 1)),
    };
  }

  /** ブロック長がわからないとき、2〜上限の各 n で矛盾しない鍵があるかを調べる */
  function knownPlaintextScan(plainText, cipherText, maxN = MAX_LENGTH) {
    const len = Math.min(toUnits(plainText).length, toUnits(cipherText).length);
    const out = [];
    for (let n = MIN_LENGTH; n <= Math.min(maxN, len); n++) {
      const r = knownPlaintext(plainText, cipherText, n);
      if (r.ok && r.consistent) out.push({ n, count: r.count, blocks: r.blocks, key: r.key });
    }
    return out;
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
    cycles,
    order,
    fixedPoints,
    isInvolution,
    power,
    permutationMatrix,
    log2Factorial,
    fromReadOrder,
    railFence,
    scytale,
    columnarRanks,
    columnar,
    spiral,
    reverse,
    COUNT_LIMIT,
    findMatching,
    countMatchings,
    knownPlaintext,
    knownPlaintextScan,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PermutationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
