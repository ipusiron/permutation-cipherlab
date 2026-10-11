const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/permutation-core.js');

const KEY = [3, 1, 4, 2];
const enc = (text, perm) => C.encrypt(text, perm, { pad: false }).output;

test('順列の性質: 巡回表記・位数・動かない位置・対合', () => {
  assert.deepEqual(C.cycles(KEY), [[1, 3, 4, 2]]);
  assert.equal(C.order(KEY), 4);
  assert.deepEqual(C.fixedPoints(KEY), []);
  assert.equal(C.isInvolution(KEY), false);
  assert.deepEqual(C.cycles([2, 1, 3]), [[1, 2], [3]]);
  assert.equal(C.order([2, 1, 3]), 2);
  assert.deepEqual(C.fixedPoints([2, 1, 3]), [3]);
  assert.equal(C.isInvolution([2, 1, 3]), true);
  // 3レール・9文字のレールフェンスの鍵は対合
  assert.equal(C.isInvolution([1, 4, 7, 2, 5, 8, 3, 6, 9]), true);
  // 巡回の長さ2と3 → 位数6
  assert.equal(C.order([2, 1, 4, 5, 3]), 6);
});

test('くり返し: 3-1-4-2 を3回かけた鍵で ENIG は IEGN、4回で元に戻る', () => {
  assert.equal(enc('ENIG', C.power(KEY, 3)), 'IEGN');
  assert.deepEqual(C.power(KEY, 4), [1, 2, 3, 4]);
  assert.deepEqual(C.power(KEY, 0), [1, 2, 3, 4]);
});

test('ファロー・シャッフル（アウト）: 8枚は3回、52枚は8回で戻る', () => {
  assert.equal(C.order([1, 3, 5, 7, 2, 4, 6, 8]), 3);
  const out52 = [...Array.from({ length: 26 }, (_, i) => 2 * i + 1), ...Array.from({ length: 26 }, (_, i) => 2 * i + 2)];
  assert.equal(C.order(out52), 8);
});

test('置換行列: 暗号文の列ベクトル＝M×平文の列ベクトル', () => {
  const m = C.permutationMatrix(KEY);
  assert.deepEqual(m, [[0, 1, 0, 0], [0, 0, 0, 1], [1, 0, 0, 0], [0, 0, 1, 0]]);
  const plain = ['E', 'N', 'I', 'G'];
  const cipher = m.map(row => plain[row.indexOf(1)]).join('');
  assert.equal(cipher, 'NGEI');
  for (const row of m) assert.equal(row.reduce((a, b) => a + b, 0), 1);
});

test('鍵の数のビット数 log2(n!)', () => {
  assert.equal(C.log2Factorial(4).toFixed(2), '4.58');
  assert.equal(C.log2Factorial(16).toFixed(2), '44.25');
  assert.equal(C.log2Factorial(64).toFixed(2), '296.00');
});

test('変換: レールフェンス（Day034 と同じ結果）', () => {
  const cases = [
    ['ABCDEFGH', 2, 'sequential', 'ACEGBDFH'],
    ['ABCDEFGHIJ', 3, 'sequential', 'ADGJBEHCFI'],
    ['ABCDEFGHIJKL', 3, 'zigzag', 'AEIBDFHJLCGK'],
    ['WEAREDISCOVEREDFLEEATONCE', 3, 'zigzag', 'WECRLTEERDSOEEFEAOCAIVDEN'],
    ['ABCDEFGHIJ', 4, 'zigzag', 'AGBFHCEIDJ'],
  ];
  for (const [text, rails, method, expected] of cases) {
    const r = C.railFence(text.length, rails, method);
    assert.ok(r.ok, text);
    assert.equal(enc(text, r.perm), expected, `${text} ${rails} ${method}`);
  }
  assert.equal(C.railFence(8, 1).error.key, 'convert.rails');
  assert.equal(C.railFence(8, 8).error.key, 'convert.rails');
  assert.equal(C.railFence(65, 2).error.key, 'convert.length');
});

test('変換: スキュタレー（Day010 と同じ結果。空きのマスは飛ばす）', () => {
  const cases = [
    ['HELLO_WORLD', 3, 'HORE_LLWDLO'],
    ['SECRET_MESSAGE', 4, 'SEEGETSEC_SRMA'],
    ['ABCD', 3, 'ACBD'],
    ['ABCDEFGHIJ', 3, 'AEIBFJCGDH'],
  ];
  for (const [text, rows, expected] of cases) {
    const r = C.scytale(text.length, rows);
    assert.ok(r.ok);
    assert.equal(enc(text, r.perm), expected, text);
  }
});

test('変換: 縦列転置（Day043 と同じ読み方。不完全な表も）', () => {
  const cases = [
    ['ABCDEFGHIJKL', '3 1 4 2', 'BFJDHLAEICGK'],
    ['ABCDEFGHIJ', '3 1 4 2', 'BFJDHAEICG'],
    ['WEAREDISCOVEREDFLEEATONCE', 'ZEBRAS', 'EVLNACDTESEAROFODEECWIREE'],
    ['THEQUICKBROWNFOX', 'BANANA', 'HKFQRXIWTCNEBOUO'],
  ];
  for (const [text, key, expected] of cases) {
    const ranks = C.columnarRanks(key);
    assert.ok(ranks.ok, key);
    const r = C.columnar(text.length, ranks.ranks);
    assert.ok(r.ok, key);
    assert.equal(enc(text, r.perm), expected, `${text} ${key}`);
  }
  assert.deepEqual(C.columnarRanks('ZEBRAS').ranks, [6, 3, 2, 4, 1, 5]);
  assert.deepEqual(C.columnarRanks('banana').ranks, [4, 1, 5, 2, 6, 3]);
  assert.equal(C.columnarRanks('3 1 3').error.key, 'key.duplicate');
  assert.equal(C.columnarRanks('A').error.key, 'convert.keyword');
  assert.equal(C.columnar(4, [2, 1, 4, 3]).error.key, 'convert.columns');
});

test('変換: 渦巻きの経路暗号と逆順', () => {
  assert.equal(enc('ABCDEFGHIJKL', C.spiral(3, 4).perm), 'ABCDHLKJIEFG');
  assert.equal(enc('ABCDEFGHI', C.spiral(3, 3).perm), 'ABCFIHGDE');
  assert.equal(enc('ABCDEFGH', C.spiral(4, 2).perm), 'ABDFHGEC');
  assert.equal(enc('ABCD', C.reverse(4).perm), 'DCBA');
  assert.equal(C.spiral(1, 4).error.key, 'convert.grid');
  assert.equal(C.spiral(9, 8).error.key, 'convert.length');
});

test('変換: どれも1から L を1回ずつ使う順列になる', () => {
  for (let L = 2; L <= 64; L++) {
    for (let r = 2; r < Math.min(L, 10); r++) {
      assert.ok(C.validatePermutation(C.railFence(L, r, 'sequential').perm).ok);
      assert.ok(C.validatePermutation(C.railFence(L, r, 'zigzag').perm).ok);
      assert.ok(C.validatePermutation(C.scytale(L, r).perm).ok);
    }
    assert.ok(C.validatePermutation(C.reverse(L).perm).ok);
  }
});

test('合成: 二重転置（2つの鍵を続けてかける）は1つの鍵と同じ', () => {
  const text = 'WEAREDISCOVEREDFLEEATONCE';
  const a = C.columnar(text.length, C.columnarRanks('ZEBRAS').ranks).perm;
  const b = C.columnar(text.length, C.columnarRanks('STRIPE').ranks).perm;
  const twice = enc(enc(text, a), b);
  assert.equal(enc(text, C.compose(a, b)), twice);
});

test('既知平文: 同じ文字がなければ1ブロックで鍵が1つに決まる', () => {
  const r = C.knownPlaintext('ENIG', 'NGEI', 4);
  assert.equal(r.consistent, true);
  assert.equal(r.count, 1);
  assert.deepEqual(r.key, KEY);
});

test('既知平文: 同じ文字があると候補が残り、ブロックを増やすと絞れる', () => {
  const k8 = [5, 2, 8, 1, 7, 3, 6, 4];
  const cipher = C.encrypt('ATTACK AT DAWN', k8).output;
  // 1ブロック目 ATTACK A は A が3つ・T が2つ → 3!×2! = 12通り
  assert.equal(C.knownPlaintext('ATTACK A', cipher.slice(0, 8), 8).count, 12);
  const full = C.knownPlaintext('ATTACK AT DAWNXX', cipher, 8);
  assert.equal(full.blocks, 2);
  assert.equal(full.count, 1);
  assert.deepEqual(full.key, k8);
  assert.equal(C.knownPlaintext('HELL', 'ELHL', 4).count, 2);
  assert.equal(C.knownPlaintext('AAAA', 'AAAA', 4).count, 24);
});

test('既知平文: 矛盾する組と、ブロック長の候補', () => {
  assert.equal(C.knownPlaintext('ABCD', 'ABCE', 4).consistent, false);
  assert.equal(C.knownPlaintext('ABCD', 'ABCE', 4).count, 0);
  assert.equal(C.knownPlaintext('AB', 'BA', 4).error.key, 'kpa.tooShort');
  const cipher = C.encrypt('HELLO WORLD FROM PERMUTATION CIPHER', KEY).output;
  const scan = C.knownPlaintextScan('HELLO WORLD FROM PERMUTATION CIPHERX', cipher, 12);
  assert.ok(scan.some(x => x.n === 4 && x.count === 1));
  // 平文と暗号文で文字の種類が合わない長さは候補にならない
  assert.ok(scan.every(x => C.encrypt('HELLO WORLD FROM PERMUTATION CIPHERX'.slice(0, x.n * x.blocks), x.key, { pad: false }).output
    === cipher.slice(0, x.n * x.blocks)));
});

test('既知平文: n が20を超えると数えずに、鍵を1つ示す', () => {
  const n = 24;
  const perm = C.reverse(n).perm;
  const plain = 'ABCDEFGHIJKLMNOPQRSTUVWX';
  const r = C.knownPlaintext(plain, enc(plain, perm), n);
  assert.equal(r.count, null);
  assert.deepEqual(r.key, perm);
});
