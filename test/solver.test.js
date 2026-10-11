const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/permutation-core.js');
const S = require('../js/solver.js');
const B = require('../js/english-bigrams.js');

// 『二都物語』（Charles Dickens、パブリックドメイン）の冒頭。統計の学習には使っていない作品
const DICKENS = 'IT WAS THE BEST OF TIMES, IT WAS THE WORST OF TIMES, IT WAS THE AGE OF WISDOM, '
  + 'IT WAS THE AGE OF FOOLISHNESS, IT WAS THE EPOCH OF BELIEF, IT WAS THE EPOCH OF INCREDULITY, '
  + 'IT WAS THE SEASON OF LIGHT, IT WAS THE SEASON OF DARKNESS';
const LETTERS = DICKENS.replace(/[^A-Z]/g, '');

test('統計の表: 28記号と26記号、どの行も確率の和がおよそ1', () => {
  assert.equal(B.WITH_SPACE.length, 28 * 28);
  assert.equal(B.LETTERS.length, 26 * 26);
  for (const [tab, size] of [[B.WITH_SPACE, 28], [B.LETTERS, 26]]) {
    for (let a = 0; a < size; a++) {
      let sum = 0;
      for (let b = 0; b < size; b++) sum += 10 ** (tab[a * size + b] / 100);
      assert.ok(sum > 0.9 && sum < 1.1, `${a}: ${sum}`);
    }
  }
  // 英語らしさ: TH は TZ より、E→空白 は Q→空白 より高い
  const L = (a, b) => B.LETTERS[(a.charCodeAt(0) - 65) * 26 + (b.charCodeAt(0) - 65)];
  assert.ok(L('T', 'H') > L('T', 'Z'));
  assert.ok(B.WITH_SPACE[4 * 28 + 26] > B.WITH_SPACE[16 * 28 + 26]);
});

test('使う表: 英字だけなら26記号、空白や句読点があれば28記号', () => {
  assert.equal(S.encode([...'ABC']).model, 'letters');
  assert.equal(S.encode([...'AB C']).model, 'withSpace');
  assert.equal(S.encode([...'AB,C']).model, 'withSpace');
});

test('ブロック長がわかっていれば、空白を含む英文の鍵を戻せる（k=4〜12）', () => {
  for (const key of [[3, 1, 4, 2], [2, 5, 1, 6, 3, 4], [8, 3, 6, 1, 7, 2, 5, 4], [5, 9, 2, 12, 7, 1, 10, 3, 8, 11, 4, 6]]) {
    const cipher = C.encrypt(DICKENS, key, { pad: true, padChar: 'X' }).output;
    const r = S.solveLength(cipher, key.length);
    assert.ok(r.ok);
    assert.equal(r.model, 'withSpace');
    assert.deepEqual(r.key, key, key.join('-'));
    assert.ok(r.plain.startsWith(DICKENS));
  }
});

test('英字だけの暗号文（Day044 から渡される形）でも戻せる', () => {
  const key = [4, 7, 1, 5, 2, 8, 3, 6];
  const cipher = C.encrypt(LETTERS, key, { pad: false }).output;
  const r = S.solveLength(cipher, 8);
  assert.equal(r.model, 'letters');
  assert.deepEqual(r.key, key);
  assert.equal(r.plain, LETTERS);
});

test('ブロック長が不明でも、1位が正しい長さと鍵になる', () => {
  for (const key of [[2, 5, 1, 6, 3, 4], [4, 1, 5, 7, 2, 6, 3]]) {
    for (const pad of [true, false]) {
      const cipher = C.encrypt(DICKENS, key, { pad, padChar: 'X' }).output;
      const r = S.solveAuto(cipher);
      assert.ok(r.ok);
      assert.equal(r.results[0].k, key.length, `${key.join('-')} pad=${pad}`);
      assert.deepEqual(r.results[0].key, key);
    }
  }
});

test('並べ替えていない英文は、どの長さでも鍵がほぼ恒等の順列になる（入力の確認）', () => {
  const r = S.solveLength(DICKENS, 5);
  assert.deepEqual(r.key, [1, 2, 3, 4, 5]);
});

test('入力の範囲と、途中経過の通知', () => {
  assert.equal(S.solveLength('ABC', 17).error.key, 'solve.k');
  assert.equal(S.solveLength('ABCDE', 4).error.key, 'solve.tooShort');
  assert.equal(S.solveLength('A'.repeat(10001), 4).error.key, 'solve.tooLong');
  const seen = [];
  S.solveAuto('THEQUICKBROWNFOX', { maxK: 5, onProgress: (k, hi) => seen.push([k, hi]) });
  assert.deepEqual(seen, [[2, 5], [3, 5], [4, 5], [5, 5]]);
});

test('作業台: 隣り合う列の得点は、正しい並びのほうが高い', () => {
  const key = [3, 1, 4, 2];
  const cipher = C.encrypt(DICKENS, key, { pad: true, padChar: 'X' }).output;
  const right = S.adjacency(cipher, 4, key.map(x => x - 1));
  const wrong = S.adjacency(cipher, 4, [0, 1, 2, 3]);
  assert.equal(right.pairs.length, 3);
  assert.ok(right.total > wrong.total);
});

test('罰則の係数と log10(k!)', () => {
  assert.equal(S.PENALTY, 2);
  assert.equal(S.log10Factorial(4).toFixed(4), Math.log10(24).toFixed(4));
});
