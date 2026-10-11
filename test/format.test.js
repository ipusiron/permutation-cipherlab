const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const list = dir => fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.js')).map(f => `${dir}/${f}`);

const codeFiles = ['script.js', 'style.css', ...list('js'), ...list('test')];
const allText = [...codeFiles, 'index.html', 'README.md', 'IMPLEMENTATION.md', 'SECURITY.md', 'CLAUDE.md'];

// 見えない文字（ゼロ幅・向きの制御・BOM など）。範囲は数で持つ
const INVISIBLE = [[0x200b, 0x200f], [0x202a, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff], [0x00ad, 0x00ad]];
const isInvisible = cp => INVISIBLE.some(([a, b]) => cp >= a && cp <= b);

test('コードの最長行は160文字以下、index.html は250文字以下（1行に詰め込まない）', () => {
  for (const f of codeFiles) {
    const longest = Math.max(...read(f).split('\n').map(l => [...l].length));
    assert.ok(longest <= 160, `${f}: ${longest}`);
  }
  const html = Math.max(...read('index.html').split('\n').map(l => [...l].length));
  assert.ok(html <= 250, `index.html: ${html}`);
});

test('主要ファイルの行数の下限（圧縮していない）', () => {
  const min = { 'script.js': 300, 'style.css': 300, 'index.html': 200, 'js/permutation-core.js': 150 };
  for (const [f, n] of Object.entries(min)) {
    assert.ok(read(f).split('\n').length >= n, f);
  }
});

test('改行は LF、見えない文字なし、タブなし（コード）', () => {
  for (const f of allText) {
    const s = read(f);
    assert.ok(!s.includes('\r'), `${f}: CR`);
    for (const ch of s) assert.ok(!isInvisible(ch.codePointAt(0)), `${f}: U+${ch.codePointAt(0).toString(16)}`);
  }
  for (const f of codeFiles) assert.ok(!read(f).includes('\t'), `${f}: tab`);
});
