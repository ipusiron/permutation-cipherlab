const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { MESSAGES, format } = require('../js/messages.js');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const core = ['js/permutation-core.js', 'js/solver.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join(String.fromCharCode(10));

// 日本語（ひらがな・カタカナ・漢字・全角の記号）の判定はコードポイントの範囲で行う
const JA_RANGES = [[0x3000, 0x30ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xff00, 0xffef]];
const hasJapanese = s => [...s].some(ch => JA_RANGES.some(([a, b]) => ch.codePointAt(0) >= a && ch.codePointAt(0) <= b));

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/^\s*\/\/.*$/, '').replace(/\s\/\/\s.*$/, '')).join('\n');
}

test('script.js が使う文言のキーはすべて辞書にある', () => {
  const keys = new Set([...script.matchAll(/\bt\('([\w.]+)'/g)].map(m => m[1]));
  for (const m of script.matchAll(/'(key\.direction(?:To|From)|editor\.(?:open|close)|step\.(?:stop|play))'/g)) keys.add(m[1]);
  assert.ok(keys.size >= 30, String(keys.size));
  for (const k of keys) assert.ok(MESSAGES.ja[k], k);
});

test('計算部が返すエラーと注意のキーはすべて辞書にある', () => {
  const keys = [...new Set([...core.matchAll(/key: '([\w.]+)'/g)].map(m => m[1]))];
  assert.ok(keys.length >= 10, String(keys.length));
  for (const k of keys) assert.ok(MESSAGES.ja[k], k);
});

test('script.js に日本語の文字列を書かない（文言は messages.js へ）', () => {
  const code = stripComments(script);
  const literals = [...code.matchAll(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|"(?:[^"\\\n]|\\.)*"/g)].map(m => m[0]);
  const ja = literals.filter(hasJapanese);
  assert.deepEqual(ja, []);
});

test('辞書: 空の値がなく、差し込みが埋まる', () => {
  for (const [k, v] of Object.entries(MESSAGES.ja)) assert.ok(typeof v === 'string' && v.length > 0, k);
  assert.equal(format('ja', 'key.range', { values: '9', n: 4 }), '範囲外の数があります：9（1〜4を1回ずつ使います）');
  assert.equal(format('ja', 'step.status', { n: 4, k: 2 }), '4本中2本');
  // 知らないキーはそのまま返す（画面が止まらない）
  assert.equal(format('ja', 'no.such.key'), 'no.such.key');
});
