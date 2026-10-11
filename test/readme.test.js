const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/permutation-core.js');
const I18n = require('../js/i18n.js');

const root = path.join(__dirname, '..');
const READMES = {
  ja: fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
  en: fs.readFileSync(path.join(root, 'README.en.md'), 'utf8'),
};
const readme = READMES.ja;
const EVAL = JSON.parse(fs.readFileSync(path.join(root, 'tools/eval-solver-result.json'), 'utf8'));

const DIR = { '送る': 'to', '送る向き': 'to', '取り出す': 'from', '取り出す向き': 'from', Scatter: 'to', Gather: 'from' };
const NONE = new Set(['なし', 'None']);
const code = s => {
  const m = s.match(/`([^`]*)`/);
  return m ? m[1] : null;
};

/** 見出しの行（header の先頭のセル）から始まる表の行を、セルの配列で返す */
function table(text, firstCell, nth = 0) {
  const lines = text.split('\n');
  const starts = lines.map((l, i) => (l.startsWith(`| ${firstCell} |`) ? i : -1)).filter(i => i >= 0);
  assert.ok(starts.length > nth, `表: ${firstCell}`);
  const rows = [];
  for (let i = starts[nth] + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
  }
  return rows;
}

const both = (fn) => {
  for (const lang of ['ja', 'en']) fn(lang, READMES[lang]);
};

test('YAML メタデータの構造と固定の値（README.md だけに置く）', () => {
  assert.ok(readme.startsWith('<!--\n---\nid: day095\nslug: permutation-cipherlab\n'));
  const yaml = readme.slice(0, readme.indexOf('-->'));
  assert.match(yaml, /\nrepo_url: "https:\/\/github\.com\/ipusiron\/permutation-cipherlab"\n/);
  assert.match(yaml, /\ndemo_url: "https:\/\/ipusiron\.github\.io\/permutation-cipherlab\/"\n/);
  assert.match(yaml, /\nhub: true\n---\n$/);
  for (const key of ['category_ja', 'category_en', 'tags']) {
    assert.ok(yaml.match(new RegExp(`\\n${key}:\\n((?:  - .+\\n)+)`)), key);
  }
  const order = ['id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en',
    'category_ja', 'category_en', 'difficulty', 'tags', 'repo_url', 'demo_url', 'hub'];
  assert.deepEqual([...yaml.matchAll(/^([a-z_]+):/gm)].map(m => m[1]), order);
  assert.ok(!READMES.en.includes('<!--'));
});

test('言語の切り替えのリンクと、シリーズ標準の定型', () => {
  assert.match(readme, /-->\n\n\[English\]\(README\.en\.md\) · 日本語\n\n# Permutation CipherLab - 転置式暗号ツール\n/);
  assert.ok(READMES.en.startsWith('English · [日本語](README.md)\n\n# Permutation CipherLab - Transposition Cipher Tool\n'));
  assert.match(readme, /\n\*\*Day095 - 生成AIで作るセキュリティツール100\*\*\n/);
  assert.match(READMES.en, /\n\*\*Day095 - 100 Security Tools with Generative AI\*\*\n/);
  both((lang, text) => assert.match(text, /\(https:\/\/akademeia\.info\/\?page_id=42163\)/, lang));
});

test('見出し: 日本語版の順序と、英語版との対応（階層と絵文字が同じ）', () => {
  const heads = text => text.split('\n').filter(l => /^#{2,4} /.test(l));
  const h2 = readme.split('\n').filter(l => l.startsWith('## ')).map(l => l.slice(3));
  assert.deepEqual(h2, ['🌐 デモページ', '📸 スクリーンショット', '👥 対象ユーザー', '⚙️ 主な機能', '🧠 転置式暗号とは',
    '🔀 他の転置式暗号との比較表', '💬 教育的意義', '🎯 ユースケース', '🔗 関連ツール', '🔒 セキュリティについて',
    '🧪 テスト', '📁 ディレクトリー構造', '💻 動作環境', '📄 ライセンス', '🛠️ このツールについて']);
  const ja = heads(READMES.ja);
  const en = heads(READMES.en);
  assert.equal(en.length, ja.length);
  ja.forEach((h, i) => {
    const level = s => s.match(/^#+/)[0];
    const emoji = s => {
      const first = [...s.replace(/^#+ /, '')][0];
      return /\p{Extended_Pictographic}/u.test(first) ? first : '';
    };
    assert.equal(level(en[i]), level(h), `${h} / ${en[i]}`);
    assert.equal(emoji(en[i]), emoji(h), `${h} / ${en[i]}`);
  });
});

test('鍵の向きの表: 同じ数字でも送る向きと取り出す向きで暗号文が違う', () => {
  both((lang, text) => {
    const rows = table(text, lang === 'ja' ? '書き方' : 'Notation');
    assert.equal(rows.length, 2);
    for (const [dir, key, cipher] of rows) {
      assert.equal(C.encrypt('ABCD', C.parseKey(code(key), DIR[dir]).perm).output, code(cipher), `${lang} ${dir}`);
    }
  });
});

test('既知解答の表を計算部で再計算する', () => {
  both((lang, text) => {
    const rows = table(text, lang === 'ja' ? '鍵' : 'Key', 0);
    assert.equal(rows.length, 7, lang);
    for (const [key, dir, pad, plain, cipher] of rows) {
      const perm = C.parseKey(code(key), DIR[dir]).perm;
      const opts = NONE.has(pad) ? { pad: false } : { pad: true, padChar: pad };
      const r = C.encrypt(code(plain), perm, opts);
      assert.equal(r.output, code(cipher), `${lang} ${key} ${plain}`);
      assert.equal(C.decrypt(r.output, perm, { trimPad: !NONE.has(pad), padChar: pad }).output, code(plain));
    }
    assert.ok(text.includes('`EESLSHSALSESLSHBLEHSYEETHRAEOS`'));
  });
});

test('レールフェンス（順次配置）の表: 鍵・暗号文・式・2つの向き', () => {
  both((lang, text) => {
    const rows = table(text, lang === 'ja' ? 'レール数' : 'Rails');
    assert.equal(rows.length, 3);
    for (const [rails, plain, cipher, toKey, fromKey] of rows) {
      const r = Number(rails);
      const t = code(plain);
      const c = t.length / r;
      const formula = Array.from({ length: t.length }, (_, i) => (i % r) * c + Math.floor(i / r) + 1);
      const perm = C.parseKey(code(toKey), 'to').perm;
      assert.deepEqual(perm, formula, rails);
      assert.equal(C.encrypt(t, perm).output, code(cipher), rails);
      assert.equal(C.formatKey(perm, 'from'), code(fromKey), rails);
      assert.deepEqual(C.railFence(t.length, r, 'sequential').perm, perm);
    }
  });
});

test('縦列転置の表: Day043 の順位の読み方で、行き先は（順位−1）×行数＋行', () => {
  both((lang, text) => {
    const rows = table(text, lang === 'ja' ? '数列（Day043）' : 'Numbers (Day043)');
    assert.equal(rows.length, 1);
    const [ranks, plain, cipher, key] = rows[0];
    const rank = code(ranks).split(' ').map(Number);
    const t = code(plain);
    const cols = rank.length;
    const rowsN = t.length / cols;
    const expected = Array.from({ length: t.length }, (_, i) => (rank[i % cols] - 1) * rowsN + Math.floor(i / cols) + 1);
    const perm = C.parseKey(code(key), 'to').perm;
    assert.deepEqual(perm, expected);
    assert.equal(C.encrypt(t, perm).output, code(cipher));
    assert.deepEqual(C.columnar(t.length, rank).perm, perm);
  });
});

test('既知平文の表: 残る鍵の数を計算し直す', () => {
  both((lang, text) => {
    const rows = table(text, lang === 'ja' ? '鍵（送る向き）' : 'Key (scatter)');
    assert.equal(rows.length, 5, lang);
    for (const [key, plain, blocks, count] of rows) {
      const perm = C.parseKey(code(key), 'to').perm;
      const p = code(plain);
      const cipher = C.encrypt(p, perm, { pad: false }).output;
      const r = C.knownPlaintext(p, cipher, perm.length);
      assert.equal(r.blocks, Number(blocks), `${lang} ${plain}`);
      assert.equal(r.count, Number(count), `${lang} ${plain}`);
    }
  });
  // 既知平文の本文の例: FLAG で始まると知っていれば1ブロックで鍵が決まる
  const flag = C.knownPlaintext('FLAG', C.encrypt('FLAG{TRY_PERM}', [3, 1, 4, 2]).output.slice(0, 4), 4);
  assert.equal(flag.count, 1);
  assert.deepEqual(flag.key, [3, 1, 4, 2]);
});

test('鍵なし解読の当たり具合の表は、tools/eval-solver.js の出力と同じ', () => {
  both((lang, text) => {
    for (const [nth, model] of [[0, 'withSpace'], [1, 'letters']]) {
      const rows = table(text, lang === 'ja' ? '文の長さ' : 'Length', nth);
      const m = EVAL[model];
      assert.equal(rows.length, m.lengths.length);
      rows.forEach((cells, i) => {
        assert.equal(parseInt(cells[0], 10), m.lengths[i]);
        assert.deepEqual(cells.slice(1).map(c => (c === '—' ? null : parseInt(c, 10))), m.known[i], `${lang} ${model} ${cells[0]}`);
      });
      const sentence = text.split('\n').find(l => l.includes(lang === 'ja' ? '3〜12からランダム' : 'random from 3 to 12'));
      for (const v of m.auto.percent) assert.ok(sentence.includes(`${v}%`), `${lang} ${model} auto ${v}`);
    }
  });
  assert.equal(EVAL.trials, 30);
});

test('本文の例: 埋字・TAX・FLAG・ファロー・シャッフル・鍵の数・変換', () => {
  const k = [3, 1, 4, 2];
  both((lang, text) => {
    const has = s => assert.ok(text.includes(s), `${lang}: ${s}`);
    has('`NGEIAXMX`'); has('`NGEIMA`'); has('`AXTX`'); has('`TA`'); has('`AQTX`'); has('`LGFATY{RPR_E}XMX`');
    has('`BDAC`'); has('`CADB`'); has('`AEBFCGDH`→`ACEGBDFH`→`ABCDEFGH`'); has('`(1 3 4 2)`');
    has('`ENIG`→`NGEI`→`GINE`→`IEGN`→`ENIG`'); has('`16! = 20,922,789,888,000`'); has('44.3');
    has('`WEAREDISCOVEREDFLEEATONCE`'); has('`EVLNACDTESEAROFODEECWIREE`');
  });
  assert.equal(C.encrypt('ENIGMA', k).output, 'NGEIAXMX');
  assert.equal(C.encrypt('ENIGMA', k, { pad: false }).output, 'NGEIMA');
  assert.equal(C.encrypt('TAX', k).output, 'AXTX');
  assert.equal(C.decrypt('AXTX', k).output, 'TA');
  assert.equal(C.encrypt('TAX', k, { padChar: 'Q' }).output, 'AQTX');
  assert.equal(C.encrypt('FLAG{TRY_PERM}', k).output, 'LGFATY{RPR_E}XMX');
  assert.deepEqual(C.cycles(k), [[1, 3, 4, 2]]);
  assert.equal(C.order(k), 4);
  const out8 = C.parseKey('1-3-5-7-2-4-6-8', 'to').perm;
  assert.equal(C.order(out8), 3);
  const out52 = [...Array.from({ length: 26 }, (_, i) => 2 * i + 1), ...Array.from({ length: 26 }, (_, i) => 2 * i + 2)];
  assert.equal(C.order(out52), 8);
  assert.ok(readme.includes('52枚（鍵の長さ52）では8回で戻る'));
  assert.equal(C.encrypt('ABCDEFGH', C.parseKey('1-3-5-7-2-4-6-8', 'from').perm).output, 'ACEGBDFH');
  let f = 1n;
  for (let i = 2n; i <= 16n; i++) f *= i;
  assert.equal(Number(f).toLocaleString('en-US'), '20,922,789,888,000');
  assert.equal(C.log2Factorial(16).toFixed(1), '44.3');
  const zebras = C.columnar(25, C.columnarRanks('ZEBRAS').ranks).perm;
  assert.equal(C.encrypt('WEAREDISCOVEREDFLEEATONCE', zebras).output, 'EVLNACDTESEAROFODEECWIREE');
  assert.ok(readme.includes('逆の順列`2-4-1-3`'));
});

test('画像: README が参照する画像は実在し、assets の画像はすべて参照されている', () => {
  const refs = text => [...text.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map(m => m[1]);
  const ja = refs(READMES.ja);
  const en = refs(READMES.en);
  assert.equal(ja.length, 5);
  assert.equal(en.length, 5);
  assert.deepEqual(en, ja.map(r => r.replace('assets/', 'assets/en/')));
  for (const r of [...ja, ...en]) assert.ok(fs.existsSync(path.join(root, r)), r);
  const pngs = dir => fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('.png')).map(f => `${dir}/${f}`);
  assert.deepEqual([...pngs('assets'), ...pngs('assets/en')].sort(), [...ja, ...en].sort());
});

test('ディレクトリー構造: 全ファイルが載り、全行に説明がある（日英とも）', () => {
  const actual = [];
  const walk = rel => {
    for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      if (['.git', '.claude', 'node_modules'].includes(e.name)) continue;
      if (rel === 'tools' && e.name === 'corpus') continue; // Git の対象外（統計を作るための本文）
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(p); else actual.push(p);
    }
  };
  walk('');
  both((lang, text) => {
    const lines = text.split('\n');
    const start = lines.findIndex(l => l.startsWith('## 📁'));
    const open = lines.indexOf('```', start);
    const close = lines.indexOf('```', open + 1);
    assert.equal(lines[open + 1], 'permutation-cipherlab/');
    const listed = [];
    const stack = [];
    const hashCols = new Set();
    for (const line of lines.slice(open + 2, close)) {
      const m = line.match(/^((?:│   |    )*)(?:├── |└── )(\S+)\s+# (.+)$/);
      assert.ok(m, `${lang} 説明のない行: ${line}`);
      const depth = m[1].length / 4;
      stack.length = depth;
      stack.push(m[2].replace(/\/$/, ''));
      if (!m[2].endsWith('/')) listed.push(stack.join('/'));
      hashCols.add([...line].indexOf('#'));
    }
    assert.equal(hashCols.size, 1, `${lang}: # の桁をそろえる`);
    assert.deepEqual(listed.sort(), actual.slice().sort(), lang);
  });
});

test('表記（日本語版）: 禁止する書き方と、日本語と英数字の間の空白', () => {
  const text = readme.replace(/```[\s\S]*?```/g, '');
  const banned = ['既に', '全て', '分かる', '無い', '復号化', 'インターフェース', '例えば', '従って', 'リポジトリー'];
  for (const w of banned) assert.ok(!text.includes(w), w);
  for (const re of [/サーバ(?!ー)/, /ユーザ(?!ー)/, /ブラウザ(?!ー)/, /エディタ(?!ー)/, /パラメータ(?!ー)/, /フォルダ(?!ー)/,
    /マネージャ(?!ー)/]) {
    assert.ok(!re.test(text), String(re));
  }
  const prose = text.split('\n').filter(l => !l.startsWith('<!--') && !/^[a-z_]+:/.test(l))
    .map(l => l.replace(/`[^`]*`/g, 'C').replace(/\]\([^)]*\)/g, ']'));
  const ja = ch => {
    const cp = ch.codePointAt(0);
    return (cp >= 0x3040 && cp <= 0x30ff) || (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0xff01 && cp <= 0xff5e) || (cp >= 0x3001 && cp <= 0x3002);
  };
  const latin = ch => /[A-Za-z0-9]/.test(ch);
  for (const l of prose) {
    const chars = [...l];
    for (let i = 1; i + 1 < chars.length; i++) {
      if (chars[i] !== ' ') continue;
      assert.ok(!((ja(chars[i - 1]) && latin(chars[i + 1])) || (latin(chars[i - 1]) && ja(chars[i + 1]))), l);
    }
  }
});

test('表記（英語版）: 1行目のリンク以外に日本語の文字がない', () => {
  const lines = READMES.en.split('\n');
  lines.slice(1).forEach((l, i) => assert.ok(!I18n.hasJapanese(l), `${i + 2}: ${l}`));
});

test('表記: 太字は節ごとに2か所まで、箇条書きの項目名を太字にしない（日英とも）', () => {
  both((lang, text) => {
    for (const s of text.split(/\n## /)) {
      const count = (s.match(/\*\*[^*]+\*\*/g) || []).length;
      assert.ok(count <= 2, `${lang} ${s.split('\n')[0]}: ${count}`);
    }
    assert.ok(!/^\s*[-*] \*\*/m.test(text), lang);
  });
});
