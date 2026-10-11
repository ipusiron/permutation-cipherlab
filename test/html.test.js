const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));

test('CSP は meta で self に限り、frame-ancestors と unsafe-inline を書かない', () => {
  const m = html.match(/<meta http-equiv="Content-Security-Policy"\s+content="([^"]+)"/);
  assert.ok(m, 'CSP meta');
  const csp = m[1];
  for (const part of ["default-src 'self'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) {
    assert.ok(csp.includes(part), part);
  }
  assert.ok(!csp.includes('frame-ancestors'));
  assert.ok(!csp.includes('unsafe-inline'));
  assert.ok(!csp.includes('unsafe-eval'));
  assert.ok(!/X-Frame-Options|X-Content-Type-Options/i.test(html), 'meta では効かないヘッダー');
});

test('referrer は no-referrer、言語・viewport・noscript', () => {
  assert.match(html, /<meta name="referrer" content="no-referrer" \/>/);
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1.0"\/>/);
  assert.match(html, /<noscript>/);
});

test('インラインのスクリプト・イベント属性・style 属性がない', () => {
  assert.ok(!/\son[a-z]+\s*=/i.test(html), 'on* 属性');
  assert.ok(!/\sstyle\s*=/i.test(html), 'style 属性');
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  for (const [, attrs, body] of scripts) {
    assert.match(attrs, /src="/, 'src のない script');
    assert.equal(body.trim(), '');
    assert.ok(!/type="module"/.test(attrs), 'file:// で動かすため module にしない');
  }
  assert.deepEqual(scripts.map(m => m[1].match(/src="([^"]+)"/)[1]),
    ['js/permutation-core.js', 'js/messages.js', 'js/wiring.js', 'script.js']);
});

test('target="_blank" のリンクは rel="noopener noreferrer"', () => {
  const links = [...html.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)].map(m => m[0]);
  assert.ok(links.length >= 4);
  for (const a of links) assert.match(a, /rel="noopener noreferrer"/, a);
});

test('タブとパネルの ARIA が対応している', () => {
  const tabs = [...html.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map(m => m[0]);
  assert.equal(tabs.length, 4);
  for (const name of ['keygen', 'encrypt', 'decrypt', 'study']) {
    const tab = tabs.find(t => t.includes(`id="tab-${name}"`));
    assert.ok(tab, name);
    assert.match(tab, new RegExp(`aria-controls="panel-${name}"`));
    assert.match(html, new RegExp(`id="panel-${name}" role="tabpanel" aria-labelledby="tab-${name}"`));
  }
  const refs = [...html.matchAll(/aria-(?:labelledby|controls)="([^"]+)"/g)].map(m => m[1]);
  for (const id of refs) assert.ok(ids.has(id), id);
});

test('label の for と、script.js が探す id が index.html にある', () => {
  for (const [, id] of html.matchAll(/<label[^>]*for="([^"]+)"/g)) assert.ok(ids.has(id), id);
  const used = new Set([...script.matchAll(/\$\('#([\w-]+)/g)].map(m => m[1]));
  // `#${prefix}-…` の形で組み立てる id
  for (const prefix of ['encrypt', 'decrypt']) {
    for (const suffix of ['pad-char', 'pad-error', 'block-indicator', 'block-prev', 'block-next']) used.add(`${prefix}-${suffix}`);
  }
  assert.ok(used.size >= 30);
  for (const id of used) assert.ok(ids.has(id), id);
});

test('ボタンは type="button"', () => {
  const buttons = [...html.matchAll(/<button\s[^>]*>/g)].map(m => m[0]);
  assert.ok(buttons.length >= 20);
  for (const b of buttons) assert.match(b, /type="button"/, b);
});
