const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { MESSAGES } = require('../js/messages.js');
const UI_EN = require('../js/i18n-en.js');
const I18n = require('../js/i18n.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

/** index.html の日本語の文字列（画面で入れ替える対象）。script・noscript・[data-i18n-skip] の中は除く */
function htmlFragments() {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
    .replace(/<div class="header-tools" data-i18n-skip>[\s\S]*?<\/div>/, '');
  const out = new Set();
  for (const m of body.matchAll(/(?:placeholder|aria-label|title)="([^"]+)"|>([^<>]+)</g)) {
    const text = I18n.normalize(m[1] ?? m[2]);
    if (text && I18n.hasJapanese(text)) out.add(text);
  }
  return out;
}

const placeholders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

test('JavaScript の文言: 日英のキーと差し込みがそろう', () => {
  const ja = Object.keys(MESSAGES.ja).sort();
  const en = Object.keys(MESSAGES.en).sort();
  assert.deepEqual(en, ja);
  for (const k of ja) assert.deepEqual(placeholders(MESSAGES.en[k]), placeholders(MESSAGES.ja[k]), k);
});

test('JavaScript の文言: 英語に日本語の文字がない（切り替えボタンの「日本語」だけは除く）', () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) {
    if (k === 'lang.button') continue;
    assert.ok(!I18n.hasJapanese(v), `${k}: ${v}`);
  }
  assert.equal(MESSAGES.en['lang.button'], '日本語');
  assert.equal(MESSAGES.ja['lang.button'], 'EN');
});

test('画面の英語: index.html の日本語の文字列をすべて訳し、余分な訳がない', () => {
  const frags = htmlFragments();
  assert.ok(frags.size >= 250, String(frags.size));
  const missing = [...frags].filter(f => UI_EN[f] === undefined);
  assert.deepEqual(missing, []);
  const unused = Object.keys(UI_EN).filter(k => !frags.has(k));
  assert.deepEqual(unused, []);
  for (const [k, v] of Object.entries(UI_EN)) {
    assert.ok(v.trim().length > 0, k);
    assert.ok(!I18n.hasJapanese(v), `${k}: ${v}`);
  }
});

test('初めの言語: ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語）', () => {
  assert.equal(I18n.initialLanguage('?lang=en', 'ja', 'ja-JP'), 'en');
  assert.equal(I18n.initialLanguage('?lang=ja', 'en', 'en-US'), 'ja');
  assert.equal(I18n.initialLanguage('?lang=fr', 'en', 'ja-JP'), 'en');
  assert.equal(I18n.initialLanguage('', null, 'ja-JP'), 'ja');
  assert.equal(I18n.initialLanguage('', null, 'ja'), 'ja');
  assert.equal(I18n.initialLanguage('', null, 'en-US'), 'en');
  assert.equal(I18n.initialLanguage('', null, 'fr-FR'), 'en');
  assert.equal(I18n.initialLanguage('', 'bogus', undefined), 'en');
});

test('日本語の判定と、空白のまとめ方', () => {
  assert.equal(I18n.hasJapanese('Permutation'), false);
  assert.equal(I18n.hasJapanese('鍵'), true);
  assert.equal(I18n.hasJapanese('（'), true);
  assert.equal(I18n.normalize('  a \n  b '), 'a b');
});
