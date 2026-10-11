// 鍵なし解読（js/solver.js）の当たり具合を測る。README の表はこのスクリプトの出力
//
// 評価に使う本文: Project Gutenberg #98 "A Tale of Two Cities"（Charles Dickens。米国でパブリックドメイン）
//   https://www.gutenberg.org/cache/epub/98/pg98.txt を tools/corpus/pg98.txt に保存して使う（Git の対象外）
//   統計の学習（#1342 Pride and Prejudice）には使っていない作品
// 使い方: node tools/eval-solver.js [試行数（既定 30）]
// 乱数は種を固定した mulberry32。切り出す位置と鍵が毎回同じになる
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const C = require('../js/permutation-core.js');
const S = require('../js/solver.js');

const CORPUS = path.join(__dirname, 'corpus', 'pg98.txt');
const CORPUS_SHA256 = 'd54c2b80d40a40b982cd88852c6180bb944d95acdb028af3d0e01a1750681784';
const TRIALS = Number(process.argv[2] || 30);

const raw = fs.readFileSync(CORPUS);
if (crypto.createHash('sha256').update(raw).digest('hex') !== CORPUS_SHA256) throw new Error('corpus SHA-256 does not match');
const text = raw.toString('utf8');
const start = text.indexOf('\n', text.indexOf('*** START OF THE PROJECT GUTENBERG EBOOK')) + 1;
const end = text.indexOf('*** END OF THE PROJECT GUTENBERG EBOOK');
// 大文字にし、空白類を1つの空白にまとめる（句読点は残す）
const body = text.slice(start, end).toUpperCase().replace(/\s+/g, ' ').trim();
const letters = body.replace(/[^A-Z]/g, '');

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomKey(n, rand) {
  const a = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trial(source, L, n, rand, auto) {
  const s = Math.floor(rand() * (source.length - L - 1));
  const plain = source.slice(s, s + L);
  const key = randomKey(n, rand);
  const cipher = C.encrypt(plain, key, { pad: true, padChar: 'X' }).output;
  const truth = C.encrypt(plain, key, { pad: true, padChar: 'X' }).blocks.map(b => b.plain.join('')).join('');
  const r = auto ? S.solveAuto(cipher).results[0] : S.solveLength(cipher, n);
  return r.plain === truth;
}

const LENGTHS = [60, 100, 200, 400];
const SIZES = [4, 6, 8, 10, 12, 14, 16];
const out = {};
for (const [name, source] of [['withSpace', body], ['letters', letters]]) {
  const rand = mulberry32(name === 'withSpace' ? 95 : 96);
  const rows = [];
  for (const L of LENGTHS) {
    const row = [];
    for (const n of SIZES) {
      if (Math.floor(L / n) < 2) { row.push(null); continue; }
      let ok = 0;
      for (let t = 0; t < TRIALS; t++) if (trial(source, L, n, rand, false)) ok++;
      row.push(Math.round((100 * ok) / TRIALS));
    }
    rows.push(row);
  }
  const autoRand = mulberry32(name === 'withSpace' ? 195 : 196);
  const auto = [];
  for (const L of [100, 200]) {
    let ok = 0;
    for (let t = 0; t < TRIALS; t++) {
      const n = 3 + Math.floor(autoRand() * 10);
      if (trial(source, L, n, autoRand, true)) ok++;
    }
    auto.push(Math.round((100 * ok) / TRIALS));
  }
  out[name] = { lengths: LENGTHS, sizes: SIZES, known: rows, auto: { lengths: [100, 200], percent: auto } };
}
console.log(JSON.stringify({ trials: TRIALS, ...out }, null, 1));
