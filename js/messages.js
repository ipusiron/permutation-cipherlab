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
    // 鍵の性質
    'prop.identity': '恒等（どの文字も動かない）',
    'prop.order': '{n}回',
    'prop.none': 'なし',
    'prop.fixedList': '{list}（{count}カ所）',
    'prop.yes': 'はい',
    'prop.no': 'いいえ',
    'prop.keyspace': '{n}! = {count}通り（約{bits}ビット）',
    'prop.keyspaceApprox': '{n}! ≒ {count}通り（約{bits}ビット）',
    'prop.repeat': '{seq}（{order}回で元に戻る）',
    'prop.repeatLong': '{seq} → …（{order}回で元に戻る）',
    'prop.matrixTooBig': '置換行列は長さ16までの鍵で表示します（今の鍵は長さ{n}）',
    'prop.matrixCaption': '置換行列（{n}行{n}列）',
    // 変換と合成
    'conv.help.rail-sequential': '文字を1→2→…→r→1…の順にレールへ配り、レールごとに読みます（RailFence CipherLabの方式1）。',
    'conv.help.rail-zigzag': '文字をジグザグにレールへ配り（端で折り返す）、レールごとに読みます（RailFence CipherLabの方式2）。',
    'conv.help.scytale': '行数の表に行方向で書き、列ごとに上から読みます。空きのマスは飛ばします（Scytale Cipher Visualizerと同じ）。',
    'conv.help.columnar': '列数＝鍵の長さの表に行方向で書き、順位の小さい列から上→下に読みます（Columnar CipherLabと同じ。不完全な表も可）。',
    'conv.help.spiral': '行数×列数の表に行方向で書き、左上から時計回りに内側へ読みます。文字数は行数×列数です。',
    'conv.help.reverse': '文字の並びを後ろから読みます。',
    'conv.sampleShort': '試す文は{n}文字以上にしてください（空欄ならA, B, C…を使います）',
    'conv.used': '変換した鍵を設定しました（長さ{n}）',
    'conv.label': '変換した鍵の配線図：{n}本の線',
    'comp.errorA': '鍵A：{msg}',
    'comp.errorB': '鍵B：{msg}',
    'comp.lengthMismatch': '鍵Aと鍵Bの長さをそろえてください（A：{a}、B：{b}）',
    'comp.used': '合成した鍵を設定しました（長さ{n}）',
    // 解読ラボ
    'lab.info': '{n}文字。{model}',
    'lab.model.letters': '英字だけなので、英字だけの2文字統計を使います',
    'lab.model.withSpace': '空白や記号を含むので、空白つきの2文字統計を使います（空白も並べ替えた暗号文を前提にします）',
    'lab.empty': '暗号文を入れてください',
    'lab.tooLong': '暗号文は{max}文字までにしてください（今は{n}文字）',
    'lab.received': '別のツールから暗号文を受け取りました（{n}文字）',
    'lab.receivedCut': '別のツールから受け取った暗号文が長いので、先頭の{max}文字だけを入れました',
    'lab.fromEncrypt': '暗号化タブの暗号文を入れました',
    'kpa.needInput': '暗号文と、わかっている平文を入れてください',
    'kpa.inconsistent': 'ブロック長{n}では、平文と暗号文が合いません（同じ鍵で作った組ではないか、ブロック長が違います）',
    'kpa.unique': '鍵が1つに決まりました：{key}（使ったブロック：{blocks}）',
    'kpa.many': '矛盾しない鍵が{count}通り残ります（使ったブロック：{blocks}）。同じブロックに同じ文字が複数あると、どれがどこへ移ったか決められません。わかっている平文を長くすると絞れます',
    'kpa.example': '例として1つ：{key}',
    'kpa.uncounted': '矛盾しない鍵の1つ：{key}（ブロック長が20を超えるので、数は数えません）',
    'kpa.scanNone': '2〜{max}のどのブロック長でも、平文と暗号文が合いません',
    'kpa.scanHead': '平文と暗号文が合うブロック長：',
    'kpa.scanOne': 'ブロック長{n}：鍵が1つに決まる',
    'kpa.scanCount': 'ブロック長{n}：{count}通り',
    'kpa.scanUncounted': 'ブロック長{n}：20を超えるので数えない',
    'kpa.pick': 'ブロック長{n}で調べる',
    'kpa.used': '既知平文から割り出した鍵を設定しました（長さ{n}）',
    'coa.auto': 'わからない（2〜16を調べる）',
    'coa.running': 'ブロック長{k}を調べています（{k}／{hi}）',
    'coa.done': '{count}通りのブロック長を調べました（{ms}ミリ秒）',
    'coa.doneFixed': 'ブロック長{k}で解きました（{ms}ミリ秒）',
    'coa.samePlain': '（1位と同じ平文）',
    'coa.use': 'この鍵を使う',
    'coa.open': '作業台で開く',
    'coa.used': '解読した鍵を設定しました（長さ{n}）',
    'coa.opened': '作業台に読み込みました（ブロック長{k}）',
    'coa.stale': '暗号文が変わりました。もう一度「解く」を押してください',
    'wb.status': '{rows}行×{k}列（最後の{tail}文字は、並べ替えていない尾として最後の行に置きます）',
    'wb.statusFull': '{rows}行×{k}列',
    'wb.more': '表は先頭の{shown}行だけを表示します（全部で{rows}行）',
    'wb.selected': '列{col}を選びました。入れ替える相手を選ぶか、← →で動かします',
    'wb.swapped': '列{a}と列{b}を入れ替えました',
    'wb.cancelled': '選択を外しました',
    'wb.used': '作業台の並びから鍵を設定しました（長さ{n}）',
    'wb.colLabel': '暗号文の列{col}（{pos}番目に読む）',
    'wb.pair': '{a}→{b}：{score}',
    'wb.tooShort': 'ブロック長{k}で2行以上になる長さの暗号文が必要です',
    'wb.range': '作業台のブロック長は2〜{max}にしてください',
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
