/* ============================================================================
 * Permutation CipherLab - Main Script（画面の制御）
 * ============================================================================
 *
 * Educational tool for exploring permutation (transposition) ciphers.
 *
 * - 計算は js/permutation-core.js（PermutationCore）、文言は js/messages.js（PclMessages）、
 *   配線図は js/wiring.js（PclWiring）に置き、このファイルは DOM の操作だけを受け持つ
 * - 状態は state の1か所に持ち、鍵・平文・埋字が変わるたびに結果を計算し直して描き直す
 *   （古い暗号文や表が残らない）
 * - 利用者の文字列は textContent か SVG の text 要素で出す（innerHTML に入れない）
 *
 * ============================================================================ */
(function () {
  'use strict';

  const Core = window.PermutationCore;
  const Wiring = window.PclWiring;
  const Messages = window.PclMessages;

  /* ==========================================================================
   * DOM Helpers
   * ========================================================================== */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ==========================================================================
   * Global State
   * ========================================================================== */
  const STORAGE_KEY = 'pcl_patterns_v1';  // 保存した鍵（送る向きの文字列）
  const STEP_INTERVAL = 450;              // 「自動で引く」の間隔（ミリ秒）

  const state = {
    lang: 'ja',
    direction: 'to',          // 鍵の書き方（to＝送る向き、from＝取り出す向き）
    key: [3, 1, 4, 2],        // 送る向きの配列（1始まり）
    enc: { result: null, block: 0, step: null, timer: null },
    dec: { result: null, block: 0 },
    editorOpen: false,
    editorSelected: null,
    storageOk: true,
  };

  const t = (key, params) => Messages.format(state.lang, key, params);
  const describe = (err) => t(err.key, err.params);

  /* ==========================================================================
   * UI Feedback Functions
   * ========================================================================== */

  /** トースト（aria-live で読み上げる） */
  function showToast(msg, type = '') {
    const el = $('#toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { el.className = 'toast'; }, 1800);
  }

  /** 入力欄のそばのエラー（空文字で隠す） */
  function showInlineError(selector, msg) {
    const el = $(selector);
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function renderNotes(listEl, notes) {
    listEl.replaceChildren();
    for (const note of notes) {
      const li = document.createElement('li');
      li.textContent = describe(note);
      listEl.append(li);
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('toast.copied'), 'success');
    } catch {
      showToast(t('toast.copyFailed'), 'danger');
    }
  }

  /* ==========================================================================
   * Tab Navigation（矢印キー・Home・End でも移る）
   * ========================================================================== */
  const tabs = [...$$('.tab')];

  function activateTab(name, focus = false) {
    for (const tab of tabs) {
      const on = tab.dataset.tab === name;
      tab.classList.toggle('active', on);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    }
    for (const panel of $$('.panel')) panel.classList.toggle('active', panel.id === `panel-${name}`);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      activateTab(tabs[next].dataset.tab, true);
    });
  });

  /* ==========================================================================
   * Key Management（鍵の設定と表示）
   * ========================================================================== */

  /** 鍵を変える。暗号化・復号も計算し直す */
  function setKey(perm) {
    state.key = perm.slice();
    state.enc.block = 0;
    state.dec.block = 0;
    stopPlay();
    state.enc.step = null;
    $('#keygen-length').value = String(perm.length);
    renderKey();
    recompute();
  }

  function keyText(perm = state.key) {
    return Core.formatKey(perm, state.direction);
  }

  function renderKey() {
    const perm = state.key;
    const n = perm.length;
    $('#current-key-text').textContent = keyText();
    $('#key-copy').disabled = false;
    $('#key-to').textContent = Core.formatKey(perm, 'to');
    $('#key-from').textContent = Core.formatKey(perm, 'from');
    $('#key-length').textContent = t('key.lengthValue', { n });

    const dirName = t(state.direction === 'from' ? 'key.directionFrom' : 'key.directionTo');
    for (const el of $$('.key-direction-name')) el.textContent = dirName;
    $('#encrypt-key-display').textContent = keyText();
    $('#decrypt-key-display').textContent = keyText();
    $('#decrypt-inverse-display').textContent = Core.formatKey(Core.inversePermutation(perm), 'to');
    $('#encrypt-block-info').textContent = t('key.blockSize', { n });
    $('#decrypt-block-info').textContent = t('key.blockSize', { n });

    const links = perm.map((to, i) => [i, to - 1]);
    const pairs = links.map(([a, b]) => t('wiring.pair', { from: a + 1, to: b + 1 })).join(', ');
    Wiring.render($('#key-wiring'), {
      n,
      links,
      label: n <= 16 ? t('wiring.keyLabel', { list: pairs }) : t('wiring.keyLabelLong', { n }),
    });
    if (state.editorOpen) renderEditor();
    renderSaved();
  }

  /* ==========================================================================
   * KEY GENERATION TAB
   * ========================================================================== */
  const lengthInput = $('#keygen-length');

  function readLength() {
    const n = Math.max(Core.MIN_LENGTH, Math.min(Core.MAX_LENGTH, Number.parseInt(lengthInput.value, 10) || 4));
    lengthInput.value = String(n);
    return n;
  }

  lengthInput.addEventListener('change', readLength);

  for (const btn of $$('.btn-preset')) {
    btn.addEventListener('click', () => {
      lengthInput.value = btn.dataset.length;
      readLength();
    });
  }

  // 向きの切り替え：鍵そのものは変えず、書き方だけを変える
  for (const radio of $$('input[name="key-direction"]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      const before = state.direction;
      state.direction = radio.value === 'from' ? 'from' : 'to';
      const manual = $('#keygen-manual');
      const parsed = Core.parseKey(manual.value, before);
      if (parsed.ok) manual.value = Core.formatKey(parsed.perm, state.direction);
      showInlineError('#keygen-manual-error', '');
      state.editorSelected = null;
      renderKey();
    });
  }

  $('#keygen-random').addEventListener('click', () => {
    const n = readLength();
    let perm;
    try {
      perm = Core.randomPermutation(n, buf => window.crypto.getRandomValues(buf));
    } catch {
      showToast(t('toast.noCrypto'), 'danger');
      return;
    }
    setKey(perm);
    showToast(t('toast.random', { n }), 'success');
  });

  function applyManual() {
    const res = Core.parseKey($('#keygen-manual').value, state.direction);
    if (!res.ok) {
      showInlineError('#keygen-manual-error', describe(res.error));
      return;
    }
    showInlineError('#keygen-manual-error', '');
    setKey(res.perm);
    showToast(t('toast.applied', { n: res.perm.length }), 'success');
  }

  $('#keygen-validate').addEventListener('click', applyManual);
  $('#keygen-manual').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      applyManual();
    }
  });

  $('#key-copy').addEventListener('click', () => copyText(keyText()));

  /* ========== 並べ替え（タップで2つを入れ替え／キーボード／マウスのドラッグ） ========== */
  const editorList = $('#keygen-draggable');
  const editorStatus = $('#keygen-drag-status');
  let dragFrom = null;

  function editorValues() {
    return Core.toNotation(state.key, state.direction);
  }

  function renderEditor(focusIndex = null) {
    const values = editorValues();
    editorList.replaceChildren();
    values.forEach((value, i) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip-btn';
      btn.textContent = String(value);
      btn.dataset.index = String(i);
      btn.draggable = true;
      btn.setAttribute('aria-pressed', String(state.editorSelected === i));
      btn.setAttribute('aria-label', t('editor.chipLabel', { pos: i + 1, value }));
      li.append(btn);
      editorList.append(li);
    });
    if (focusIndex !== null) editorList.querySelector(`[data-index="${focusIndex}"]`)?.focus();
  }

  function applyValues(values) {
    setKey(Core.fromNotation(values, state.direction));
  }

  function swapChips(a, b) {
    const values = editorValues();
    [values[a], values[b]] = [values[b], values[a]];
    state.editorSelected = null;
    applyValues(values);
    renderEditor(b);
    editorStatus.textContent = t('editor.swapped', { a: values[b], b: values[a], key: keyText() });
  }

  function moveChip(from, to) {
    const values = editorValues();
    [values[from], values[to]] = [values[to], values[from]];
    state.editorSelected = to;
    applyValues(values);
    renderEditor(to);
    editorStatus.textContent = t('editor.moved', { value: values[to], pos: to + 1, key: keyText() });
  }

  const chipIndex = (target) => {
    const btn = target.closest('.chip-btn');
    return btn ? Number(btn.dataset.index) : null;
  };

  editorList.addEventListener('click', (e) => {
    const i = chipIndex(e.target);
    if (i === null) return;
    if (state.editorSelected === null) {
      state.editorSelected = i;
      renderEditor(i);
      editorStatus.textContent = t('editor.selected', { value: editorValues()[i] });
    } else if (state.editorSelected === i) {
      state.editorSelected = null;
      renderEditor(i);
      editorStatus.textContent = t('editor.cancelled');
    } else {
      swapChips(state.editorSelected, i);
    }
  });

  editorList.addEventListener('keydown', (e) => {
    const i = chipIndex(e.target);
    if (i === null) return;
    const n = state.key.length;
    if (e.key === 'Escape' && state.editorSelected !== null) {
      state.editorSelected = null;
      renderEditor(i);
      editorStatus.textContent = t('editor.cancelled');
      return;
    }
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const j = i + delta;
    if (j < 0 || j >= n) return;
    if (state.editorSelected === i) moveChip(i, j);
    else editorList.querySelector(`[data-index="${j}"]`)?.focus();
  });

  editorList.addEventListener('dragstart', (e) => {
    const i = chipIndex(e.target);
    if (i === null) return;
    dragFrom = i;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(i));
  });
  editorList.addEventListener('dragover', (e) => {
    if (dragFrom !== null) e.preventDefault();
  });
  editorList.addEventListener('drop', (e) => {
    e.preventDefault();
    const j = chipIndex(e.target);
    const i = dragFrom;
    dragFrom = null;
    if (i === null || j === null || i === j) return;
    swapChips(i, j);
  });
  editorList.addEventListener('dragend', () => { dragFrom = null; });

  $('#keygen-visual').addEventListener('click', (e) => {
    state.editorOpen = !state.editorOpen;
    state.editorSelected = null;
    $('#keygen-draggable-wrap').hidden = !state.editorOpen;
    e.currentTarget.setAttribute('aria-expanded', String(state.editorOpen));
    e.currentTarget.textContent = t(state.editorOpen ? 'editor.close' : 'editor.open');
    editorStatus.textContent = '';
    if (state.editorOpen) renderEditor();
  });

  /* ==========================================================================
   * localStorage Pattern Management（保存した鍵）
   * ========================================================================== */
  function loadSaved() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      state.storageOk = true;
      if (!raw) return { items: [], dropped: 0 };
      return Core.sanitizeSaved(JSON.parse(raw));
    } catch {
      state.storageOk = false;
      return { items: [], dropped: 0 };
    }
  }

  function writeSaved(items) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      showToast(t('toast.saveFailed'), 'danger');
      return false;
    }
  }

  function renderSaved() {
    const container = $('#key-saved-list');
    const note = $('#key-saved-note');
    const { items, dropped } = loadSaved();
    container.replaceChildren();
    if (!state.storageOk) {
      note.textContent = t('saved.unavailable');
      note.hidden = false;
    } else if (dropped) {
      note.textContent = t('saved.dropped', { count: dropped });
      note.hidden = false;
    } else {
      note.hidden = true;
    }
    if (!items.length) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = t('saved.none');
      container.append(p);
      return;
    }
    for (const item of items) {
      const perm = Core.parseKey(item.pattern, 'to').perm;
      const chip = document.createElement('div');
      chip.className = 'chip';
      const load = document.createElement('button');
      load.type = 'button';
      load.className = 'chip-load';
      load.textContent = item.name;
      load.title = keyText(perm);
      load.addEventListener('click', () => {
        setKey(perm);
        showToast(t('toast.loaded', { name: item.name }), 'success');
      });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'chip-del';
      del.textContent = '✕';
      del.setAttribute('aria-label', t('saved.delete', { name: item.name }));
      del.addEventListener('click', () => {
        const rest = loadSaved().items.filter(x => x.name !== item.name);
        if (writeSaved(rest)) showToast(t('toast.deleted', { name: item.name }), 'danger');
        renderSaved();
      });
      chip.append(load, del);
      container.append(chip);
    }
  }

  $('#key-save').addEventListener('click', () => {
    const name = $('#key-save-name').value.trim();
    if (!name) { showToast(t('toast.nameRequired'), 'danger'); return; }
    if (name.length > 60) { showToast(t('toast.nameTooLong'), 'danger'); return; }
    const items = loadSaved().items;
    if (!state.storageOk) { showToast(t('saved.unavailable'), 'danger'); return; }
    const pattern = Core.formatKey(state.key, 'to');
    const existing = items.find(x => x.name === name);
    if (existing) existing.pattern = pattern;
    else items.push({ name, pattern });
    if (writeSaved(items)) showToast(t('toast.saved', { name }), 'success');
    renderSaved();
  });

  /* ==========================================================================
   * ENCRYPTION / DECRYPTION（入力が変わるたびに計算し直す）
   * ========================================================================== */
  function readPad(prefix) {
    const res = Core.validatePadChar($(`#${prefix}-pad-char`).value);
    showInlineError(`#${prefix}-pad-error`, res.ok ? '' : describe(res.error));
    return res;
  }

  function recompute() {
    computeEncrypt();
    computeDecrypt();
  }

  function computeEncrypt() {
    const pad = readPad('encrypt');
    if (!pad.ok) {
      state.enc.result = null;
      $('#encrypt-output').value = '';
      renderNotes($('#encrypt-notes'), []);
    } else {
      const res = Core.encrypt($('#encrypt-input').value, state.key, {
        pad: $('#encrypt-pad-enable').checked,
        padChar: pad.padChar,
      });
      state.enc.result = res;
      $('#encrypt-output').value = res.output;
      renderNotes($('#encrypt-notes'), res.notes);
    }
    const total = state.enc.result ? state.enc.result.blocks.length : 0;
    state.enc.block = Math.min(state.enc.block, Math.max(0, total - 1));
    renderEncryptBlock();
  }

  function computeDecrypt() {
    const pad = readPad('decrypt');
    if (!pad.ok) {
      state.dec.result = null;
      $('#decrypt-output').value = '';
      renderNotes($('#decrypt-notes'), []);
    } else {
      const res = Core.decrypt($('#decrypt-input').value, state.key, {
        trimPad: $('#decrypt-pad-trim').checked,
        padChar: pad.padChar,
      });
      state.dec.result = res;
      $('#decrypt-output').value = res.output;
      renderNotes($('#decrypt-notes'), res.notes);
    }
    const total = state.dec.result ? state.dec.result.blocks.length : 0;
    state.dec.block = Math.min(state.dec.block, Math.max(0, total - 1));
    renderDecryptBlock();
  }

  function renderNav(prefix, index, total) {
    $(`#${prefix}-block-indicator`).textContent = total ? t('block.indicator', { index: index + 1, total }) : t('block.empty');
    $(`#${prefix}-block-prev`).disabled = index <= 0;
    $(`#${prefix}-block-next`).disabled = index >= total - 1;
  }

  function fillTable(tbody, rows) {
    tbody.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.className = 'muted';
      td.textContent = t('table.empty');
      tr.append(td);
      tbody.append(tr);
      return;
    }
    for (const cells of rows) {
      const tr = document.createElement('tr');
      for (const value of cells) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      }
      tbody.append(tr);
    }
  }

  const shown = (ch) => Wiring.displayChar(ch).text;

  /* ---------- 暗号化のブロック（線を1本ずつ引ける） ---------- */
  function renderEncryptBlock() {
    const res = state.enc.result;
    const blocks = res ? res.blocks : [];
    const n = state.key.length;
    const index = state.enc.block;
    renderNav('encrypt', index, blocks.length);
    const svg = $('#encrypt-wiring');
    const note = $('#encrypt-block-note');
    const block = blocks[index];
    if (!block) {
      svg.replaceChildren();
      note.hidden = true;
      fillTable($('#encrypt-map tbody'), []);
      renderSteps(0, 0, false);
      return;
    }
    if (!block.permuted) {
      note.textContent = t('block.keptNote');
      note.hidden = false;
      Wiring.render(svg, {
        n: block.plain.length,
        top: block.plain,
        bottom: block.cipher,
        links: [],
        topTitle: t('wiring.plain'),
        bottomTitle: t('wiring.cipher'),
        label: t('block.keptNote'),
      });
      fillTable($('#encrypt-map tbody'), block.plain.map((ch, i) => [String(i + 1), shown(ch), String(i + 1)]));
      renderSteps(0, 0, false);
      return;
    }
    note.textContent = block.padCount ? t('block.padNote', { count: block.padCount }) : '';
    note.hidden = !block.padCount;
    const step = state.enc.step ?? n;
    const links = state.key.map((to, i) => [i, to - 1]);
    const pairs = links.map(([a, b]) => t('wiring.pair', { from: a + 1, to: b + 1 })).join(', ');
    Wiring.render(svg, {
      n,
      top: block.plain,
      bottom: Core.partialBlock(block.plain, state.key, step),
      links,
      drawn: step,
      topTitle: t('wiring.plain'),
      bottomTitle: t('wiring.cipher'),
      label: n <= 16 ? t('wiring.keyLabel', { list: pairs }) : t('wiring.keyLabelLong', { n }),
    });
    fillTable($('#encrypt-map tbody'), block.plain.map((ch, i) => [String(i + 1), shown(ch), String(state.key[i])]));
    renderSteps(step, n, true);
  }

  function renderSteps(step, n, enabled) {
    $('#encrypt-step-status').textContent = enabled ? t('step.status', { n, k: step }) : '';
    $('#encrypt-step-reset').disabled = !enabled || step === 0;
    $('#encrypt-step-back').disabled = !enabled || step === 0;
    $('#encrypt-step-next').disabled = !enabled || step >= n;
    $('#encrypt-step-all').disabled = !enabled || step >= n;
    const play = $('#encrypt-step-play');
    play.disabled = !enabled;
    play.textContent = t(state.enc.timer ? 'step.stop' : 'step.play');
    play.setAttribute('aria-pressed', String(Boolean(state.enc.timer)));
  }

  function setStep(step) {
    const n = state.key.length;
    state.enc.step = Math.max(0, Math.min(n, step));
    renderEncryptBlock();
  }

  function stopPlay() {
    if (state.enc.timer) {
      clearInterval(state.enc.timer);
      state.enc.timer = null;
    }
  }

  $('#encrypt-step-reset').addEventListener('click', () => { stopPlay(); setStep(0); });
  $('#encrypt-step-back').addEventListener('click', () => { stopPlay(); setStep((state.enc.step ?? state.key.length) - 1); });
  $('#encrypt-step-next').addEventListener('click', () => { stopPlay(); setStep((state.enc.step ?? state.key.length) + 1); });
  $('#encrypt-step-all').addEventListener('click', () => { stopPlay(); setStep(state.key.length); });
  $('#encrypt-step-play').addEventListener('click', () => {
    if (state.enc.timer) {
      stopPlay();
      renderEncryptBlock();
      return;
    }
    const n = state.key.length;
    if ((state.enc.step ?? n) >= n) state.enc.step = 0;
    state.enc.timer = setInterval(() => {
      const next = (state.enc.step ?? n) + 1;
      if (next >= n) stopPlay();
      setStep(next);
    }, STEP_INTERVAL);
    renderEncryptBlock();
  });

  function changeEncryptBlock(delta) {
    const total = state.enc.result ? state.enc.result.blocks.length : 0;
    const next = state.enc.block + delta;
    if (next < 0 || next >= total) return;
    stopPlay();
    state.enc.block = next;
    state.enc.step = null;
    renderEncryptBlock();
  }

  $('#encrypt-block-prev').addEventListener('click', () => changeEncryptBlock(-1));
  $('#encrypt-block-next').addEventListener('click', () => changeEncryptBlock(1));

  /* ---------- 復号のブロック ---------- */
  function renderDecryptBlock() {
    const res = state.dec.result;
    const blocks = res ? res.blocks : [];
    const index = state.dec.block;
    renderNav('decrypt', index, blocks.length);
    const svg = $('#decrypt-wiring');
    const note = $('#decrypt-block-note');
    const block = blocks[index];
    if (!block) {
      svg.replaceChildren();
      note.hidden = true;
      fillTable($('#decrypt-map tbody'), []);
      return;
    }
    if (!block.permuted) {
      note.textContent = t('block.keptNote');
      note.hidden = false;
      Wiring.render(svg, {
        n: block.cipher.length,
        top: block.cipher,
        bottom: block.plain,
        links: [],
        topTitle: t('wiring.cipher'),
        bottomTitle: t('wiring.plain'),
        label: t('block.keptNote'),
      });
      fillTable($('#decrypt-map tbody'), block.cipher.map((ch, i) => [String(i + 1), shown(ch), String(i + 1)]));
      return;
    }
    note.hidden = true;
    const inv = Core.inversePermutation(state.key);
    const n = inv.length;
    const links = inv.map((to, j) => [j, to - 1]);
    const pairs = links.map(([a, b]) => t('wiring.pair', { from: a + 1, to: b + 1 })).join(', ');
    Wiring.render(svg, {
      n,
      top: block.cipher,
      bottom: block.plain,
      links,
      topTitle: t('wiring.cipher'),
      bottomTitle: t('wiring.plain'),
      label: n <= 16 ? t('wiring.keyLabel', { list: pairs }) : t('wiring.keyLabelLong', { n }),
    });
    fillTable($('#decrypt-map tbody'), block.cipher.map((ch, j) => [String(j + 1), shown(ch), String(inv[j])]));
  }

  function changeDecryptBlock(delta) {
    const total = state.dec.result ? state.dec.result.blocks.length : 0;
    const next = state.dec.block + delta;
    if (next < 0 || next >= total) return;
    state.dec.block = next;
    renderDecryptBlock();
  }

  $('#decrypt-block-prev').addEventListener('click', () => changeDecryptBlock(-1));
  $('#decrypt-block-next').addEventListener('click', () => changeDecryptBlock(1));

  /* ---------- 入力の変更 ---------- */
  function onEncryptInput() {
    stopPlay();
    state.enc.step = null;
    computeEncrypt();
  }

  for (const sel of ['#encrypt-input', '#encrypt-pad-char']) $(sel).addEventListener('input', onEncryptInput);
  $('#encrypt-pad-enable').addEventListener('change', onEncryptInput);
  for (const sel of ['#decrypt-input', '#decrypt-pad-char']) $(sel).addEventListener('input', computeDecrypt);
  $('#decrypt-pad-trim').addEventListener('change', computeDecrypt);

  for (const item of $$('.preset-item')) {
    item.addEventListener('click', () => {
      $('#encrypt-input').value = item.dataset.text || '';
      item.closest('details').open = false;
      state.enc.block = 0;
      onEncryptInput();
      showToast(t('toast.example'), 'success');
    });
  }

  $('#encrypt-copy').addEventListener('click', () => copyText($('#encrypt-output').value));
  $('#decrypt-copy').addEventListener('click', () => copyText($('#decrypt-output').value));

  $('#encrypt-to-decrypt').addEventListener('click', () => {
    const ciphertext = $('#encrypt-output').value;
    if (!ciphertext) {
      showToast(t('toast.noCiphertext'), 'danger');
      return;
    }
    $('#decrypt-input').value = ciphertext;
    $('#decrypt-pad-char').value = $('#encrypt-pad-char').value;
    $('#decrypt-pad-trim').checked = $('#encrypt-pad-enable').checked;
    state.dec.block = 0;
    computeDecrypt();
    activateTab('decrypt');
    showToast(t('toast.sentToDecrypt'), 'success');
  });

  /* ==========================================================================
   * Initialization - Default Values
   * ========================================================================== */
  $('#encrypt-input').value = 'ENIGMA IS FUN';
  $('#decrypt-input').value = 'NGEI';
  const checked = $('input[name="key-direction"]:checked');
  state.direction = checked && checked.value === 'from' ? 'from' : 'to';
  activateTab('keygen');
  setKey([3, 1, 4, 2]);
})();
