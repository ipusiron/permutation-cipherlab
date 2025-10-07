# セキュリティ設定ガイド

## GitHub Pages でのセキュリティヘッダー設定

GitHub Pages は静的ファイルホスティングのため、カスタムHTTPヘッダーの設定が制限されています。

### 推奨される追加セキュリティ対策

#### 1. Cloudflare などの CDN を使用する場合

Cloudflare の Page Rules や Transform Rules で以下のヘッダーを設定：

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
Referrer-Policy: no-referrer-when-downgrade
```

#### 2. Netlify でホストする場合

`_headers` ファイル（リポジトリルートに配置）:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: no-referrer-when-downgrade
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
```

#### 3. GitHub Pages でのベストプラクティス

GitHub Pages では HTTPヘッダーのカスタマイズができないため、以下の対策を実施済み：

- ✅ XSS対策：`textContent` を使用してユーザー入力を安全に挿入
- ✅ クライアントサイド完結：サーバーへのデータ送信なし
- ✅ localStorage のみ使用：機密情報は保存しない設計
- ✅ inline-script なし：外部 script.js ファイルを使用
- ✅ 入力検証：パターン検証ロジックで不正入力を防止

## 脆弱性報告

セキュリティ上の問題を発見した場合は、以下の方法で報告してください：

1. GitHub Issues で **Security** ラベルをつけて報告
2. または、リポジトリオーナーに直接連絡

公開前に修正する時間を与えるため、脆弱性の詳細を公開しないでください。

## セキュリティ更新履歴

### 2025-01-XX (Initial Release)
- XSS対策の実装（innerHTML → textContent）
- localStorage エラーハンドリング強化
- 入力検証ロジックの実装
