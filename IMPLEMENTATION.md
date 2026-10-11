# 実装詳細ドキュメント（開発者向け）

Permutation CipherLabの計算の方法、画面の組み立て、安全対策、テストを説明します。README.mdが利用者向けの説明、このファイルが開発者向けの説明です。

---

## 📋 目次

1. [ファイルの役割](#ファイルの役割)
2. [鍵の表し方と向き](#鍵の表し方と向き)
3. [鍵の読み取りと検証](#鍵の読み取りと検証)
4. [逆の順列と合成](#逆の順列と合成)
5. [暗号化と復号](#暗号化と復号)
6. [埋字の扱い](#埋字の扱い)
7. [乱数で鍵を作る](#乱数で鍵を作る)
8. [画面の状態と自動の計算](#画面の状態と自動の計算)
9. [配線図と1本ずつ引く操作](#配線図と1本ずつ引く操作)
10. [並べ替えの操作](#並べ替えの操作)
11. [保存した鍵](#保存した鍵)
12. [安全対策](#安全対策)
13. [計算量](#計算量)
14. [テスト](#テスト)
15. [参考文献](#参考文献)

---

## ファイルの役割

| ファイル | 役割 |
|---|---|
| `js/permutation-core.js` | 計算部。鍵の読み取り・検証、向きの変換、暗号化・復号、埋字、乱数、途中経過、合成、保存データの検証。DOMに依存せず、Node.jsのテストからも読める |
| `js/messages.js` | JavaScriptが出す文言の辞書。計算部は文言を持たず`{ key, params }`を返し、表示の直前にここで文にする |
| `js/wiring.js` | 配線図（SVG）を描く。属性とクラスだけで組み立てる |
| `script.js` | 画面の制御。状態を1か所に持ち、入力が変わるたびに計算し直して描き直す |
| `index.html` | 4つのタブ（鍵生成・暗号化・復号・座学） |
| `style.css` | 配色の変数（`:root`）と部品のスタイル |

`js/*.js`はES Modulesではなく、通常の`<script>`で読みます。`type="module"`にすると、`index.html`を直接開いたとき（`file://`）にブラウザーが読み込みを拒むためです。各ファイルは即時関数で囲み、ブラウザーでは`window.PermutationCore`・`window.PclMessages`・`window.PclWiring`に、Node.jsでは`module.exports`に公開します。

```javascript
(function (root) {
  'use strict';
  // …
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PermutationCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
```

---

## 鍵の表し方と向き

内部では、鍵を「送る向き」の配列`p`（1始まり）で持ちます。平文のブロックの`i`文字目（0始まり）を、暗号文の位置`p[i]`（1始まり）へ送ります。

```javascript
function permuteBlock(units, perm) {
  const out = new Array(perm.length);
  for (let i = 0; i < perm.length; i++) out[perm[i] - 1] = units[i];
  return out;
}
```

「取り出す向き」の数字`q`は、暗号文の`i`文字目を平文の`q[i]`文字目から取ることを表します。同じ並べ替えなら`q`は`p`の逆の順列です。画面で向きを切り替えても内部の`p`は変えず、表示と入力のときだけ変換します。

```javascript
function fromNotation(values, direction) {   // 書かれた数字 → 内部の p
  return direction === 'from' ? inversePermutation(values) : values.slice();
}
function toNotation(perm, direction) {       // 内部の p → 表示する数字
  return direction === 'from' ? inversePermutation(perm) : perm.slice();
}
```

| 書き方 | `3-1-4-2`で`ABCD`を暗号化 |
|---|---|
| 送る向き | `BDAC` |
| 取り出す向き | `CADB` |

保存する鍵は、向きの設定にかかわらず送る向きの文字列にします。

---

## 鍵の読み取りと検証

`parseKey(str, direction)`は、次の順に確かめます。

1. NFKCで正規化する（全角の数字・ハイフン・カンマ・空白を半角にする）。
2. 区切り（空白、`,`、`、`、各種のハイフンとダッシュ、長音記号`ー`）で分ける。前後の区切りは無視する。
3. 各部分が1〜3桁の数字かを確かめる（`3.5`や`a`は`key.format`）。
4. `validatePermutation`で、長さ（2〜64）・範囲（1〜n）・重複を確かめる。
5. 書かれた向きから内部の送る向きに直す。

誤りは次のキーで返し、画面では`messages.js`の文にします。

| キー | 条件 | 例 |
|---|---|---|
| `key.empty` | 空 | `''` |
| `key.format` | 数字以外を含む | `3-1-a-2` |
| `key.length` | 長さが2未満か65以上 | `1` |
| `key.range` | 1〜nの外の数がある | `9-9`、`1-5-2` |
| `key.duplicate` | 同じ数が2回以上ある（足りない数も返す） | `1-2-2-4`（重複2、不足3） |

---

## 逆の順列と合成

```javascript
function inversePermutation(perm) {
  const inv = new Array(perm.length);
  perm.forEach((to, i) => { inv[to - 1] = i + 1; });
  return inv;
}
function compose(a, b) {   // 先に a、次に b をかけた結果
  return a.map(to => b[to - 1]);
}
```

`3-1-4-2`の逆は`2-4-1-3`です。`compose(p, inversePermutation(p))`は恒等の順列になります。2つの鍵を続けてかけた暗号文は、`compose`で作った1つの鍵の暗号文と同じです（テストで確かめています）。

---

## 暗号化と復号

`toUnits`で、テキストをNFCに正規化したあと1コードポイントずつに分けます。UTF-16の単位で分けないので、絵文字（サロゲートペア）を途中で切りません。NFDで書かれた「か＋濁点」はNFCの「が」1文字になります。

`encrypt(text, perm, { pad, padChar })`は、n文字ずつのブロックごとに次の結果を返します。

- `plain`：埋字を足したあとの平文のブロック
- `cipher`：並べ替えたブロック
- `padCount`：足した埋字の数
- `permuted`：並べ替えたか（短い最後のブロックを埋めなかったときは`false`）

`decrypt(text, perm, { trimPad, padChar })`は、n文字にそろったブロックを逆の順列で並べ戻し、短い最後のブロックはそのまま残します。どちらも、注意を`notes`に`{ key, params }`で入れて返します。

| キー | 意味 |
|---|---|
| `enc.shortBlockKept` | 最後のブロックが短く、埋字なしなので並べ替えずに出した |
| `enc.endsWithPad` | 平文の末尾が埋字と同じ文字（復号で区別できない） |
| `dec.shortBlockKept` | 最後のブロックが短いので並べ替えずに残した |
| `dec.trimmed` | 末尾の埋字を何文字除いたか |

---

## 埋字の扱い

- 埋字は1コードポイントの見える文字に限る（`validatePadChar`）。空白・制御文字・ゼロ幅文字は拒否し、空なら埋字なしとして扱う。
- 暗号化：埋字ありなら、最後の短いブロックを埋字で埋めてから並べ替える。
- 復号：暗号文の長さが鍵の長さの倍数のとき（最後のブロックが埋まっているとき）だけ、末尾の埋字を最大「長さ−1」文字まで除く。

埋字と平文の末尾の文字は、暗号文からは見分けられません。`TAX`を鍵`3-1-4-2`・埋字`X`で暗号化すると`AXTX`、復号して除くと`TA`です。そこで暗号化の側で`enc.endsWithPad`を出し、埋字を別の文字にするよう促します（`Q`なら`AQTX`→`TAX`）。

---

## 乱数で鍵を作る

鍵はFisher–Yates法で作り、各段の乱数は`crypto.getRandomValues`から得ます。`Uint32`の値をそのまま`% max`すると小さい値がわずかに出やすくなるので、`2^32 − (2^32 mod max)`以上の値は捨てて引き直します。

```javascript
function randomBelow(max, getRandomValues) {
  const range = 0x100000000;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  for (;;) {
    getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}
```

`getRandomValues`を渡せない環境では例外を投げ、画面は「ランダム生成はできません」と知らせます（`Math.random`には切り替えません）。

---

## 画面の状態と自動の計算

`script.js`は状態を`state`の1か所に持ちます。

| 項目 | 内容 |
|---|---|
| `direction` | 鍵の書き方（`to`／`from`） |
| `key` | 送る向きの鍵 |
| `enc.result`・`enc.block`・`enc.step`・`enc.timer` | 暗号化の結果、表示中のブロック、引いた線の本数（`null`はすべて）、自動で引くタイマー |
| `dec.result`・`dec.block` | 復号の結果と表示中のブロック |
| `editorOpen`・`editorSelected` | 並べ替えの開閉と、選んでいる数字 |

鍵を変えると`setKey`が、平文・埋字を変えると`input`・`change`のイベントが、`computeEncrypt`・`computeDecrypt`を呼び、結果・注意・ブロックの表示をまとめて描き直します。前の結果を残す経路がないので、鍵を変えたのに暗号文が古いまま、という食い違いが起きません。IMEで変換中も入力欄は書き換えないので、変換は途切れません。

タブは`role="tablist"`で、`aria-selected`と`tabIndex`を切り替えのたびにそろえます。←→・Home・Endで移れます。

---

## 配線図と1本ずつ引く操作

`PclWiring.render(svg, opts)`は、上の段の位置`i`から下の段の位置`j`へ線（3次ベジェ曲線）を引きます。

- 図は自然な大きさ（1位置40px）で描き、はみ出す分は外側の`.wiring-scroll`で横にスクロールさせる。幅を画面に合わせて縮めないので、長い鍵でも文字が小さくならない。
- 矢じりは`polygon`の三角形で描く（`marker`は使わない）。
- 動かない位置（`p[i] = i + 1`）の線は破線にする。
- 箱の中の空白は`␣`、制御文字や見えない文字は`U+XXXX`の形で示す。利用者の文字列は`text`要素の`textContent`に入れる。
- 図全体に`role="img"`と、線の対応を並べた`aria-label`を付ける（16本まで。それ以上は本数だけ）。同じ内容は対応表でも読める。

1本ずつ引く操作の状態は「引いた本数`step`」だけです。`partialBlock(units, perm, step)`が、最初の`step`本の線を引いた状態の暗号文の各位置（まだなら`null`）を返し、画面はその戻り値から描きます。ボタンを連打しても、自動で引いている途中で入力を変えても、状態がずれる余地がありません。入力・鍵・ブロックを変えると、自動で引く処理を止め、すべての線を引いた状態に戻します。

---

## 並べ替えの操作

鍵生成タブの「並べ替えて作る」は、今の鍵の数字（選んでいる向きで書いたもの）を`button`の並びで示します。

| 操作 | 動き |
|---|---|
| クリック・タップ | 1つ目で選び、2つ目で入れ替える。同じものをもう一度押すと選択を外す |
| Enter・Space | クリックと同じ（`button`の標準の動き） |
| ←→ | 選んでいる数字を隣と入れ替えて動かす。選んでいなければフォーカスだけ動かす |
| Esc | 選択を外す |
| マウスのドラッグ | 落とした先の数字と入れ替える |

入れ替えるたびに鍵へすぐ反映し、`aria-live`の欄に結果を出します。イベントは`ol`に1回だけ登録し、押された`button`を`closest`で探します（開き直してもリスナーは増えません）。

---

## 保存した鍵

`localStorage`の`pcl_patterns_v1`に、`[{ "name": "…", "pattern": "3-1-4-2" }]`の形で保存します。`pattern`は送る向きです。

読み込むときは`sanitizeSaved`で、次のどれかに当てはまる項目を捨て、捨てた数を画面に出します。

- `name`か`pattern`が文字列でない。
- `name`が空か61文字以上、または同じ`name`がすでにある。
- `pattern`が鍵として正しくない（`9-9`など）。

`localStorage`が使えない環境（読み書きで例外が出る）では、保存の機能が使えないことを示し、ほかの機能はそのまま動きます。

---

## 安全対策

- 利用者の文字列（平文・暗号文・保存名・埋字）は`textContent`、`value`、SVGの`text`要素で出す。`innerHTML`で文字列を組み立てない。
- `<meta http-equiv="Content-Security-Policy">`で`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`を指定する。
  - インラインのスクリプト、`onclick`などのイベント属性、`style`属性を使わない（`test/html.test.js`で検証）。
  - 表示の切り替えは`hidden`属性とクラス、配線図の座標はSVGの属性で行う。
  - `frame-ancestors`は`<meta>`に書いてもブラウザーが無視するので書かない（[SECURITY.md](SECURITY.md)）。
- ページの`referrer`を`<meta name="referrer" content="no-referrer">`にし、外部リンクに`rel="noopener noreferrer"`を付ける。
- 外部のスクリプト・フォント・CDNを読まない。通信は行わない。

---

## 計算量

| 処理 | 計算量 | 備考 |
|---|---|---|
| 鍵の検証 | O(n) | `Set`で重複を数える |
| 逆の順列・合成 | O(n) | 1回の走査 |
| ランダム生成 | O(n) | 棄却は1段あたり平均2回未満 |
| 暗号化・復号 | O(L) | Lは文字数。どのブロックも同じ鍵 |
| 配線図 | O(n) | 表示中の1ブロックだけ描く |

入力のたびに全文を計算し直しますが、処理はO(L)で、表示は1ブロック分だけです。

---

## テスト

`npm test`（`node --test`）で次を検証します。依存パッケージはありません。

| ファイル | 内容 |
|---|---|
| `test/core.test.js` | 既知解答（`ENIG`→`NGEI`、Stinsonの例、Gainesの例、レールフェンス・縦列転置との等価）、n=2〜64の往復、絵文字・結合文字、埋字の境界、乱数の棄却と偏り、保存データの検証 |
| `test/readme.test.js` | READMEの表の例を計算部で再計算、YAMLの構造、画像の参照、ディレクトリー構造の網羅と説明、表記 |
| `test/html.test.js` | CSP（`frame-ancestors`なし）、`referrer`、インラインのイベント属性と`style`属性がない、タブとパネルのARIA、主要な要素のid |
| `test/contrast.test.js` | `style.css`の配色から、文字と背景の組のコントラスト比が4.5:1以上か |
| `test/messages.test.js` | `script.js`が使う文言のキーが辞書にあること、`script.js`に日本語の文字列がないこと |
| `test/format.test.js` | 行の長さ、改行コード、見えない文字 |

---

## 参考文献

- Douglas R. Stinson, "Cryptography: Theory and Practice"（Permutation Cipherの定義。取り出す向きの式）
- Helen Fouché Gaines, "Elementary Cryptanalysis" (1939), Project Gutenberg #75074（同じ鍵の2通りの使い方、多重アナグラム）
- Donald E. Knuth, "The Art of Computer Programming, Volume 2: Seminumerical Algorithms"（Fisher–Yates法）
- OWASP Cross Site Scripting Prevention Cheat Sheet
- W3C Content Security Policy Level 3（`frame-ancestors`は`<meta>`では無視される）
