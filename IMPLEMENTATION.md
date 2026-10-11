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
12. [順列の性質](#順列の性質)
13. [ほかの転置式暗号を1つの順列にする](#ほかの転置式暗号を1つの順列にする)
14. [既知平文から鍵を数える](#既知平文から鍵を数える)
15. [鍵なし解読（多重アナグラム）](#鍵なし解読多重アナグラム)
16. [日英の切り替え](#日英の切り替え)
17. [安全対策](#安全対策)
18. [計算量](#計算量)
19. [テスト](#テスト)
20. [参考文献](#参考文献)

---

## ファイルの役割

| ファイル | 役割 |
|---|---|
| `js/permutation-core.js` | 計算部。鍵の読み取り・検証、向きの変換、暗号化・復号、埋字、乱数、途中経過、合成、保存データの検証、順列の性質、ほかの転置式暗号からの変換、既知平文。DOMに依存せず、Node.jsのテストからも読める |
| `js/solver.js` | 鍵なし解読（多重アナグラム）。DOMに依存しない |
| `js/english-bigrams.js` | 英語の2文字統計（生成物。`tools/build-bigrams.py`で作る） |
| `js/messages.js` | JavaScriptが出す文言の日英の辞書。計算部は文言を持たず`{ key, params }`を返し、表示の直前にここで文にする |
| `js/i18n.js`・`js/i18n-en.js` | 画面の日英の切り替え。index.htmlの日本語の原文を控え、英語の対応表で入れ替える |
| `js/wiring.js` | 配線図（SVG）を描く。属性とクラスだけで組み立てる |
| `tools/build-bigrams.py`・`tools/eval-solver.js` | 2文字統計の生成と、鍵なし解読の当たり具合の測定（本文は`tools/corpus/`に置く。Gitの対象外） |
| `script.js` | 画面の制御。状態を1か所に持ち、入力が変わるたびに計算し直して描き直す |
| `index.html` | 4つのタブ（鍵生成・暗号化・復号・座学） |
| `style.css` | 配色の変数（`:root`）と部品のスタイル |

`js/*.js`はES Modulesではなく、通常の`<script>`で読みます（読む順は`permutation-core.js`→`english-bigrams.js`→`solver.js`→`messages.js`→`i18n-en.js`→`i18n.js`→`wiring.js`→`script.js`）。`type="module"`にすると、`index.html`を直接開いたとき（`file://`）にブラウザーが読み込みを拒むためです。各ファイルは即時関数で囲み、ブラウザーでは`window.PermutationCore`・`window.PclMessages`・`window.PclWiring`に、Node.jsでは`module.exports`に公開します。

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

## 順列の性質

| 関数 | 内容 |
|---|---|
| `cycles(perm)` | 巡回表記。位置iから`perm[i]`へたどり、各巡回を最小の位置から始める（長さ1も含む） |
| `order(perm)` | 位数。巡回の長さの最小公倍数（`3-1-4-2`は4、8枚のアウト・シャッフル`1-3-5-7-2-4-6-8`は3） |
| `fixedPoints(perm)`・`isInvolution(perm)` | 動かない位置、2回かけると戻るか |
| `power(perm, k)` | 同じ鍵をk回続けてかけた鍵（`compose`をk回） |
| `permutationMatrix(perm)` | `M[j][i] = 1`は「平文の位置i+1の文字が暗号文の位置j+1へ移る」。暗号文の列ベクトル＝M×平文の列ベクトル |
| `log2Factorial(n)` | 鍵の数n!のビット数 |

画面の「巡回表記」では長さ2以上の巡回に6色（`--cyc0`〜`--cyc5`。白地で4.5:1以上）を順に割り当て、鍵の配線図の線にも同じ色のクラス（`c0`〜`c5`）を付けます。鍵の数は`BigInt`で計算し、15桁以下なら正確な値、それより大きければおよその値（例：52! ≒ 8.06×10^67）を出します。

---

## ほかの転置式暗号を1つの順列にする

どの方式も「暗号文のk文字目に平文の何文字目が来るか」（読む順）を作り、`fromReadOrder`で送る向きの鍵に直します。

| 関数 | 読む順 | 合わせたツール |
|---|---|---|
| `railFence(L, rails, 'sequential')` | 文字をレール0→1→…→r−1→0…に配り、レールごとに左から | Day034の方式1 |
| `railFence(L, rails, 'zigzag')` | 端で折り返して配る（周期2(r−1)） | Day034の方式2 |
| `scytale(L, rows)` | 行数rowsの表に行方向で書き、列ごとに上から。空きのマスは飛ばす | Day010 |
| `columnar(L, ranks)` | 列数＝鍵の長さの表に行方向で書き、順位の小さい列から上→下（不完全な表も可） | Day043 |
| `spiral(rows, cols)` | 左上から時計回りに内側へ | — |
| `reverse(L)` | 後ろから | — |

`columnarRanks`は、数字があれば数列（列の順位）、なければキーワードをアルファベット順の順位に直します（同じ文字は左の列が先。Day043と同じ）。テストでは、Day034・Day043・Day010の実装で作った暗号文と同じになることを確かめています（例：ZEBRASで`WEAREDISCOVEREDFLEEATONCE`→`EVLNACDTESEAROFODEECWIREE`）。

---

## 既知平文から鍵を数える

`knownPlaintext(plain, cipher, n)`は、完全なブロックだけを使い、平文の位置iごとに「全部のブロックで、平文のi文字目と暗号文のj文字目が同じ」になる位置jの集合を作ります。鍵はこの集合から1つずつ、重ならないように選んだ組（完全マッチング）です。

- 1つを見つける：増加路法（`findMatching`）。見つからなければ矛盾（同じ鍵の組ではないか、ブロック長が違う）
- 数える：nが20以下なら、選び終えた位置の集合をビットで表すDP（`countMatchings`、2^n通りの状態）。21以上は数えず、1つだけ示す
- ブロック長がわからないとき（`knownPlaintextScan`）：2〜上限の各nで矛盾しない鍵があるかを調べる

1ブロックで同じ文字が複数あると候補が残ります。`ATTACK A`（Aが3つ、Tが2つ）は3!×2!＝12通り、2ブロック目まで使うと1通りです。

---

## 鍵なし解読（多重アナグラム）

`js/solver.js`は、暗号文をk文字ずつの行に並べた表の、列の読む順を探します。どの行も同じ順なので、列aの直後に列bを読む得点（2文字の統計の対数の、全行の和）`edge[a][b]`と、行の終わりの列aから次の行の初めの列bへのつながり`wrap[a][b]`を先に数えます。最後の半端な部分（埋字なしの短いブロック）は、並べ替えていない尾として行の最後につなげます。

```
得点(順) = Σ edge[順[t]][順[t+1]] + wrap[順[k−1]][順[0]] + （尾へのつながり）
```

- 読む順は、始まりの列ごとに、使った列の集合と最後の列をビットで表すDP（Held–Karp法と同じ形）で、得点の最大値を厳密に求める。計算量はO(k^3・2^k)で、kは16まで（Node.jsで1件0.35秒ほど）
- ブロック長がわからないとき（`solveAuto`）は、2〜16の各kで解き、`得点/100 − 2×log10(k!)`で並べる。係数2は、学習に使っていない英文で、1・1.5・2・3を比べて決めた（評価の詳細は作者の調査記録）
- 暗号文に英字以外があれば28記号（A〜Z・空白・その他）、英字だけなら26記号の表を使う。表は`tools/build-bigrams.py`がProject Gutenberg #1342から作る（値は`round(100 × log10((組の回数+1)/(1文字目の回数+記号の数)))`）
- 当たり具合は`tools/eval-solver.js`（乱数の種を固定）で、学習に使っていない#98から切り出した英文で測る。READMEの表は`tools/eval-solver-result.json`と同じ値かをテストで確かめる

画面では、ブロック長ごとに`setTimeout`で区切って実行し、途中経過を出します。暗号文が変わったら実行の番号（`coaToken`）を進め、古い実行の結果は捨てます。作業台の色分けは、1行あたりの平均が−1.2以上を「良い」、−1.45未満を「悪い」とします（正しい並びはおよそ−1.2以上、でたらめな並びの中央値はおよそ−1.5〜−1.7）。

---

## 日英の切り替え

- index.htmlは日本語のまま書く。`script.js`の最初で`PclI18n.collect(document.body)`を呼び、日本語を含むテキストノードと`placeholder`・`aria-label`・`title`を控える（`[data-i18n-skip]`の中は除く）
- 英語では、控えた文字列（空白を1つにまとめて前後を詰めたもの）をキーに`js/i18n-en.js`の対応表で入れ替える。インラインの要素で分かれた文は断片ごとに訳し、前後の空白が要る断片は英語の側に空白を含める
- JavaScriptがあとから書き換えた所は、控えた時の文字列と違うので入れ替えない。それらは`messages.js`の文言で描き直す（`rerenderAll`。計算はし直さない）
- 状態の文（鍵なし解読・作業台・並べ替え）はキー＋引数で持ち、言語を切り替えたら描き直す
- 初めの言語は`?lang=`→保存した選択（`localStorage`の`pcl_lang`）→ブラウザーの言語（日本語以外は英語）

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
| 既知平文の数え上げ | O(n・2^n) | n≤20。それより大きければ1つだけ探す（増加路法） |
| 鍵なし解読 | O(k^2・行数＋k^3・2^k) | k≤16。長さが不明なら2〜16を順に |

入力のたびに全文を計算し直しますが、処理はO(L)で、表示は1ブロック分だけです。

---

## テスト

`npm test`（`node --test`）で次を検証します。依存パッケージはありません。

| ファイル | 内容 |
|---|---|
| `test/core.test.js` | 既知解答（`ENIG`→`NGEI`、Stinsonの例、Gainesの例、レールフェンス・縦列転置との等価）、n=2〜64の往復、絵文字・結合文字、埋字の境界、乱数の棄却と偏り、保存データの検証 |
| `test/readme.test.js` | 日英のREADMEの表の例を計算部で再計算（既知平文の鍵の数も）、当たり具合の表と評価の出力の一致、見出しの対応、YAMLの構造、画像の参照、ディレクトリー構造の網羅と説明、表記 |
| `test/html.test.js` | CSP（`frame-ancestors`なし）、`referrer`、インラインのイベント属性と`style`属性がない、タブとパネルのARIA、主要な要素のid |
| `test/contrast.test.js` | `style.css`の配色から、文字と背景の組のコントラスト比が4.5:1以上か |
| `test/core2.test.js` | 順列の性質、ほかの転置式暗号からの変換（Day010・034・043と同じ結果）、既知平文の鍵の数 |
| `test/solver.test.js` | 統計の表、鍵なし解読（長さ既知・不明、英字だけ）、作業台の得点 |
| `test/messages.test.js` | `script.js`が使う文言のキーが辞書にあること、`script.js`に日本語の文字列がないこと |
| `test/i18n.test.js` | 日英の文言のキーと差し込みの一致、英語に日本語がないこと、index.htmlの日本語の文字列がすべて訳されていること |
| `test/format.test.js` | 行の長さ、改行コード、見えない文字 |

---

## 参考文献

- Douglas R. Stinson, "Cryptography: Theory and Practice"（Permutation Cipherの定義。取り出す向きの式）
- Helen Fouché Gaines, "Elementary Cryptanalysis" (1939), Project Gutenberg #75074（同じ鍵の2通りの使い方、多重アナグラム）
- Matthew D. Russell, John A. Clark, Susan Stepney, "Making the Most of Two Heuristics: Breaking Transposition Ciphers with Ants" (CEC 2003)（隣り合う列の2文字の統計で並べる）
- Michael Held, Richard M. Karp, "A Dynamic Programming Approach to Sequencing Problems" (1962)（ビットDP）
- Donald E. Knuth, "The Art of Computer Programming, Volume 2: Seminumerical Algorithms"（Fisher–Yates法）
- OWASP Cross Site Scripting Prevention Cheat Sheet
- W3C Content Security Policy Level 3（`frame-ancestors`は`<meta>`では無視される）
