/* ============================================================================
 * Permutation CipherLab - 画面の文言（JavaScript が出すもの）
 * ============================================================================
 * 計算部（permutation-core.js）は文言を持たず { key, params } を返す。
 * ここで {name} の形の差し込みを埋めて文にする。
 * ============================================================================ */
(function (root) {
  'use strict';

  const ja = {
    // 鍵の検証（計算部のキー）
    'key.empty': '鍵を入力してください（例：3-1-4-2）',
    'key.format': '鍵は数字を「-」「,」や空白で区切って書きます（例：3-1-4-2）',
    'key.length': '鍵の長さは{min}〜{max}にしてください',
    'key.range': '範囲外の数があります：{values}（1〜{n}を1回ずつ使います）',
    'key.duplicate': '同じ数が2回以上あります：{values}（足りない数：{missing}）',
    // 埋字
    'pad.length': '埋字は1文字にしてください',
    'pad.invisible': '埋字には見える文字を使ってください（空白・制御文字は使えません）',
    // 変換・既知平文・鍵なし解読（計算部のキー）
    'convert.length': '長さは{min}〜{max}にしてください',
    'convert.rails': 'レール数は2〜{max}にしてください',
    'convert.rows': '行数は2〜{max}にしてください',
    'convert.keyword': 'キーワードは英字{min}〜{max}文字にしてください',
    'convert.columns': '列数は文の長さより少なくしてください（{max}列まで）',
    'convert.grid': '行数と列数は2以上にしてください',
    'kpa.tooShort': '平文と暗号文が{n}文字（1ブロック）に足りません',
    'solve.k': 'ブロック長は{min}〜{max}にしてください',
    'solve.tooLong': '暗号文は{max}文字までにしてください',
    'solve.tooShort': 'ブロック長{k}で2ブロック以上になる長さの暗号文が必要です',
    // 暗号化・復号の注意
    'enc.shortBlockKept': '最後のブロックは{count}文字で{n}文字に足りないため、並べ替えずにそのまま出しています（平文が見えます）',
    'enc.endsWithPad': '平文の末尾が埋字と同じ「{pad}」です。復号で埋字を除くと、この文字も消えます。埋字を別の文字にしてください',
    'dec.shortBlockKept': '最後のブロックは{count}文字で{n}文字に足りないため、並べ替えずにそのまま出しています',
    'dec.trimmed': '末尾の「{pad}」を{count}文字、埋字とみなして除きました（平文の末尾がこの文字だった場合は、除く設定を外してください）',
    // 鍵の表示
    'key.none': '未設定',
    'key.directionTo': '送る向き',
    'key.directionFrom': '取り出す向き',
    'key.blockSize': '{n}文字ごとに並べ替えます',
    'key.lengthValue': '{n}文字',
    'wiring.keyLabel': '配線図：平文の位置から暗号文の位置への線。{list}',
    'wiring.keyLabelLong': '配線図：{n}本の線。対応は「現在の鍵」の数字を参照',
    'wiring.pair': '{from}→{to}',
    'wiring.plain': '平文',
    'wiring.cipher': '暗号文',
    // 並べ替え
    'editor.open': '並べ替えを開く',
    'editor.close': '並べ替えを閉じる',
    'editor.selected': '{value}を選びました。入れ替える相手を選ぶか、←→で動かします',
    'editor.swapped': '{a}と{b}を入れ替えました。鍵は {key}',
    'editor.moved': '{value}を{pos}番目へ動かしました。鍵は {key}',
    'editor.cancelled': '選択を外しました',
    'editor.chipLabel': '{pos}番目：{value}',
    // 保存
    'saved.none': '（保存なし）',
    'saved.delete': '削除：{name}',
    'saved.dropped': '壊れた保存データを{count}件読み飛ばしました',
    'saved.unavailable': 'このブラウザーでは保存領域を使えないため、鍵の保存はできません',
    // トースト
    'toast.random': 'ランダムな鍵を作りました（長さ{n}）',
    'toast.applied': '鍵を設定しました（長さ{n}）',
    'toast.copied': 'コピーしました',
    'toast.copyFailed': 'コピーできませんでした',
    'toast.saved': '鍵を保存しました：{name}',
    'toast.deleted': '削除しました：{name}',
    'toast.loaded': '読み込みました：{name}',
    'toast.saveFailed': '保存できませんでした（保存領域を使えないか、容量が足りません）',
    'toast.nameRequired': '保存名を入力してください',
    'toast.nameTooLong': '保存名は60文字までにしてください',
    'toast.noCrypto': 'このブラウザーでは暗号用の乱数を使えないため、ランダム生成はできません',
    'toast.example': '例文を入れました',
    'toast.sentToDecrypt': '暗号文と埋字の設定を復号タブに送りました',
    'toast.noCiphertext': '暗号文がありません',
    // ブロックの表示
    'block.indicator': 'ブロック {index} / {total}',
    'block.empty': 'ブロックなし',
    'block.padNote': 'このブロックの末尾{count}文字は埋字です',
    'block.keptNote': 'このブロックは短いため並べ替えていません',
    'block.trimNote': 'このブロックの末尾{count}文字は埋字として除きました（下の段は除く前の並び）',
    'step.status': '{n}本中{k}本',
    'step.play': '自動で引く',
    'step.stop': '止める',
    'table.empty': '入力がありません',
  };

  const MESSAGES = { ja };

  function format(lang, key, params) {
    const dict = MESSAGES[lang] || MESSAGES.ja;
    const template = dict[key] ?? MESSAGES.ja[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (m, name) => (params && params[name] !== undefined ? String(params[name]) : m));
  }

  const api = { MESSAGES, format };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PclMessages = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
