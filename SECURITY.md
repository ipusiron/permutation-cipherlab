# セキュリティ設定ガイド

Permutation CipherLabは、ブラウザーの中だけで動く静的なWebアプリケーションです。入力した文字や鍵をサーバーへ送らず、外部のスクリプト・フォント・CDNも読みません。

## ページの中で行っている対策

- XSS対策：利用者の文字列（平文・暗号文・保存名・埋字）は`textContent`、`value`、SVGの`text`要素で表示し、HTMLとして解釈しない。
- CSP：`index.html`の`<meta http-equiv="Content-Security-Policy">`で次を指定する。
  - `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'`
  - インラインのスクリプト、イベント属性（`onclick`など）、`style`属性を使わない。`test/html.test.js`で検証する。
- 乱数：鍵の生成に`crypto.getRandomValues`を使い、剰余の偏りを棄却して除く。使えない環境ではランダム生成を止め、`Math.random`に切り替えない。
- 保存データ：`localStorage`から読み込む鍵は形を検証し、壊れた項目は読み飛ばす。
- リンク：外部リンクに`rel="noopener noreferrer"`を付け、ページの`referrer`は`no-referrer`にする。
- 受け取り：ほかのツールから`#text=`（従来の`?text=`も）で暗号文を受け取ると、入力欄に入れたあと`history.replaceState`でURLから消す。10,000文字を超える分は切る。`#`より後ろはサーバーへ送られない。ブラウザーの閲覧履歴には最初のURLが残る。
- 言語の選択：`localStorage`の`pcl_lang`に`ja`か`en`だけを保存する。

## `<meta>`では設定できないヘッダー

GitHub PagesではHTTPレスポンスヘッダーを変えられません。次の指定は`<meta>`に書いてもブラウザーが従わないため、`index.html`には書いていません。

- `frame-ancestors`（CSPの一部でも、`<meta>`で指定したものはブラウザーが無視する）
- `X-Frame-Options`
- `X-Content-Type-Options`

別のホスティングでヘッダーを設定できる場合は、次を推奨します。

### Cloudflareなどで配信する場合

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
```

### Netlifyで配信する場合

リポジトリのルートに、次の`_headers`ファイルを置きます。

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
```

`X-XSS-Protection`は現在のブラウザーでは使われておらず、古いブラウザーではかえって問題を起こすことがあるため、設定しません。

## 利用上の注意

- 転置式暗号は現代の基準では安全ではありません。実際の秘密の保護には使わないでください。
- `localStorage`に保存した鍵は、同じブラウザーを使う人なら読めます。秘密の鍵は保存しないでください。

## 脆弱性の報告

セキュリティ上の問題を見つけた場合は、次の方法で報告してください。

1. GitHub Issuesで**Security**ラベルを付けて報告する。
2. または、リポジトリの所有者に直接連絡する。

修正する時間を確保するため、修正の公開まで脆弱性の詳細を公開しないでください。
