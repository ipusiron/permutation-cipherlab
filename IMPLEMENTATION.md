# 実装詳細ドキュメント（開発者向け）

本ドキュメントでは、Permutation CipherLab の技巧的な実装、コアロジック、工夫した部分を解説します。

---

## 📋 目次

1. [コアアルゴリズム](#コアアルゴリズム)
2. [順列パターンの検証](#順列パターンの検証)
3. [逆転置の計算](#逆転置の計算)
4. [ブロック暗号化処理](#ブロック暗号化処理)
5. [ビジュアル編集機能](#ビジュアル編集機能)
6. [ブロック間ナビゲーション](#ブロック間ナビゲーション)
7. [アニメーション機能](#アニメーション機能)
8. [セキュリティ対策](#セキュリティ対策)
9. [localStorage 管理](#localstorage-管理)

---

## コアアルゴリズム

### Fisher-Yates シャッフル

ランダムな順列生成には、**Fisher-Yates アルゴリズム** を採用しています。

**実装箇所**: `script.js:266-274`

```javascript
function generateRandomPermutation(n){
  const arr = Array.from({length:n}, (_,i)=>i+1);
  // Fisher-Yates shuffle
  for(let i=n-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

**特徴**:
- **一様分布**: すべての順列が等確率で生成される（n! 通りすべて）
- **時間計算量**: O(n)
- **in-place**: 追加のメモリを消費しない

**数学的保証**:
- ループ不変条件: i ステップ目で配列の `[i+1, n)` は確定済みの順列
- 各 i について j ∈ [0, i] から一様ランダムに選択することで、全順列が等確率で生成される

---

## 順列パターンの検証

### 多段階検証システム

ユーザー入力されたパターンを厳密に検証し、不正な入力を明確なエラーメッセージで排除します。

**実装箇所**: `script.js:94-164`

#### 1. パース段階（`parsePattern`）

複数区切り文字に対応した柔軟なパース処理:

```javascript
const parts = trimmed.split(/[\s,\-，、]+/).filter(Boolean);
```

**対応する区切り文字**:
- ハイフン: `-`
- スペース: ` `
- カンマ: `,`
- 全角カンマ: `，`
- 読点: `、`

**エッジケース対応**:
```javascript
// 末尾の区切り文字を検出して拒否（例: "1-2-3-"）
if(/[\s,\-，、]$/.test(trimmed)){
  return null;
}
```

#### 2. 検証段階（`validatePermutation`）

**検証項目**:

| 検証 | 説明 | エラー例 |
|------|------|---------|
| 長さチェック | 2文字以上必須 | `[1]` → エラー |
| 正整数チェック | 1以上の整数のみ | `[0, 1, 2]` → エラー |
| 範囲チェック | 1〜n の値のみ許可 | `[1, 2, 5]` (n=3) → 「5 は範囲外」 |
| 重複検出 | 同じ値の重複を禁止 | `[1, 2, 2, 3]` → 「2 が重複」 |
| 欠損検出 | 1〜n すべてが必要 | `[1, 3, 4]` (n=3) → 「2 が不足」 |

**実装のポイント**:

```javascript
// 重複検出: Set のサイズで判定
const set = new Set(perm);
if(set.size !== n) {
  const duplicates = perm.filter((val, idx) => perm.indexOf(val) !== idx);
  return {ok:false, msg:`重複があります: ${[...new Set(duplicates)].join(', ')}`};
}

// 欠損検出: 1〜n を走査
const missing = [];
for(let i=1; i<=n; i++){
  if(!set.has(i)) missing.push(i);
}
```

**UX への配慮**:
- エラーメッセージに具体的な値を含める（「5 が範囲外」「2 が重複」）
- 複数のエラーがある場合も、最初に検出したものから順に報告

---

## 逆転置の計算

### 逆写像の高速計算

順列 `perm` に対して、その逆順列 `inv` を O(n) で計算します。

**実装箇所**: `script.js:172-178`

```javascript
function inversePermutation(perm){
  const inv = new Array(perm.length);
  // perm[i] = j (1-based) means position i -> j
  // inverse: inv[j-1] = i+1
  perm.forEach((j, i)=> inv[j-1] = i+1);
  return inv;
}
```

**数学的原理**:

順列 σ: [1..n] → [1..n] に対して、逆順列 σ⁻¹ は以下を満たす:

```
σ(i) = j  ⇔  σ⁻¹(j) = i
```

**具体例**:

```javascript
perm = [3, 1, 4, 2]  // σ(1)=3, σ(2)=1, σ(3)=4, σ(4)=2
inv  = [2, 4, 1, 3]  // σ⁻¹(1)=2, σ⁻¹(2)=4, σ⁻¹(3)=1, σ⁻¹(4)=3
```

**検証**:
```
σ(1)=3, σ⁻¹(3)=1 ✓
σ(2)=1, σ⁻¹(1)=2 ✓
σ(3)=4, σ⁻¹(4)=3 ✓
σ(4)=2, σ⁻¹(2)=4 ✓
```

**暗号化・復号化の関係**:
- 暗号化: `ciphertext = applyPermutation(plaintext, perm)`
- 復号化: `plaintext = applyPermutation(ciphertext, inv)`

---

## ブロック暗号化処理

### ブロック分割とパディング

**実装箇所**: `script.js:186-237`

#### チャンキング処理

```javascript
function chunkBy(str, size){
  const chunks = [];
  for(let i=0;i<str.length;i+=size){
    chunks.push(str.slice(i, i+size));
  }
  return chunks;
}
```

- 固定サイズでの分割
- 最後のブロックが短くなる場合あり → パディング処理へ

#### ブロック単位の転置

```javascript
function applyPermutationToBlock(block, perm, padChar, padEnable){
  const n = perm.length;
  let b = block;

  // パディング処理
  if(block.length < n){
    if(padEnable && padChar){
      b = block + padChar.repeat(n - block.length);
    }else{
      return block;  // パディング無効時はそのまま返す
    }
  }

  // 転置実行
  const out = new Array(n);
  for(let i=0;i<n;i++){
    const from = i;          // 0-based index
    const to = perm[i]-1;    // 0-based destination
    out[to] = b[from];
  }
  return out.join('');
}
```

**工夫点**:

1. **パディングの柔軟性**: ユーザーがON/OFF切り替え可能
2. **不完全ブロックの扱い**: パディングなしの場合は変換せずそのまま返す
3. **0-based/1-based の変換**: パターンは1-based、配列アクセスは0-based

#### パディング除去

```javascript
function trimRightPad(str, padChar){
  if(!padChar) return str;
  let i = str.length-1;
  while(i>=0 && str[i]===padChar) i--;
  return str.slice(0, i+1);
}
```

**注意事項**:
- 末尾のパディング文字をすべて削除
- ⚠️ **制限**: 元の平文末尾にパディング文字と同じ文字があった場合も削除される
- これは古典的な転置暗号の既知の制限（README に明記）

---

## ビジュアル編集機能

### ドラッグ&ドロップによる直感的編集

**実装箇所**: `script.js:900-1030`

#### HTML5 Drag and Drop API の活用

```javascript
visualEl.addEventListener('dragstart', (e)=>{
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', i);
  visualEl.classList.add('dragging');
});

visualEl.addEventListener('drop', (e)=>{
  e.preventDefault();
  const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
  const toIndex = i;

  // スワップ
  [visualPattern[fromIndex], visualPattern[toIndex]] =
    [visualPattern[toIndex], visualPattern[fromIndex]];

  renderVisualPattern();
});
```

**技術的ポイント**:

1. **データ転送**: `dataTransfer` でドラッグ元のインデックスを伝播
2. **視覚フィードバック**: CSS クラス `dragging` で透明度変更
3. **スワップ操作**: 配列の分割代入で要素交換
4. **即時反映**: ドロップ後即座に再描画

#### リセット機能

```javascript
visualEls.reset.addEventListener('click', ()=>{
  visualPattern = Array.from({length: visualPattern.length}, (_, i) => i+1);
  renderVisualPattern();
  showToast('パターンを初期状態（1-2-3-...）にリセットしました');
});
```

恒等順列 `[1, 2, 3, ...]` に戻す機能。

---

## ブロック間ナビゲーション

### マルチブロック可視化システム

暗号化時に複数ブロックがある場合、左右矢印で個別ブロックの変換を確認できます。

**実装箇所**: `script.js:591-656`

#### 状態管理

```javascript
let encryptBlocks = { input: [], output: [] };  // 入力・出力ブロック配列
let encryptCurrentBlock = 0;                     // 現在表示中のブロックインデックス
```

#### ナビゲーション更新

```javascript
function updateEncryptBlockNav(){
  const totalBlocks = encryptBlocks.input.length;

  // インジケーター更新
  encryptEls.blockIndicator.textContent =
    totalBlocks > 0 ? `ブロック ${encryptCurrentBlock + 1} / ${totalBlocks}` : 'ブロック 1';

  // ボタンの有効/無効制御
  encryptEls.blockPrev.disabled = encryptCurrentBlock <= 0;
  encryptEls.blockNext.disabled = encryptCurrentBlock >= totalBlocks - 1 || totalBlocks === 0;

  // 対応表の描画
  if(totalBlocks > 0){
    const blockIn = encryptBlocks.input[encryptCurrentBlock] || '';
    const blockOut = encryptBlocks.output[encryptCurrentBlock] || '';
    renderMapTable(encryptEls.mapBody, blockIn, blockOut, 'forward');
  }
}
```

**UX 設計**:
- 先頭ブロックで「◀ 前のブロック」が無効化
- 最終ブロックで「次のブロック ▶」が無効化
- 「ブロック 2 / 5」形式のインジケーターで現在位置を明示

#### イベントハンドラー

```javascript
encryptEls.blockPrev.addEventListener('click', ()=>{
  if(encryptCurrentBlock > 0){
    encryptCurrentBlock--;
    updateEncryptBlockNav();
  }
});

encryptEls.blockNext.addEventListener('click', ()=>{
  if(encryptCurrentBlock < encryptBlocks.input.length - 1){
    encryptCurrentBlock++;
    updateEncryptBlockNav();
  }
});
```

---

## アニメーション機能

### ステップバイステップ転置デモ

**実装箇所**: `script.js:680-780`

#### 遅延レンダリングによるアニメーション

```javascript
function runAnimation(){
  const input = encryptEls.animInput.value.trim();
  if(!input){
    showToast('アニメーション用の文字列を入力してください', 'danger');
    return;
  }
  if(!currentKey){
    showToast('鍵が設定されていません', 'danger');
    return;
  }

  const n = currentKey.length;
  const blocks = chunkBy(input, n);
  const tbody = encryptEls.animBody;
  tbody.innerHTML = '';

  let blockIndex = 0;

  // 1ブロックずつアニメーション
  const processBlock = ()=>{
    if(blockIndex >= blocks.length){
      encryptEls.animStatus.textContent = 'アニメーション完了';
      encryptEls.animStop.disabled = true;
      return;
    }

    const block = blocks[blockIndex];
    const paddedBlock = block.length < n ? block + '?'.repeat(n - block.length) : block;
    const output = applyPermutationToBlock(block, currentKey, '?', true);

    // 行を追加（XSS対策: textContent使用）
    for(let i=0; i<n; i++){
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = String(i+1);
      const td2 = document.createElement('td');
      td2.textContent = paddedBlock[i] || '';
      const td3 = document.createElement('td');
      td3.textContent = '';
      tr.append(td1, td2, td3);
      tbody.appendChild(tr);
    }

    // 1文字ずつ遅延描画
    let charIndex = 0;
    const interval = setInterval(()=>{
      if(charIndex >= n){
        clearInterval(interval);
        blockIndex++;
        setTimeout(processBlock, 300);  // 次のブロックへ
        return;
      }

      const targetPos = currentKey[charIndex] - 1;
      const rows = tbody.querySelectorAll('tr');
      const targetRow = rows[charIndex];
      if(targetRow){
        const outputCell = targetRow.querySelector('td:nth-child(3)');
        if(outputCell) outputCell.textContent = output[targetPos] || '';
      }
      charIndex++;
    }, 200);  // 200ms間隔
  };

  processBlock();
}
```

**技術的工夫**:

1. **setTimeout/setInterval の組み合わせ**: ブロック間は300ms、文字間は200msの遅延
2. **XSS対策**: `textContent` を使用（`innerHTML` は使わない）
3. **停止機能**: グローバルタイマーIDを保持し、`clearInterval` で中断可能
4. **ステータス表示**: 「アニメーション中...」「完了」でフィードバック

---

## セキュリティ対策

### XSS (Cross-Site Scripting) 防止

**実装方針**: ユーザー入力を DOM に挿入する際は、**常に `textContent` を使用**し、`innerHTML` を避ける。

#### 脆弱な実装例（修正前）

```javascript
// ❌ 危険: ユーザー入力を innerHTML に直接挿入
tr.innerHTML = `<td>${i+1}</td><td>${first[i]}</td><td></td>`;
```

**攻撃シナリオ**:
```
ユーザー入力: <img src=x onerror=alert('XSS')>
→ ブラウザーが実行してしまう
```

#### 安全な実装（修正後）

**実装箇所**: `script.js:701-714`

```javascript
// ✅ 安全: DOM API で要素を作成
const tr = document.createElement('tr');
const td1 = document.createElement('td');
td1.textContent = String(i+1);  // textContent は自動エスケープ
const td2 = document.createElement('td');
td2.textContent = first[i] || '';
const td3 = document.createElement('td');
td3.textContent = '';
tr.append(td1, td2, td3);
tbody.appendChild(tr);
```

**ポイント**:
- `textContent` は文字列をそのままテキストノードとして挿入
- HTML タグとして解釈されない
- ブラウザーが自動的にエスケープ

---

## localStorage 管理

### パターン保存機能

**実装箇所**: `script.js:331-360`

#### 保存データ構造

```javascript
[
  { name: "シーザーシフト風", pattern: [2,3,4,1] },
  { name: "逆順", pattern: [4,3,2,1] },
  ...
]
```

#### エラーハンドリング強化

```javascript
function loadSaved(){
  try{
    const data = localStorage.getItem(STORAGE_KEY);
    if(!data) return [];
    const parsed = JSON.parse(data);
    if(!Array.isArray(parsed)) return [];
    return parsed;
  }catch(e){
    console.error('Failed to load saved patterns:', e);
    return [];  // 読み込み失敗時は空配列を返す
  }
}

function saveSaved(list){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }catch(e){
    console.error('Failed to save patterns:', e);
    showToast('保存に失敗しました（容量制限の可能性）', 'danger');
  }
}
```

**対応するエラーケース**:
- **QuotaExceededError**: localStorage の容量上限（通常5-10MB）
- **JSON.parse エラー**: 破損したデータ
- **プライベートモード**: 一部ブラウザーで localStorage が無効

#### プリセットパターン

**実装箇所**: `script.js:362-372`

```javascript
const presetPatterns = [
  { name: '逆順 (n=4)', pattern: [4,3,2,1] },
  { name: 'ローテーション (n=5)', pattern: [5,1,2,3,4] },
  { name: 'ペア交換 (n=6)', pattern: [2,1,4,3,6,5] },
  { name: 'ランダム例 (n=8)', pattern: [3,7,1,5,8,2,6,4] }
];
```

初心者向けに、典型的な順列パターンを提供。

---

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | なし（Vanilla JavaScript） |
| DOM操作 | 標準 DOM API |
| イベント処理 | addEventListener |
| ストレージ | localStorage API |
| スタイリング | CSS3（カスタムプロパティ、Flexbox、Grid） |
| ドラッグ&ドロップ | HTML5 Drag and Drop API |

**フレームワークレスの利点**:
- 依存関係なし
- 軽量（script.js は約1200行）
- 学習教材として理解しやすい

---

## パフォーマンス最適化

### 計算量

| 処理 | 計算量 | 備考 |
|------|--------|------|
| 順列生成（Fisher-Yates） | O(n) | n = パターン長 |
| 逆順列計算 | O(n) | 1回の走査 |
| パターン検証 | O(n) | Set 使用で重複検出 |
| ブロック暗号化 | O(m·n) | m = ブロック数, n = ブロック長 |
| 可視化レンダリング | O(n²) | SVG矢印の生成 |

### メモリ効率

- **in-place シャッフル**: Fisher-Yates は追加配列を使わない
- **チャンキング**: ブロックごとに処理し、全文を一度にメモリに保持しない
- **localStorage**: 保存パターン数を実質無制限（ブラウザー容量まで）

---

## 今後の拡張案

1. **WebWorker 対応**: 大きなファイルの暗号化を非同期処理
2. **列転置暗号モード**: 文字列鍵から順列を生成する機能
3. **二重転置ワンクリック**: 2回適用を自動化
4. **統計分析**: 暗号文の文字分布グラフ表示
5. **ファイル入出力**: テキストファイルの直接読み込み/保存

---

## 参考文献

- **Fisher-Yates Shuffle**: Knuth, Donald E. "The Art of Computer Programming, Volume 2: Seminumerical Algorithms" (1969)
- **Transposition Cipher**: Singh, Simon. "The Code Book: The Science of Secrecy from Ancient Egypt to Quantum Cryptography" (1999)
- **XSS Prevention**: OWASP XSS Prevention Cheat Sheet
- **HTML5 Drag and Drop**: MDN Web Docs - Drag and Drop API

---

## ライセンス

本プロジェクトのソースコードは教育目的で公開されています。詳細は [README.md](README.md) を参照してください。
