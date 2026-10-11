const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/permutation-core.js');

const root = path.join(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const lines = readme.split('\n');

const DIR = { '送る': 'to', '送る向き': 'to', '取り出す': 'from', '取り出す向き': 'from' };
const code = s => {
  const m = s.match(/`([^`]*)`/);
  return m ? m[1] : null;
};

/** 見出しの行（header の先頭のセル）から始まる表の行を、セルの配列で返す */
function table(firstCell) {
  const start = lines.findIndex(l => l.startsWith(`| ${firstCell} |`));
  assert.ok(start >= 0, `表: ${firstCell}`);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
  }
  return rows;
}

test('YAML メタデータの構造と固定の値', () => {
  assert.ok(readme.startsWith('<!--\n---\nid: day095\nslug: permutation-cipherlab\n'));
  const yaml = readme.slice(0, readme.indexOf('-->'));
  assert.match(yaml, /\nrepo_url: "https:\/\/github\.com\/ipusiron\/permutation-cipherlab"\n/);
  assert.match(yaml, /\ndemo_url: "https:\/\/ipusiron\.github\.io\/permutation-cipherlab\/"\n/);
  assert.match(yaml, /\nhub: true\n---\n$/);
  for (const key of ['category_ja', 'category_en', 'tags']) {
    const m = yaml.match(new RegExp(`\\n${key}:\\n((?:  - .+\\n)+)`));
    assert.ok(m, key);
  }
  const order = ['id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en',
    'category_ja', 'category_en', 'difficulty', 'tags', 'repo_url', 'demo_url', 'hub'];
  const found = [...yaml.matchAll(/^([a-z_]+):/gm)].map(m => m[1]);
  assert.deepEqual(found, order);
});

test('シリーズ標準の見出しと定型', () => {
  assert.match(readme, /\n# Permutation CipherLab - 転置式暗号ツール\n/);
  assert.match(readme, /\n\*\*Day095 - 生成AIで作るセキュリティツール100\*\*\n/);
  assert.match(readme, /\(https:\/\/akademeia\.info\/\?page_id=42163\)/);
  const h2 = lines.filter(l => l.startsWith('## ')).map(l => l.slice(3));
  const expected = ['🌐 デモページ', '📸 スクリーンショット', '👥 対象ユーザー', '⚙️ 主な機能', '🧠 転置式暗号とは',
    '🔀 他の転置式暗号との比較表', '💬 教育的意義', '🎯 ユースケース', '🔗 関連ツール', '🔒 セキュリティについて',
    '🧪 テスト', '📁 ディレクトリー構造', '💻 動作環境', '📄 ライセンス', '🛠️ このツールについて'];
  assert.deepEqual(h2, expected);
});

test('鍵の向きの表: 同じ数字でも送る向きと取り出す向きで暗号文が違う', () => {
  const rows = table('書き方');
  assert.equal(rows.length, 2);
  for (const [dir, key, cipher] of rows) {
    const perm = C.parseKey(code(key), DIR[dir]).perm;
    assert.equal(C.encrypt('ABCD', perm).output, code(cipher), dir);
  }
});

test('既知解答の表を計算部で再計算する', () => {
  const rows = table('鍵');
  assert.equal(rows.length, 7);
  for (const [key, dir, pad, plain, cipher] of rows) {
    const perm = C.parseKey(code(key), DIR[dir]).perm;
    const opts = pad === 'なし' ? { pad: false } : { pad: true, padChar: pad };
    const r = C.encrypt(code(plain), perm, opts);
    assert.equal(r.output, code(cipher), `${key} ${plain}`);
    assert.equal(C.decrypt(r.output, perm, { trimPad: pad !== 'なし', padChar: pad }).output, code(plain));
  }
  assert.ok(readme.includes('`EESLSHSALSESLSHBLEHSYEETHRAEOS`'));
  assert.equal(C.encrypt('shesellsseashellsbytheseashore', C.parseKey('3 5 1 6 4 2', 'from').perm).output.toUpperCase(),
    'EESLSHSALSESLSHBLEHSYEETHRAEOS');
});

test('レールフェンス（順次配置）の表: 鍵・暗号文・式・2つの向き', () => {
  const rows = table('レール数');
  assert.equal(rows.length, 3);
  for (const [rails, plain, cipher, toKey, fromKey] of rows) {
    const r = Number(rails);
    const text = code(plain);
    const n = text.length;
    const c = n / r;
    // README の式 p[i] = (i mod r) × c + ⌊i / r⌋ + 1
    const formula = Array.from({ length: n }, (_, i) => (i % r) * c + Math.floor(i / r) + 1);
    const perm = C.parseKey(code(toKey), 'to').perm;
    assert.deepEqual(perm, formula, rails);
    assert.equal(C.encrypt(text, perm).output, code(cipher), rails);
    assert.equal(C.formatKey(perm, 'from'), code(fromKey), rails);
    // レールに配って読む手順そのもので暗号文を作る
    const byRail = Array.from({ length: r }, (_, k) => [...text].filter((_, i) => i % r === k).join('')).join('');
    assert.equal(byRail, code(cipher), rails);
  }
});

test('縦列転置の表: Day043 の順位の読み方で、行き先は（順位−1）×行数＋行', () => {
  const rows = table('数列（Day043）');
  assert.equal(rows.length, 1);
  const [ranks, plain, cipher, key] = rows[0];
  const rank = code(ranks).split(' ').map(Number);
  const text = code(plain);
  const cols = rank.length;
  const rowsN = text.length / cols;
  const expected = Array.from({ length: text.length }, (_, i) => (rank[i % cols] - 1) * rowsN + Math.floor(i / cols) + 1);
  const perm = C.parseKey(code(key), 'to').perm;
  assert.deepEqual(perm, expected);
  assert.equal(C.encrypt(text, perm).output, code(cipher));
  // 順位の小さい列から上→下に読む
  const order = rank.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const read = order.map(cIdx => [...text].filter((_, i) => i % cols === cIdx).join('')).join('');
  assert.equal(read, code(cipher));
});

test('本文の例: 埋字・TAX・FLAG・ファロー・シャッフル', () => {
  const k = [3, 1, 4, 2];
  const has = s => assert.ok(readme.includes(s), s);
  has('`NGEIAXMX`'); assert.equal(C.encrypt('ENIGMA', k).output, 'NGEIAXMX');
  has('`NGEIMA`'); assert.equal(C.encrypt('ENIGMA', k, { pad: false }).output, 'NGEIMA');
  has('`AXTX`'); assert.equal(C.encrypt('TAX', k).output, 'AXTX');
  has('`TA`'); assert.equal(C.decrypt('AXTX', k).output, 'TA');
  has('`AQTX`'); assert.equal(C.encrypt('TAX', k, { padChar: 'Q' }).output, 'AQTX');
  assert.equal(C.decrypt('AQTX', k, { padChar: 'Q' }).output, 'TAX');
  has('`LGFATY{RPR_E}XMX`'); assert.equal(C.encrypt('FLAG{TRY_PERM}', k).output, 'LGFATY{RPR_E}XMX');
  has('`BDAC`'); has('`CADB`');
  // ファロー・シャッフル（アウト）: 8枚は3回、52枚は8回で戻る
  const out8 = C.parseKey('1-3-5-7-2-4-6-8', 'to').perm;
  has('`AEBFCGDH`→`ACEGBDFH`→`ABCDEFGH`');
  const seq = ['ABCDEFGH'];
  for (let i = 0; i < 3; i++) seq.push(C.encrypt(seq[seq.length - 1], out8).output);
  assert.deepEqual(seq, ['ABCDEFGH', 'AEBFCGDH', 'ACEGBDFH', 'ABCDEFGH']);
  const out52 = [...Array.from({ length: 26 }, (_, i) => 2 * i + 1), ...Array.from({ length: 26 }, (_, i) => 2 * i + 2)];
  let p = out52.slice();
  let times = 1;
  while (p.some((v, i) => v !== i + 1)) { p = C.compose(p, out52); times++; }
  assert.equal(times, 8);
  has('52枚（鍵の長さ52）では8回で戻る');
  // 同じ数字を取り出す向きで読むと2レールのレールフェンス
  assert.equal(C.encrypt('ABCDEFGH', C.parseKey('1-3-5-7-2-4-6-8', 'from').perm).output, 'ACEGBDFH');
  // 席替えの例: 3-1-4-2 は動かない位置がなく、逆は 2-4-1-3
  assert.equal(k.filter((v, i) => v === i + 1).length, 0);
  has('逆の順列`2-4-1-3`');
});

test('画像: README が参照する画像は実在し、assets の画像はすべて参照されている', () => {
  const refs = [...readme.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map(m => m[1]);
  assert.equal(refs.length, 3);
  for (const r of refs) assert.ok(fs.existsSync(path.join(root, r)), r);
  const pngs = fs.readdirSync(path.join(root, 'assets')).filter(f => f.endsWith('.png')).map(f => `assets/${f}`);
  assert.deepEqual(pngs.sort(), [...new Set(refs)].sort());
});

test('ディレクトリー構造: 全ファイルが載り、全行に説明がある', () => {
  const start = lines.indexOf('## 📁 ディレクトリー構造');
  const open = lines.indexOf('```', start);
  const close = lines.indexOf('```', open + 1);
  const tree = lines.slice(open + 2, close);
  assert.equal(lines[open + 1], 'permutation-cipherlab/');
  const listed = [];
  const stack = [];
  const hashCols = new Set();
  for (const line of tree) {
    const m = line.match(/^((?:│   |    )*)(?:├── |└── )(\S+)\s+# (.+)$/);
    assert.ok(m, `説明のない行: ${line}`);
    const depth = m[1].length / 4;
    stack.length = depth;
    stack.push(m[2].replace(/\/$/, ''));
    if (!m[2].endsWith('/')) listed.push(stack.join('/'));
    hashCols.add([...line].indexOf('#'));
  }
  assert.equal(hashCols.size, 1, '# の桁をそろえる');
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
  assert.deepEqual(listed.sort(), actual.sort());
});

test('表記: 禁止する書き方と、日本語と英数字の間の空白', () => {
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
      const a = chars[i - 1], b = chars[i + 1];
      assert.ok(!((ja(a) && latin(b)) || (latin(a) && ja(b))), l);
    }
  }
});

test('表記: 太字は節ごとに2か所まで、箇条書きの項目名を太字にしない', () => {
  const sections = readme.split(/\n## /);
  for (const s of sections) {
    const count = (s.match(/\*\*[^*]+\*\*/g) || []).length;
    assert.ok(count <= 2, `${s.split('\n')[0]}: ${count}`);
  }
  assert.ok(!/^\s*[-*] \*\*/m.test(readme));
});
