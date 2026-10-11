const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const C = require('../js/permutation-core.js');

const KEY = [3, 1, 4, 2];
const rng = buf => crypto.getRandomValues(buf);
const DAKUTEN = String.fromCodePoint(0x3099);
const ZWSP = String.fromCodePoint(0x200b);

test('既知解答: 3-1-4-2 で ENIG は NGEI（送る向き）', () => {
  assert.equal(C.encrypt('ENIG', KEY).output, 'NGEI');
  assert.equal(C.decrypt('NGEI', KEY).output, 'ENIG');
});

test('既知解答: 既定の例文 ENIGMA IS FUN（埋字 X）', () => {
  const r = C.encrypt('ENIGMA IS FUN', KEY, { pad: true, padChar: 'X' });
  assert.equal(r.output, 'NGEIAIM  USFXXNX');
  assert.equal(r.blocks.length, 4);
  assert.equal(r.padCount, 3);
  assert.equal(C.decrypt(r.output, KEY).output, 'ENIGMA IS FUN');
});

test('3-1-4-2 は4回かけると元に戻る（ENIG→NGEI→GINE→IEGN→ENIG）', () => {
  const seq = ['ENIG'];
  for (let k = 0; k < 4; k++) seq.push(C.encrypt(seq[seq.length - 1], KEY).output);
  assert.deepEqual(seq, ['ENIG', 'NGEI', 'GINE', 'IEGN', 'ENIG']);
});

test('向き: 3-1-4-2（送る）と 2-4-1-3（取り出す）は同じ並べ替え', () => {
  const a = C.parseKey('3-1-4-2', 'to');
  const b = C.parseKey('2-4-1-3', 'from');
  assert.ok(a.ok && b.ok);
  assert.deepEqual(a.perm, b.perm);
  assert.equal(C.formatKey(a.perm, 'to'), '3-1-4-2');
  assert.equal(C.formatKey(a.perm, 'from'), '2-4-1-3');
  // 同じ数字でも向きが違えば別の並べ替え
  assert.equal(C.encrypt('ABCD', C.parseKey('3-1-4-2', 'to').perm).output, 'BDAC');
  assert.equal(C.encrypt('ABCD', C.parseKey('3-1-4-2', 'from').perm).output, 'CADB');
});

test('教科書の例: Stinson 初版 Example 1.6 は取り出す向き（π = 3 5 1 6 4 2）', () => {
  const perm = C.parseKey('3 5 1 6 4 2', 'from').perm;
  const r = C.encrypt('shesellsseashellsbytheseashore', perm);
  assert.equal(r.output.toUpperCase(), 'EESLSHSALSESLSHBLEHSYEETHRAEOS');
  // 同じ数字を送る向きで読むと、印刷された暗号文にはならない
  const wrong = C.encrypt('shesellsseashellsbytheseashore', C.parseKey('3 5 1 6 4 2', 'to').perm);
  assert.equal(wrong.output.toUpperCase(), 'ELSEHSSSLASELBHSELHEYSTEHEARSO');
});

test('史料の例: Gaines 1939 は同じ鍵 6 2 1 4 3 5 の2通りの使い方を示す', () => {
  assert.equal(C.encrypt('ABCDEF', C.parseKey('6 2 1 4 3 5', 'from').perm).output, 'FBADCE');
  assert.equal(C.encrypt('ABCDEF', C.parseKey('6 2 1 4 3 5', 'to').perm).output, 'CBEDFA');
});

test('ほかの転置式との等価: レールフェンス（順次配置）と縦列転置（Day043 の順位）', () => {
  // Day034 RailFence CipherLab 方式1（sequential）
  assert.equal(C.encrypt('ABCDEFGH', [1, 5, 2, 6, 3, 7, 4, 8]).output, 'ACEGBDFH');
  assert.equal(C.encrypt('ABCDEFGHI', [1, 4, 7, 2, 5, 8, 3, 6, 9]).output, 'ADGBEHCFI');
  assert.equal(C.encrypt('ABCDEFGHIJKL', [1, 4, 7, 10, 2, 5, 8, 11, 3, 6, 9, 12]).output, 'AEIBFJCGKDHL');
  // Day043 Columnar CipherLab の数列 3 1 4 2（列の順位）で ABCDEFGHIJKL は BFJDHLAEICGK
  assert.equal(C.encrypt('ABCDEFGHIJKL', [7, 1, 10, 4, 8, 2, 11, 5, 9, 3, 12, 6]).output, 'BFJDHLAEICGK');
});

test('鍵の読み取り: 区切り・全角・前後の区切り', () => {
  for (const s of ['3-1-4-2', '3 1 4 2', '3,1,4,2', '３－１－４－２', '3、1、4、2', '3ー1ー4ー2', ' 3-1-4-2- ', '3−1−4−2', '03-1-4-2']) {
    const r = C.parseKey(s);
    assert.ok(r.ok, s);
    assert.deepEqual(r.perm, KEY, s);
  }
});

test('鍵の読み取り: 不正な入力は理由のキーを返す', () => {
  const cases = [
    ['', 'key.empty'],
    ['  ', 'key.empty'],
    ['3-1-a-2', 'key.format'],
    ['3.5-1', 'key.format'],
    ['1', 'key.length'],
    ['1-5-2', 'key.range'],
    ['0-1', 'key.range'],
    ['1-1-2', 'key.duplicate'],
    ['2-2-1', 'key.duplicate'],
    ['9-9', 'key.range'],
    [Array.from({ length: 65 }, (_, i) => i + 1).join('-'), 'key.length'],
  ];
  for (const [input, key] of cases) {
    const r = C.parseKey(input);
    assert.equal(r.ok, false, input);
    assert.equal(r.error.key, key, input);
  }
  const dup = C.parseKey('1-2-2-4');
  assert.deepEqual(dup.error.params, { values: '2', missing: '3' });
});

test('逆の順列と合成', () => {
  assert.deepEqual(C.inversePermutation(KEY), [2, 4, 1, 3]);
  assert.deepEqual(C.compose(KEY, C.inversePermutation(KEY)), [1, 2, 3, 4]);
  // 2つの鍵を続けてかけた結果は、合成した1つの鍵と同じ
  const a = [2, 3, 1, 5, 4], b = [5, 1, 4, 2, 3];
  const twice = C.encrypt(C.encrypt('HELLO', a).output, b).output;
  assert.equal(C.encrypt('HELLO', C.compose(a, b)).output, twice);
});

test('往復: n=2〜64、長さ0〜3n+1、埋字あり・なし', () => {
  for (let n = 2; n <= 64; n++) {
    const perm = C.randomPermutation(n, rng);
    assert.ok(C.validatePermutation(perm).ok);
    for (const len of [0, 1, n - 1, n, n + 1, 3 * n + 1]) {
      const text = Array.from({ length: len }, (_, i) => String.fromCharCode(97 + (i * 7) % 26)).join('');
      const noPad = C.encrypt(text, perm, { pad: false });
      assert.equal(C.decrypt(noPad.output, perm, { trimPad: false }).output, text);
      const padded = C.encrypt(text, perm, { pad: true, padChar: '#' });
      assert.equal(padded.output.length % n, 0);
      assert.equal(C.decrypt(padded.output, perm, { trimPad: true, padChar: '#' }).output, text);
    }
  }
});

test('文字の単位: 絵文字・日本語・結合文字を途中で切らない', () => {
  const perm = [2, 1];
  const emoji = C.encrypt('A😀BC', perm, { pad: false });
  assert.equal(emoji.output, '😀ACB');
  assert.equal(C.decrypt(emoji.output, perm, { trimPad: false }).output, 'A😀BC');
  assert.equal(C.encrypt('あいうえ', perm).output, 'いあえう');
  // NFD の「か＋濁点」は NFC の「が」1字として扱う
  assert.equal(C.toUnits('か' + DAKUTEN + 'き').length, 2);
  assert.equal(C.encrypt('か' + DAKUTEN + 'き', perm).output, 'きが');
});

test('埋字: 平文の末尾が埋字と同じなら知らせる。除くのは最後のブロックの n−1 字まで', () => {
  const r = C.encrypt('TAX', KEY, { pad: true, padChar: 'X' });
  assert.equal(r.output, 'AXTX');
  assert.ok(r.notes.some(x => x.key === 'enc.endsWithPad'));
  const d = C.decrypt('AXTX', KEY, { trimPad: true, padChar: 'X' });
  assert.equal(d.output, 'TA');
  assert.equal(d.trimmed, 2);
  assert.ok(d.notes.some(x => x.key === 'dec.trimmed' && x.params.count === 2));
  // 埋字を別の文字にすれば戻る
  const safe = C.encrypt('TAX', KEY, { pad: true, padChar: 'Q' });
  assert.equal(C.decrypt(safe.output, KEY, { trimPad: true, padChar: 'Q' }).output, 'TAX');
  // 除くのは最大 n−1 字（XXXX の1ブロックは3字まで）
  assert.equal(C.decrypt('XXXX', KEY, { trimPad: true, padChar: 'X' }).output, 'X');
});

test('埋字なしで短い最後のブロックは並べ替えずに残し、知らせる', () => {
  const r = C.encrypt('ENIGMA', KEY, { pad: false });
  assert.equal(r.output, 'NGEIMA');
  assert.ok(r.notes.some(x => x.key === 'enc.shortBlockKept' && x.params.count === 2));
  const d = C.decrypt('NGEIMAX', KEY, { trimPad: true, padChar: 'X' });
  // 長さが n の倍数でない暗号文は埋字を使っていないので、末尾を除かない
  assert.equal(d.output, 'ENIGMAX');
  assert.equal(d.trimmed, 0);
  assert.ok(d.notes.some(x => x.key === 'dec.shortBlockKept'));
});

test('埋字の検証: 1字の見える文字だけ', () => {
  assert.deepEqual(C.validatePadChar('X'), { ok: true, padChar: 'X' });
  assert.deepEqual(C.validatePadChar(''), { ok: true, padChar: '' });
  assert.equal(C.validatePadChar('😀').padChar, '😀');
  assert.equal(C.validatePadChar('XY').error.key, 'pad.length');
  assert.equal(C.validatePadChar(' ').error.key, 'pad.invisible');
  assert.equal(C.validatePadChar(ZWSP).error.key, 'pad.invisible');
});

test('途中経過: 最初の k 本の線だけを引いた状態', () => {
  const units = ['E', 'N', 'I', 'G'];
  assert.deepEqual(C.partialBlock(units, KEY, 0), [null, null, null, null]);
  assert.deepEqual(C.partialBlock(units, KEY, 1), [null, null, 'E', null]);
  assert.deepEqual(C.partialBlock(units, KEY, 2), ['N', null, 'E', null]);
  assert.deepEqual(C.partialBlock(units, KEY, 4), ['N', 'G', 'E', 'I']);
  assert.deepEqual(C.partialBlock(units, KEY, 99), ['N', 'G', 'E', 'I']);
});

test('乱数: 剰余の偏りを棄却する', () => {
  // 上限に近い値（棄却される値）を先に返す偽の乱数
  const seq = [0xffffffff, 5];
  let k = 0;
  const fake = buf => { buf[0] = seq[k++]; };
  assert.equal(C.randomBelow(3, fake), 5 % 3);
  assert.equal(k, 2);
  assert.throws(() => C.randomPermutation(4, undefined));
});

test('乱数: n=3 の6通りがおおむね均等に出る', () => {
  const counts = new Map();
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const s = C.randomPermutation(3, rng).join('');
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  assert.equal(counts.size, 6);
  for (const c of counts.values()) assert.ok(c > 800 && c < 1200, String(c));
});

test('保存した鍵の検証: 壊れた項目は捨てる', () => {
  const r = C.sanitizeSaved([
    { name: 'ok', pattern: '3-1-4-2' },
    { name: 'bad', pattern: '9-9' },
    { name: 'dup', pattern: '1-1' },
    { name: '', pattern: '2-1' },
    { name: 'ok', pattern: '2-1' },
    null,
    { name: 'wide', pattern: '２，１' },
  ]);
  assert.deepEqual(r.items, [{ name: 'ok', pattern: '3-1-4-2' }, { name: 'wide', pattern: '2-1' }]);
  assert.equal(r.dropped, 5);
  assert.deepEqual(C.sanitizeSaved('x'), { items: [], dropped: 0 });
});
