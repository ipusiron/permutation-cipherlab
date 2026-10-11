/* ============================================================================
 * Permutation CipherLab - 画面の英語（index.html の日本語の文字列 → 英語）
 * ============================================================================
 * 各組は [index.html の日本語の文字列（空白を1つにまとめて前後を詰めたもの）, 英語]。
 * インラインの要素（code・strong など）で分かれた文は断片ごとに訳し、
 * 前後の空白が要る断片は英語の側に空白を含める。js/i18n.js が使う。
 * ============================================================================ */
(function (root) {
  'use strict';

  const PAIRS = [
    [
      "Permutation CipherLab - 転置式暗号ツール",
      "Permutation CipherLab - Transposition Cipher Tool",
    ],
    [
      "任意の転置パターンで文字列を並び替える「転置式暗号」をビジュアルで理解するためのツール",
      "A tool for understanding transposition ciphers visually by rearranging text with any permutation pattern",
    ],
    [
      "機能の切り替え",
      "Switch features",
    ],
    [
      "鍵生成",
      "Key",
    ],
    [
      "暗号化",
      "Encrypt",
    ],
    [
      "復号",
      "Decrypt",
    ],
    [
      "変換",
      "Convert",
    ],
    [
      "解読ラボ",
      "Lab",
    ],
    [
      "座学",
      "Learn",
    ],
    [
      "転置パターン（鍵）",
      "Permutation pattern (key)",
    ],
    [
      "暗号化・復号に使う並べ替えのパターン（鍵）を作ります。鍵の長さが、そのまま1ブロックの文字数になります。",
      "Create the rearrangement pattern (key) used for encryption and decryption. The key length is also the number o" +
      "f characters in one block.",
    ],
    [
      "鍵の書き方（向き）",
      "Key notation (direction)",
    ],
    [
      "送る向き",
      "Scatter",
    ],
    [
      "：平文のi文字目を、暗号文の位置p[i]へ送る（本ツールの既定）",
      ": plaintext character i goes to ciphertext position p[i] (the default in this tool)",
    ],
    [
      "取り出す向き",
      "Gather",
    ],
    [
      "：暗号文のi文字目を、平文のp[i]文字目から取る（Stinsonの教科書・dCodeの書き方）",
      ": ciphertext character i is taken from plaintext character p[i] (the notation of Stinson's textbook and dCode)",
    ],
    [
      "同じ並べ替えを2通りに書けます。3-1-4-2（送る向き）と2-4-1-3（取り出す向き）は同じ鍵で、どちらもENIGを" +
      "NGEIにします。 切り替えても鍵そのものは変わらず、数字の書き方だけが変わります。",
      "The same rearrangement can be written in two ways. 3-1-4-2 (scatter) and 2-4-1-3 (gather) are the same key, an" +
      "d both turn ENIG into NGEI. Switching changes only how the digits are written, not the key itself.",
    ],
    [
      "パターン長（2〜64）",
      "Pattern length (2 to 64)",
    ],
    [
      "よく使う長さ：",
      "Common lengths:",
    ],
    [
      "パターン長 = ブロックの文字数",
      "Pattern length = characters per block",
    ],
    [
      "パターン長4なら、平文を4文字ずつのブロックに分け、どのブロックも同じ鍵で並べ替えます。",
      "With pattern length 4, the plaintext is split into blocks of 4 characters, and every block is rearranged with " +
      "the same key.",
    ],
    [
      "作り方",
      "Ways to make a key",
    ],
    [
      "🎲 ランダムに作る",
      "🎲 Random",
    ],
    [
      "パターン長の鍵を、ブラウザーの暗号用の乱数（crypto.getRandomValues）で作ります。",
      "Creates a key of the pattern length with the browser's cryptographic random numbers (crypto.getRandomValues).",
    ],
    [
      "ランダム生成",
      "Generate",
    ],
    [
      "✏️ 数字で入力する",
      "✏️ Enter digits",
    ],
    [
      "数字を「-」「,」や空白で区切って入力し、Enterか「適用」で設定します。いま選んでいる向きで読みます。",
      "Enter numbers separated by \"-\", \",\" or spaces, then press Enter or \"Apply\". They are read in the selected nota" +
      "tion.",
    ],
    [
      "鍵の数字",
      "Key digits",
    ],
    [
      "例）3-1-4-2",
      "e.g. 3-1-4-2",
    ],
    [
      "適用",
      "Apply",
    ],
    [
      "🎨 並べ替えて作る",
      "🎨 Rearrange",
    ],
    [
      "今の鍵の数字を並べ替えます。2つを順に選ぶと入れ替わり、すぐに鍵へ反映します。 キーボードでは、数字を選んでEnterか" +
      "Spaceを押し、← → で動かします。",
      "Rearrange the digits of the current key. Selecting two in turn swaps them, and the key updates immediately. Wi" +
      "th the keyboard, select a digit, press Enter or Space, and move it with ← →.",
    ],
    [
      "並べ替えを開く",
      "Open the editor",
    ],
    [
      "鍵の数字の並び",
      "Key digits in order",
    ],
    [
      "現在の鍵",
      "Current key",
    ],
    [
      "未設定",
      "Not set",
    ],
    [
      "コピー",
      "Copy",
    ],
    [
      "ブロックの文字数",
      "Characters per block",
    ],
    [
      "取り出す向きの数字は、送る向きで書いた復号の鍵（逆の順列）と同じです。鍵は暗号化・復号タブでそのまま使います。",
      "The gather digits equal the decryption key (the inverse permutation) written in scatter notation. The key is u" +
      "sed as is in the Encrypt and Decrypt tabs.",
    ],
    [
      "配線図：上の段が平文の位置、下の段が暗号文の位置です。線は各文字の行き先を表します。復号は線を下から上へたどります。",
      "Wiring diagram: the top row is the plaintext positions and the bottom row the ciphertext positions. Each line " +
      "shows where a character goes. Decryption follows the lines from bottom to top.",
    ],
    [
      "鍵の配線図（横にスクロールできます）",
      "Wiring diagram of the key (scrolls horizontally)",
    ],
    [
      "鍵の性質",
      "Key properties",
    ],
    [
      "巡回表記（色は配線図と同じ）",
      "Cycle notation (colors match the wiring diagram)",
    ],
    [
      "位数（同じ鍵を何回かけると元に戻るか）",
      "Order (how many applications bring it back)",
    ],
    [
      "動かない位置",
      "Fixed positions",
    ],
    [
      "2回かけると元に戻るか（対合）",
      "Back after two applications (involution)",
    ],
    [
      "同じ長さの鍵の数",
      "Number of keys of this length",
    ],
    [
      "くり返しかけた様子（暗号化タブの平文の先頭のブロックを使います）：",
      "Applying the key repeatedly (uses the first block of the plaintext in the Encrypt tab):",
    ],
    [
      "置換行列を見る",
      "Show the permutation matrix",
    ],
    [
      "列が平文の位置、行が暗号文の位置です。平文の位置iの文字が暗号文の位置jへ移るとき、j行i列が1になります。 暗号文を縦" +
      "に並べたものは、この行列と平文を縦に並べたものの積です（Stinsonの教科書では、転置式暗号をこの行列を鍵にしたヒル暗" +
      "号の特別な場合として扱います）。",
      "Columns are plaintext positions and rows are ciphertext positions. When the character at plaintext position i " +
      "moves to ciphertext position j, the entry in row j, column i is 1. The ciphertext as a column vector is this m" +
      "atrix times the plaintext as a column vector (Stinson's textbook treats the transposition cipher as the specia" +
      "l case of the Hill cipher whose key is this matrix).",
    ],
    [
      "鍵の保存と管理",
      "Save and manage keys",
    ],
    [
      "このブラウザーのlocalStorageに保存します（送る向きで保存）。秘密の鍵は保存しないでください。",
      "Keys are saved in this browser's localStorage (in scatter notation). Do not save secret keys.",
    ],
    [
      "保存名",
      "Name",
    ],
    [
      "保存名（例：demo-key-1）",
      "Name (e.g. demo-key-1)",
    ],
    [
      "保存",
      "Save",
    ],
    [
      "平文",
      "Plaintext",
    ],
    [
      "例）ENIGMA IS FUN",
      "e.g. ENIGMA IS FUN",
    ],
    [
      "📝 例文を選ぶ",
      "📝 Choose an example",
    ],
    [
      "使用中の鍵（",
      "Key in use (",
    ],
    [
      "）：",
      "): ",
    ],
    [
      "埋字（パディング）",
      "Padding",
    ],
    [
      "埋字",
      "Padding character",
    ],
    [
      "最後の短いブロックを埋字で埋めてから並べ替える",
      "Pad the last short block before rearranging it",
    ],
    [
      "外すと、最後の短いブロックは並べ替えずにそのまま出ます。",
      "If unchecked, the last short block is output as is without rearranging.",
    ],
    [
      "暗号文",
      "Ciphertext",
    ],
    [
      "平文を入れると、ここに暗号文が出ます",
      "The ciphertext appears here when you enter a plaintext",
    ],
    [
      "平文・鍵・埋字を変えると、すぐに計算し直します。",
      "Changing the plaintext, key or padding recalculates immediately.",
    ],
    [
      "暗号文をコピー",
      "Copy ciphertext",
    ],
    [
      "復号タブに送る",
      "Send to Decrypt",
    ],
    [
      "ブロックごとの並べ替え",
      "Rearrangement per block",
    ],
    [
      "前のブロック",
      "Previous block",
    ],
    [
      "◀ 前",
      "◀ Prev",
    ],
    [
      "ブロックなし",
      "No blocks",
    ],
    [
      "次のブロック",
      "Next block",
    ],
    [
      "次 ▶",
      "Next ▶",
    ],
    [
      "ブロックの配線図（横にスクロールできます）",
      "Wiring diagram of the block (scrolls horizontally)",
    ],
    [
      "線を1本ずつ引く",
      "Draw the wires one by one",
    ],
    [
      "最初から",
      "Restart",
    ],
    [
      "1本戻す",
      "Back one",
    ],
    [
      "1本引く",
      "Draw one",
    ],
    [
      "最後まで",
      "Draw all",
    ],
    [
      "自動で引く",
      "Draw automatically",
    ],
    [
      "対応表（平文 → 暗号文）",
      "Mapping (plaintext → ciphertext)",
    ],
    [
      "平文の位置",
      "Plaintext position",
    ],
    [
      "文字",
      "Character",
    ],
    [
      "行き先（暗号文の位置）",
      "Goes to (ciphertext position)",
    ],
    [
      "例）NGEI",
      "e.g. NGEI",
    ],
    [
      "復号では逆の順列",
      "Decryption puts the characters back with the inverse permutation ",
    ],
    [
      "（送る向き）で並べ戻します。",
      " (scatter).",
    ],
    [
      "末尾の埋字を除く（最後のブロックの範囲で最大「長さ−1」文字まで）",
      "Remove trailing padding (within the last block, at most length − 1 characters)",
    ],
    [
      "埋字と平文の末尾の文字は見分けられません。平文の末尾が埋字と同じ文字なら、除く設定を外してください。",
      "Padding cannot be told apart from plaintext that ends with the same character. If the plaintext ends with the " +
      "padding character, turn the removal off.",
    ],
    [
      "平文（復号の結果）",
      "Plaintext (decrypted)",
    ],
    [
      "暗号文を入れると、ここに平文が出ます",
      "The plaintext appears here when you enter a ciphertext",
    ],
    [
      "暗号文・鍵・埋字を変えると、すぐに計算し直します。",
      "Changing the ciphertext, key or padding recalculates immediately.",
    ],
    [
      "平文をコピー",
      "Copy plaintext",
    ],
    [
      "ブロックごとの並べ戻し",
      "Restoring each block",
    ],
    [
      "対応表（暗号文 → 平文）",
      "Mapping (ciphertext → plaintext)",
    ],
    [
      "暗号文の位置",
      "Ciphertext position",
    ],
    [
      "戻り先（平文の位置）",
      "Goes back to (plaintext position)",
    ],
    [
      "ほかの転置式暗号を鍵にする",
      "Turn other transposition ciphers into a key",
    ],
    [
      "文の長さを決めれば、どの転置式暗号も1つの順列（このツールの鍵）で書けます。方式と長さを選ぶと、同じ並べ替えになる鍵を作" +
      "ります。",
      "Once the text length is fixed, any transposition cipher can be written as a single permutation (a key of this " +
      "tool). Choose a method and lengths to make the key that rearranges the same way.",
    ],
    [
      "方式",
      "Method",
    ],
    [
      "レールフェンス（順次配置）",
      "Rail fence (sequential)",
    ],
    [
      "レールフェンス（ジグザグ）",
      "Rail fence (zigzag)",
    ],
    [
      "スキュタレー",
      "Scytale",
    ],
    [
      "縦列転置（キーワードか数列）",
      "Columnar (keyword or numbers)",
    ],
    [
      "経路暗号（渦巻き）",
      "Route cipher (spiral)",
    ],
    [
      "逆順",
      "Reverse",
    ],
    [
      "文字数",
      "Length",
    ],
    [
      "レール数",
      "Rails",
    ],
    [
      "行数",
      "Rows",
    ],
    [
      "列数",
      "Columns",
    ],
    [
      "鍵（キーワードか数列）",
      "Key (keyword or numbers)",
    ],
    [
      "試す文",
      "Sample text",
    ],
    [
      "空欄ならA, B, C…を使います",
      "If empty, A, B, C… are used",
    ],
    [
      "鍵（送る向き）",
      "Key (scatter)",
    ],
    [
      "鍵（取り出す向き）",
      "Key (gather)",
    ],
    [
      "暗号文の例",
      "Sample ciphertext",
    ],
    [
      "変換した鍵の配線図（横にスクロールできます）",
      "Wiring diagram of the converted key (scrolls horizontally)",
    ],
    [
      "この鍵を使う",
      "Use this key",
    ],
    [
      "2つの鍵を続けてかける（合成）",
      "Applying two keys in a row (composition)",
    ],
    [
      "鍵Aで暗号化した文を、さらに鍵Bで暗号化すると、1つの鍵で暗号化したのと同じ結果になります。 二重転置も、文の長さを決め" +
      "れば1つの順列です。鍵はいま選んでいる向き（",
      "Encrypting with key A and then encrypting the result with key B gives the same result as encrypting once with " +
      "a single key. Double transposition is also a single permutation once the text length is fixed. Keys are read i" +
      "n the selected notation (",
    ],
    [
      "）で読みます。",
      ").",
    ],
    [
      "鍵A（先にかける）",
      "Key A (applied first)",
    ],
    [
      "鍵B（次にかける）",
      "Key B (applied second)",
    ],
    [
      "鍵Aに今の鍵を入れる",
      "Put the current key in key A",
    ],
    [
      "合成した鍵（",
      "Composed key (",
    ],
    [
      "）",
      ")",
    ],
    [
      "Aのあと、Bをかけた結果",
      "A then B",
    ],
    [
      "合成した鍵を1回かけた結果",
      "The composed key once",
    ],
    [
      "合成した鍵を使う",
      "Use the composed key",
    ],
    [
      "解読ラボ：暗号文",
      "Lab: ciphertext",
    ],
    [
      "鍵を知らずに、暗号文から鍵と平文を探します。どのブロックも同じ鍵で並べ替えている、という弱点を使います。",
      "Find the key and plaintext from a ciphertext without knowing the key. The weakness used is that every block is" +
      " rearranged with the same key.",
    ],
    [
      "暗号文を入れます（Cipher Clairvoyanceから渡すこともできます）",
      "Enter a ciphertext (it can also be passed from Cipher Clairvoyance)",
    ],
    [
      "暗号化タブの暗号文を入れる",
      "Use the ciphertext from the Encrypt tab",
    ],
    [
      "既知平文から鍵を割り出す",
      "Recover the key from known plaintext",
    ],
    [
      "平文の一部（暗号文の先頭に対応する部分）がわかっているとき、矛盾しない鍵を探して数えます。",
      "When part of the plaintext (the part matching the start of the ciphertext) is known, find and count the keys c" +
      "onsistent with it.",
    ],
    [
      "わかっている平文（先頭から）",
      "Known plaintext (from the start)",
    ],
    [
      "例）ATTACK AT DAWN",
      "e.g. ATTACK AT DAWN",
    ],
    [
      "ブロック長",
      "Block length",
    ],
    [
      "ブロック長がわからない（2〜64を全部調べる）",
      "Block length unknown (check all of 2 to 64)",
    ],
    [
      "平文の各位置が行けそうな暗号文の位置",
      "Ciphertext positions each plaintext position may go to",
    ],
    [
      "行けそうな暗号文の位置",
      "Possible ciphertext positions",
    ],
    [
      "鍵なしで解く（英語）",
      "Solve without the key (English)",
    ],
    [
      "暗号文をブロック長の幅の表にし、英語の2文字のつながりがいちばん自然になる列の並びを探します（多重アナグラム）。 英語の" +
      "文にだけ使えます。短い文や長い鍵では外れることがあります。",
      "Writes the ciphertext as a table as wide as the block length and searches for the column order whose adjacent " +
      "letter pairs look most like English (multiple anagramming). Works only for English text. It can fail on short " +
      "texts or long keys.",
    ],
    [
      "解く",
      "Solve",
    ],
    [
      "候補（上ほど英語らしい）",
      "Candidates (most English-like first)",
    ],
    [
      "順位",
      "Rank",
    ],
    [
      "鍵",
      "Key",
    ],
    [
      "平文の先頭",
      "Plaintext (start)",
    ],
    [
      "操作",
      "Actions",
    ],
    [
      "作業台（列を入れ替えて読む）",
      "Workbench (swap columns and read)",
    ],
    [
      "暗号文をブロック長の幅で縦に並べます。どの行も同じ鍵なので、列を入れ替えると全部の行が一度に読めるようになります。 列の" +
      "見出しを2つ順に選ぶと入れ替わります（キーボードでは見出しを選んでEnterかSpaceを押し、← →で動かします）。",
      "Stacks the ciphertext in rows as wide as the block length. Every row uses the same key, so swapping columns ma" +
      "kes all rows readable at once. Selecting two column headers in turn swaps them (with the keyboard, select a he" +
      "ader, press Enter or Space, and move it with ← →).",
    ],
    [
      "元の並びに戻す",
      "Reset the order",
    ],
    [
      "この並びを鍵にする",
      "Use this order as the key",
    ],
    [
      "隣り合う列のつながり（1行あたりの平均。0に近いほど英語らしい）：",
      "Joins between adjacent columns (average per row; closer to 0 is more English-like):",
    ],
    [
      "この並びで読んだ文：",
      "Text read in this order:",
    ],
    [
      "📚 座学：転置式暗号を学ぶ",
      "📚 Learn: transposition ciphers",
    ],
    [
      "🔤 転置式暗号とは",
      "🔤 What is a transposition cipher?",
    ],
    [
      "転置暗号は、",
      "A transposition cipher is a cipher that ",
    ],
    [
      "文字の並び順だけを入れ替える",
      "only changes the order of the characters",
    ],
    [
      "暗号方式です。 文字自体は変化しないため、文字の頻度分布は保存されますが、位置関係が複雑に入れ替わることで解読を困難にし" +
      "ます。",
      ". The characters themselves do not change, so the letter frequencies are preserved, but the positions are mixe" +
      "d up to make the text hard to read.",
    ],
    [
      "🏛️ 歴史的背景",
      "🏛️ History",
    ],
    [
      "紀元前5世紀",
      "5th century BC",
    ],
    [
      "スキュタレー（Scytale）",
      "Scytale",
    ],
    [
      "- 古代スパルタの、棒に革ひもを巻きつけて文字を書く方式。転置式暗号の最も古い例としてよく挙げられる（暗号として使われた" +
      "かには異論もある）。",
      " - A Spartan method of writing on a leather strip wound around a rod. Often cited as the oldest example of a t" +
      "ransposition cipher (whether it was used as a cipher is disputed).",
    ],
    [
      "19世紀〜20世紀前半",
      "19th to early 20th century",
    ],
    [
      "縦列転置式暗号（Columnar Transposition）",
      "Columnar transposition",
    ],
    [
      "- 表に文字を並べ、列の順序を入れ替えて読む方式。第一次世界大戦では二重の縦列転置が使われた。",
      " - Characters are laid out in a table and read with the columns reordered. Double columnar transposition was u" +
      "sed in World War I.",
    ],
    [
      "1970年代～",
      "1970s–",
    ],
    [
      "DESのP-Box",
      "The P-box of DES",
    ],
    [
      "- 現代ブロック暗号における転置操作。ビット単位での順列置換により「拡散（diffusion）」を実現。",
      " - A transposition step in a modern block cipher. Permuting bits provides \"diffusion\".",
    ],
    [
      "2000年代～",
      "2000s–",
    ],
    [
      "AESのShiftRows",
      "ShiftRows of AES",
    ],
    [
      "- 行列の行をシフトする転置操作。S-Box（置換）と組み合わせて強固な暗号化を実現。",
      " - A transposition step that shifts the rows of a matrix. Combined with the S-box (substitution) for strong en" +
      "cryption.",
    ],
    [
      "🔑 転置暗号の基本原理",
      "🔑 Basic principle",
    ],
    [
      "転置暗号は",
      "A transposition cipher uses a ",
    ],
    [
      "順列（permutation）",
      "permutation",
    ],
    [
      "を鍵として使用します。 たとえば、パターン",
      " as its key. For example, the pattern ",
    ],
    [
      "は「1番目の文字を3番目の位置へ、2番目の文字を1番目の位置へ…」という変換ルールを表します。",
      " is the rule \"move the 1st character to the 3rd position, the 2nd character to the 1st position, …\".",
    ],
    [
      "この書き方を本ツールでは",
      "This tool calls this notation ",
    ],
    [
      "と呼びます。逆に「暗号文のi文字目を平文の何文字目から取るか」を並べる",
      ". The opposite notation lists, for each ciphertext position i, which plaintext position it takes its character" +
      " from: ",
    ],
    [
      "もあり、 同じ並べ替えは",
      ". In that notation the same rearrangement is written ",
    ],
    [
      "と書きます。Stinsonの教科書『Cryptography: Theory and Practice』やdCodeは取" +
      "り出す向き、CrypTool 2は送る向きで、 資料によって違います。鍵の数字だけを渡すと、受け取った側が逆に読んで別の" +
      "暗号文になることがあります（Gaines『Elementary Cryptanalysis』1939も両方の使い方を挙げ" +
      "ています）。 鍵生成タブの切り替えで、どちらの書き方でも入力・表示できます。",
      ". Stinson's textbook \"Cryptography: Theory and Practice\" and dCode use gather notation, while CrypTool 2 uses " +
      "scatter notation; sources differ. If you pass on only the digits of a key, the receiver may read them the othe" +
      "r way and get a different ciphertext (Gaines' \"Elementary Cryptanalysis\", 1939, also gives both uses). The swi" +
      "tch in the Key tab lets you enter and display keys in either notation.",
    ],
    [
      "具体例：パターン3-1-4-2",
      "Example: pattern 3-1-4-2",
    ],
    [
      "元の位置",
      "Original position",
    ],
    [
      "結果：",
      "Result:",
    ],
    [
      "🔄 ブロック処理とパディング",
      "🔄 Blocks and padding",
    ],
    [
      "本ツールは",
      "This tool follows the idea of a ",
    ],
    [
      "ブロック暗号",
      "block cipher",
    ],
    [
      "の考え方を採用しています。 パターン長（= ブロックサイズ）ごとにテキストを分割し、各ブロックに対して独立に転置を適用し" +
      "ます。",
      ". The text is split into blocks of the pattern length (= block size), and the permutation is applied to each b" +
      "lock independently.",
    ],
    [
      "✅ パディング有効時",
      "✅ With padding",
    ],
    [
      "入力:",
      "Input:",
    ],
    [
      "(6文字)、パターン長: 4",
      "(6 characters), pattern length: 4",
    ],
    [
      "ブロック1:",
      "Block 1:",
    ],
    [
      "→ 転置 →",
      "→ transpose →",
    ],
    [
      "ブロック2:",
      "Block 2:",
    ],
    [
      "→ パディング →",
      "→ pad →",
    ],
    [
      "→ 転置",
      "→ transpose",
    ],
    [
      "最後のブロックも完全な長さになるため、すべてのブロックで転置が適用されます。",
      "The last block also reaches full length, so every block is transposed.",
    ],
    [
      "❌ パディング無効時",
      "❌ Without padding",
    ],
    [
      "そのまま",
      "unchanged",
    ],
    [
      "不足ブロックは転置されずに残ります。",
      "The short block stays untransposed.",
    ],
    [
      "埋字と平文の末尾の文字は、暗号文からは見分けられません。たとえば",
      "Padding cannot be told apart from plaintext that ends with the same character. For example, encrypting ",
    ],
    [
      "を埋字Xで暗号化すると",
      " with padding X gives ",
    ],
    [
      "になり、 復号で末尾のXを除くと",
      ", and removing the trailing X letters on decryption cuts it down to ",
    ],
    [
      "まで削れてしまいます。平文の末尾が埋字と同じ文字なら、本ツールは暗号化のときに知らせます。埋字を別の文字（Qなど）にする" +
      "と避けられます。",
      ". This tool warns at encryption time when the plaintext ends with the padding character. Using a different pad" +
      "ding character (such as Q) avoids it.",
    ],
    [
      "🔐 置換暗号との違い",
      "🔐 Compared with substitution ciphers",
    ],
    [
      "項目",
      "Aspect",
    ],
    [
      "転置暗号（Transposition）",
      "Transposition",
    ],
    [
      "置換暗号（Substitution）",
      "Substitution",
    ],
    [
      "変換対象",
      "What changes",
    ],
    [
      "文字の位置",
      "Positions of characters",
    ],
    [
      "文字そのもの",
      "The characters themselves",
    ],
    [
      "頻度分布",
      "Frequency distribution",
    ],
    [
      "保存される",
      "Preserved",
    ],
    [
      "単一換字は形が保たれ文字だけが入れ替わる。多表式は平らに近づく",
      "Simple substitution keeps its shape and only relabels the letters; polyalphabetic ciphers flatten it",
    ],
    [
      "例",
      "Example",
    ],
    [
      "解読への耐性",
      "Resistance to attack",
    ],
    [
      "アナグラム解析、既知平文攻撃に弱い",
      "Weak against anagramming and known-plaintext attacks",
    ],
    [
      "頻度分析に弱い（単一換字）",
      "Weak against frequency analysis (simple substitution)",
    ],
    [
      "現代暗号での役割",
      "Role in modern ciphers",
    ],
    [
      "拡散（diffusion）",
      "Diffusion",
    ],
    [
      "混乱（confusion）",
      "Confusion",
    ],
    [
      "⚡ 転置暗号の強度と弱点",
      "⚡ Strengths and weaknesses",
    ],
    [
      "💪 強み",
      "💪 Strengths",
    ],
    [
      "実装が単純で高速",
      "Simple and fast to implement",
    ],
    [
      "ブロックの長さnに対して鍵はn!通り（n=16で約2",
      "There are n! keys for block length n (n=16: about 2",
    ],
    [
      "、n=20で約2",
      ", n=20: about 2",
    ],
    [
      "置換暗号と組み合わせることで強固になる",
      "Stronger when combined with substitution",
    ],
    [
      "⚠️ 弱点",
      "⚠️ Weaknesses",
    ],
    [
      "文字の頻度分布が変化しないため、アナグラム解析が可能",
      "Letter frequencies do not change, so anagramming is possible",
    ],
    [
      "短いブロックでは総当たり攻撃が容易",
      "Short blocks are easy to brute-force",
    ],
    [
      "既知平文攻撃に対して脆弱（平文と暗号文の1ブロックで、同じ文字がなければ鍵が1つに決まる）",
      "Weak against known-plaintext attacks (one block of plaintext and ciphertext determines the key if no character" +
      " repeats)",
    ],
    [
      "どのブロックも同じ鍵なので、ブロックを縦に並べて列を並べ替える方法（多重アナグラム）で、鍵を知らなくても解読が可能（鍵の" +
      "数が多くても安全とは限らない）",
      "Every block uses the same key, so stacking the blocks and reordering the columns (multiple anagramming) breaks" +
      " it without the key (many possible keys do not mean security)",
    ],
    [
      "単独では現代の暗号として不十分",
      "Not sufficient as a modern cipher on its own",
    ],
    [
      "🎓 教育的価値",
      "🎓 Educational value",
    ],
    [
      "順列の概念",
      "The idea of a permutation",
    ],
    [
      "- 数学的な順列（n!）を暗号の文脈で理解できる",
      " - understand mathematical permutations (n!) in the context of ciphers",
    ],
    [
      "逆写像の理解",
      "Inverse mappings",
    ],
    [
      "- 転置パターンの逆順列を計算することで復号が可能になる",
      " - decryption works by computing the inverse of the permutation",
    ],
    [
      "ブロック暗号の基礎",
      "Basics of block ciphers",
    ],
    [
      "- 固定長ブロックごとに処理する考え方を体験できる",
      " - experience processing text in fixed-length blocks",
    ],
    [
      "拡散の原理",
      "Diffusion",
    ],
    [
      "- シャノンの「拡散（diffusion）」概念の具体例",
      " - a concrete example of Shannon's \"diffusion\"",
    ],
    [
      "暗号強度の評価",
      "Judging cipher strength",
    ],
    [
      "- 鍵空間、既知平文攻撃、頻度分析などの考え方を学べる",
      " - learn about key space, known-plaintext attacks and frequency analysis",
    ],
    [
      "🔗 関連する暗号技術",
      "🔗 Related techniques",
    ],
    [
      "レールフェンス暗号",
      "Rail fence cipher",
    ],
    [
      "ジグザグ状に文字を配置して読み取る転置暗号の一種。長さを決めれば1つの順列で書ける。",
      "A transposition cipher that lays the characters out in a zigzag and reads them off. With a fixed length it is " +
      "a single permutation.",
    ],
    [
      "RailFence CipherLab（Day034）",
      "RailFence CipherLab (Day034)",
    ],
    [
      "縦列転置式暗号（カラムナー暗号）",
      "Columnar transposition",
    ],
    [
      "表を使った転置暗号。列の順序を鍵で制御する。暗号文の長さを決めれば1つの順列で書ける。",
      "A transposition cipher using a table, with the column order controlled by the key. With a fixed ciphertext len" +
      "gth it is a single permutation.",
    ],
    [
      "Columnar CipherLab（Day043）",
      "Columnar CipherLab (Day043)",
    ],
    [
      "ADFGVX暗号",
      "ADFGVX cipher",
    ],
    [
      "第一次世界大戦でドイツ軍が使用。置換と転置を組み合わせた暗号。",
      "Used by the German army in World War I. Combines substitution and transposition.",
    ],
    [
      "DES（Data Encryption Standard）",
      "DES (Data Encryption Standard)",
    ],
    [
      "P-Boxで転置、S-Boxで置換を行う現代ブロック暗号。",
      "A modern block cipher that transposes with P-boxes and substitutes with S-boxes.",
    ],
    [
      "ToySPN Builder（Day094）",
      "ToySPN Builder (Day094)",
    ],
    [
      "📖 参考文献・学習リソース",
      "📖 References",
    ],
    [
      "Simon Singh『暗号解読』（新潮社） - 古典暗号から現代暗号までの歴史",
      "Simon Singh, \"The Code Book\" - a history from classical to modern cryptography",
    ],
    [
      "Douglas R. Stinson \"Cryptography: Theory and Practice\" - 転置式" +
      "暗号（Permutation Cipher）を取り出す向きの式で定義し、ヒル暗号の特別な場合として扱う",
      "Douglas R. Stinson, \"Cryptography: Theory and Practice\" - defines the permutation cipher with the gather formu" +
      "la and treats it as a special case of the Hill cipher",
    ],
    [
      "Helen Fouché Gaines \"Elementary Cryptanalysis\" (1939) - 同じ鍵の" +
      "2通りの使い方と、ブロックを縦に並べて解く多重アナグラム（Project Gutenberg #75074）",
      "Helen Fouché Gaines, \"Elementary Cryptanalysis\" (1939) - the two uses of one key, and multiple anagramming of " +
      "stacked blocks (Project Gutenberg #75074)",
    ],
    [
      "C.E. Shannon \"Communication Theory of Secrecy Systems\" (1949" +
      ") - 拡散と混乱の理論的基礎",
      "C. E. Shannon, \"Communication Theory of Secrecy Systems\" (1949) - the theoretical basis of diffusion and confu" +
      "sion",
    ],
    [
      "Bruce Schneier『暗号技術大全』- 実践的な暗号アルゴリズムの解説",
      "Bruce Schneier, \"Applied Cryptography\" - practical cryptographic algorithms",
    ],
    [
      "CrypTool - インタラクティブな暗号学習ツール（オープンソース）",
      "CrypTool - interactive tools for learning cryptography (open source)",
    ],
    [
      "GitHubリポジトリ：ipusiron/permutation-cipherlab",
      "GitHub repository: ipusiron/permutation-cipherlab",
    ],
  ];

  const UI_EN = Object.fromEntries(PAIRS);
  if (typeof module !== 'undefined' && module.exports) module.exports = UI_EN;
  else root.PclUiEn = UI_EN;
})(typeof globalThis !== 'undefined' ? globalThis : this);
