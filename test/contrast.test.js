const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
const rootBlock = css.match(/:root\{([\s\S]*?)\}/)[1];
const tokens = Object.fromEntries([...rootBlock.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(m => [m[1], m[2]]));
const color = c => (c.startsWith('--') ? tokens[c.slice(2)] : c);

function luminance(hex) {
  return hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function ratio(a, b) {
  const [x, y] = [luminance(color(a)), luminance(color(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [文字, 背景, 場所]
const TEXT = [
  ['--text', '#ffffff', '本文'],
  ['--text', '--bg', 'ページの地'],
  ['--muted', '#ffffff', 'カードの補足'],
  ['--muted-strong', '--bg', 'サブタイトル'],
  ['--muted-strong', '#f0f9ff', '現在の鍵の補足・配線図の説明'],
  ['--muted-strong', '#f8fafc', '方法のカード・ブロックの切り替え'],
  ['#ffffff', '--primary-strong', '主ボタン・選択中のタブ・選んだ数字'],
  ['--primary-strong', '--primary-ghost', '淡いボタン・配線図の下の段'],
  ['--primary-strong', '#ffffff', '鍵の文字・並べ替えの数字'],
  ['--primary-strong', '#f0f9ff', '鍵の文字（現在の鍵の枠）'],
  ['--danger-strong', '#ffffff', 'エラー'],
  ['#ffffff', '--accent-dark', '成功のトースト'],
  ['#ffffff', '--danger-strong', '失敗のトースト'],
  ['--text', '#fff7ed', '注意の一覧'],
  ['#92400e', '#fff9e6', 'パターン長の見出し'],
  ...[0, 1, 2, 3, 4, 5].flatMap(k => [[`--cyc${k}`, '#ffffff', `巡回の色${k}`], [`--cyc${k}`, '#f0f9ff', `巡回の色${k}（現在の鍵の枠）`]]),
];
// 線・枠・フォーカス（文字以外は3:1）
const NON_TEXT = [
  ['--wire', '#ffffff', '配線図の線'],
  ['--accent-strong', '#ffffff', '引いたばかりの線'],
  ['--border-strong', '#ffffff', '配線図の箱の枠'],
  ['--focus', '#ffffff', 'フォーカスの枠'],
];

test('文字と背景は4.5:1以上', () => {
  for (const [fg, bg, where] of TEXT) {
    assert.ok(color(fg) && color(bg), where);
    assert.ok(ratio(fg, bg) >= 4.5, `${where}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test('線・枠・フォーカスは3:1以上', () => {
  for (const [fg, bg, where] of NON_TEXT) {
    assert.ok(ratio(fg, bg) >= 3, `${where}: ${ratio(fg, bg).toFixed(2)}`);
  }
});

test('明るい水色（--primary）を文字色や白い文字の地に使わない', () => {
  assert.ok(!/(^|[^-])color:\s*var\(--primary\)/m.test(css), 'color: var(--primary)');
  assert.ok(ratio('#ffffff', '--primary') < 4.5, '前提: --primary は白い文字に足りない');
  const whiteText = [...css.matchAll(/\{([^}]*)\}/g)].map(m => m[1]).filter(b => /color:\s*#fff\b/.test(b));
  for (const block of whiteText) assert.ok(!/background:\s*var\(--primary\)/.test(block), block);
});
