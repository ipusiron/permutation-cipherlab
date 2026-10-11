"""英語の2文字統計（鍵なし解読の採点に使う）を作り、js/english-bigrams.js に書き出す。

学習に使う本文: Project Gutenberg #1342 "Pride and Prejudice"（Jane Austen。米国でパブリックドメイン）
  https://www.gutenberg.org/cache/epub/1342/pg1342.txt を tools/corpus/pg1342.txt に保存して使う
  （リポジトリーには含めない。.gitignore で除外）。ファイル全体の SHA-256 が下の値と一致することを確かめる。

使い方:
  python tools/build-bigrams.py                 # js/english-bigrams.js を書き出す
  python tools/build-bigrams.py --check         # 書き出し済みのファイルと同じかを確かめる

表は2つ:
  WITH_SPACE（28記号）: 0〜25＝A〜Z、26＝空白（改行を含む空白類を1つにまとめる）、27＝その他（数字・句読点・記号）
  LETTERS（26記号）   : 英字だけを残して続けた文（空白や句読点を除く）
値は round(100 * log10((組の回数 + 1) / (1文字目の回数 + 記号の数)))。行＝1文字目、列＝2文字目。
"""
import argparse, hashlib, io, math, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "tools", "corpus", "pg1342.txt")
CORPUS_SHA256 = "3f6bb9d6f78e0293b56acd4714dd68cb7d6d1d293402031ce9d5a216bcaf9d75"
OUT = os.path.join(ROOT, "js", "english-bigrams.js")


def body(path):
    raw = open(path, "rb").read()
    if hashlib.sha256(raw).hexdigest() != CORPUS_SHA256:
        sys.exit("corpus SHA-256 does not match: " + path)
    text = raw.decode("utf-8")
    s = text.index("*** START OF THE PROJECT GUTENBERG EBOOK")
    s = text.index("\n", s) + 1
    e = text.index("*** END OF THE PROJECT GUTENBERG EBOOK")
    return text[s:e]


def codes_with_space(text):
    out, prev_space = [], True
    for ch in text.upper():
        if "A" <= ch <= "Z":
            out.append(ord(ch) - 65)
            prev_space = False
        elif ch.isspace():
            if not prev_space:
                out.append(26)
            prev_space = True
        else:
            out.append(27)
            prev_space = False
    return out


def codes_letters(text):
    return [ord(ch) - 65 for ch in text.upper() if "A" <= ch <= "Z"]


def table(codes, symbols):
    pair = [[0] * symbols for _ in range(symbols)]
    for a, b in zip(codes, codes[1:]):
        pair[a][b] += 1
    out = []
    for a in range(symbols):
        total = sum(pair[a])
        out.append([round(100 * math.log10((pair[a][b] + 1) / (total + symbols))) for b in range(symbols)])
    return out


def rows_js(name, tab):
    lines = [f"  const {name} = ["]
    for row in tab:
        half = (len(row) + 1) // 2
        lines.append("    " + ", ".join(str(v) for v in row[:half]) + ",")
        lines.append("    " + ", ".join(str(v) for v in row[half:]) + ",")
    lines.append("  ];")
    return lines


def render():
    text = body(CORPUS)
    ws = codes_with_space(text)
    lt = codes_letters(text)
    lines = [
        "// 英語の2文字統計（鍵なし解読の採点に使う）。生成物なので手で編集しない（tools/build-bigrams.py で作る）",
        "// 学習: Project Gutenberg #1342 Pride and Prejudice（Jane Austen。米国でパブリックドメイン）の本文",
        f"// 本文のファイル全体の SHA-256: {CORPUS_SHA256}",
        "// WITH_SPACE（28記号）: 0〜25＝A〜Z、26＝空白（空白類を1つにまとめる）、27＝その他（数字・句読点・記号）",
        "// LETTERS（26記号）: 英字だけを残して続けた文",
        "// 値: round(100 * log10((組の回数 + 1) / (1文字目の回数 + 記号の数)))。行＝1文字目、列＝2文字目",
        "(function (root) {",
        "  'use strict';",
        "",
        f"  const WITH_SPACE_COUNT = {len(ws)};",
        f"  const LETTERS_COUNT = {len(lt)};",
    ]
    lines += rows_js("WITH_SPACE", table(ws, 28))
    lines += rows_js("LETTERS", table(lt, 26))
    lines += [
        "",
        "  const api = { WITH_SPACE, LETTERS, WITH_SPACE_COUNT, LETTERS_COUNT };",
        "  if (typeof module !== 'undefined' && module.exports) module.exports = api;",
        "  else root.PclEnglishBigrams = api;",
        "})(typeof globalThis !== 'undefined' ? globalThis : this);",
        "",
    ]
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    js = render()
    if args.check:
        same = io.open(OUT, encoding="utf-8").read() == js
        print("check:", "OK" if same else "DIFFERENT")
        sys.exit(0 if same else 1)
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(js)
    print("written", OUT, len(js), "bytes")


if __name__ == "__main__":
    main()
