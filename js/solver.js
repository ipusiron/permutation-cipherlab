/* ============================================================================
 * Permutation CipherLab - 鍵なし解読（多重アナグラム）
 * ============================================================================
 *
 * ブロック転置は「暗号文を k 文字ずつの行に並べた表の、列の並べ替え」と同じ。どの行も同じ鍵なので、
 * 列 a の直後に列 b を読んだときの英語らしさ（2文字の統計）を全部の行で足し、列の読む順を探す。
 * 行の終わりから次の行の初めへのつながりも数えるので、読む順の始まりも決まる。
 *
 * - 列の読む順は、採点の最大値をビットDP（Held–Karp と同じ形）で厳密に求める。k≤16
 * - ブロック長が不明なときは k=2〜16 を全部解き、合計の得点から 2×log10(k!) を引いた値で並べる
 *   （大きい k ほど並べ方の自由が増えて得点が上がりやすいため。評価は README と調査ファイルを参照）
 * - 最後の半端な部分（埋字なしの短いブロック）は並べ替えていない尾として、行の最後につなげて採点する
 * - 暗号文に英字以外（空白・句読点）があれば28記号の表、英字だけなら26記号の表を使う
 *
 * DOM に依存しない。ブラウザーでは window.PclSolver、Node では require() で読む。
 * ============================================================================ */
(function (root) {
  'use strict';

  const Bigrams = typeof module !== 'undefined' && module.exports
    ? require('./english-bigrams.js')
    : root.PclEnglishBigrams;

  const MAX_K = 16;
  const MIN_K = 2;
  const MAX_INPUT = 10000;
  const PENALTY = 2;

  /** 暗号文の各文字を記号の番号にする。英字以外がなければ26記号の表を使う */
  function encode(units) {
    const letterOnly = units.every(ch => /^[A-Za-z]$/.test(ch));
    const codes = units.map((ch) => {
      const c = ch.toUpperCase().charCodeAt(0);
      if (ch.length === 1 && c >= 65 && c <= 90) return c - 65;
      return /^\s$/u.test(ch) ? 26 : 27;
    });
    return letterOnly
      ? { codes, table: Bigrams.LETTERS, size: 26, model: 'letters' }
      : { codes, table: Bigrams.WITH_SPACE, size: 28, model: 'withSpace' };
  }

  function log10Factorial(k) {
    let s = 0;
    for (let i = 2; i <= k; i++) s += Math.log10(i);
    return s;
  }

  /** k 列の表で、列 a の直後に列 b を読んだときの得点（全行の和）など */
  function columnScores(enc, k) {
    const { codes, table, size } = enc;
    const rows = Math.floor(codes.length / k);
    const tail = codes.slice(rows * k);
    const bg = (a, b) => table[a * size + b];
    const edge = Array.from({ length: k }, () => new Float64Array(k));
    const wrap = Array.from({ length: k }, () => new Float64Array(k));
    const tailIn = new Float64Array(k);
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) {
        if (a !== b) {
          let v = 0;
          for (let r = 0; r < rows; r++) v += bg(codes[r * k + a], codes[r * k + b]);
          edge[a][b] = v;
        }
        let w = 0;
        for (let r = 0; r + 1 < rows; r++) w += bg(codes[r * k + a], codes[(r + 1) * k + b]);
        wrap[a][b] = w;
      }
      if (tail.length && rows) tailIn[a] = bg(codes[(rows - 1) * k + a], tail[0]);
    }
    return { rows, tailLength: tail.length, edge, wrap, tailIn };
  }

  /** 列の読む順（暗号文の列番号、0始まり）の得点 */
  function orderScore(scores, order) {
    let s = 0;
    for (let t = 0; t + 1 < order.length; t++) s += scores.edge[order[t]][order[t + 1]];
    const last = order[order.length - 1];
    return s + scores.wrap[last][order[0]] + scores.tailIn[last];
  }

  /** 採点の最大値を与える列の読む順を厳密に求める（k≤16） */
  function bestOrder(scores, k) {
    const FULL = (1 << k) - 1;
    const dp = new Float64Array((1 << k) * k);
    const parent = new Int8Array((1 << k) * k);
    let best = -Infinity;
    let bestPath = null;
    for (let start = 0; start < k; start++) {
      dp.fill(-Infinity);
      dp[(1 << start) * k + start] = 0;
      for (let mask = 1; mask <= FULL; mask++) {
        if (!(mask & (1 << start))) continue;
        for (let j = 0; j < k; j++) {
          const v = dp[mask * k + j];
          if (v === -Infinity) continue;
          const ej = scores.edge[j];
          for (let x = 0; x < k; x++) {
            if (mask & (1 << x)) continue;
            const next = mask | (1 << x);
            const nv = v + ej[x];
            if (nv > dp[next * k + x]) {
              dp[next * k + x] = nv;
              parent[next * k + x] = j;
            }
          }
        }
      }
      for (let j = 0; j < k; j++) {
        const v = dp[FULL * k + j] + scores.wrap[j][start] + scores.tailIn[j];
        if (v > best) {
          best = v;
          const path = [];
          let mask = FULL;
          let cur = j;
          while (cur !== start || mask !== (1 << start)) {
            path.push(cur);
            const p = parent[mask * k + cur];
            mask &= ~(1 << cur);
            cur = p;
          }
          path.push(start);
          bestPath = path.reverse();
        }
      }
    }
    return { score: best, order: bestPath };
  }

  /** 列の読む順から、送る向きの鍵（平文の位置 t → 暗号文の位置 order[t]+1）と平文を作る */
  function readWith(units, k, order) {
    const rows = Math.floor(units.length / k);
    let plain = '';
    for (let r = 0; r < rows; r++) for (const c of order) plain += units[r * k + c];
    plain += units.slice(rows * k).join('');
    return { key: order.map(c => c + 1), plain };
  }

  /** ブロック長 k で解く */
  function solveLength(text, k) {
    const units = Array.from(String(text ?? '').normalize('NFC'));
    if (!Number.isInteger(k) || k < MIN_K || k > MAX_K) {
      return { ok: false, error: { key: 'solve.k', params: { min: MIN_K, max: MAX_K } } };
    }
    if (units.length > MAX_INPUT) return { ok: false, error: { key: 'solve.tooLong', params: { max: MAX_INPUT } } };
    if (Math.floor(units.length / k) < 2) return { ok: false, error: { key: 'solve.tooShort', params: { k } } };
    const enc = encode(units);
    const scores = columnScores(enc, k);
    const { score, order } = bestOrder(scores, k);
    const { key, plain } = readWith(units, k, order);
    const pairs = scores.rows * (k - 1) + (scores.rows - 1) + (scores.tailLength ? scores.tailLength : 0);
    return {
      ok: true,
      k,
      model: enc.model,
      key,
      plain,
      score,
      perPair: score / 100 / Math.max(1, pairs),
      rank: score / 100 - PENALTY * log10Factorial(k),
      rows: scores.rows,
      tail: scores.tailLength,
    };
  }

  /** ブロック長の候補を順に解く（onProgress で途中経過を返す）。結果は rank の大きい順 */
  function solveAuto(text, { minK = MIN_K, maxK = MAX_K, onProgress } = {}) {
    const units = Array.from(String(text ?? '').normalize('NFC'));
    if (units.length > MAX_INPUT) return { ok: false, error: { key: 'solve.tooLong', params: { max: MAX_INPUT } } };
    const hi = Math.min(maxK, Math.floor(units.length / 2));
    if (hi < minK) return { ok: false, error: { key: 'solve.tooShort', params: { k: minK } } };
    const results = [];
    for (let k = minK; k <= hi; k++) {
      const r = solveLength(text, k);
      if (r.ok) results.push(r);
      if (onProgress) onProgress(k, hi);
    }
    results.sort((a, b) => b.rank - a.rank);
    return { ok: true, results };
  }

  /** 作業台: 隣り合う2列の、1行あたりの平均の得点（log10、高いほど英語らしい） */
  function adjacency(text, k, order) {
    const units = Array.from(String(text ?? '').normalize('NFC'));
    const enc = encode(units);
    const scores = columnScores(enc, k);
    const out = [];
    for (let t = 0; t + 1 < order.length; t++) {
      out.push(scores.edge[order[t]][order[t + 1]] / 100 / Math.max(1, scores.rows));
    }
    return { pairs: out, total: orderScore(scores, order) / 100, model: enc.model, rows: scores.rows };
  }

  const api = {
    MIN_K,
    MAX_K,
    MAX_INPUT,
    PENALTY,
    encode,
    columnScores,
    orderScore,
    bestOrder,
    solveLength,
    solveAuto,
    adjacency,
    log10Factorial,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PclSolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
