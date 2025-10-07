/* ============================================================================
 * Permutation CipherLab - Main Script
 * ============================================================================
 *
 * Educational tool for exploring permutation (transposition) ciphers.
 *
 * Features:
 * - Block-wise permutation encryption/decryption
 * - Pattern generation (random, manual, visual drag-and-drop)
 * - Pattern visualization (forward and inverse)
 * - Multiple pattern storage via localStorage
 * - Block navigation for multi-block cipher analysis
 * - Animation demo for understanding permutation step-by-step
 *
 * Architecture:
 * - Pure vanilla JavaScript (no frameworks)
 * - Event-driven architecture with tab-based UI
 * - Global state management via `currentKey`
 * - Security: XSS prevention using textContent instead of innerHTML
 *
 * ============================================================================
 */

/* ============================================================================
 * DOM Helpers
 * ============================================================================ */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ============================================================================
 * Global State
 * ============================================================================ */
const STORAGE_KEY = 'pcl_patterns_v1';  // localStorage key for saved patterns
let currentKey = null;                   // Current active permutation pattern (global state)

/* ============================================================================
 * UI Feedback Functions
 * ============================================================================ */

/**
 * Show toast notification
 * @param {string} msg - Message to display
 * @param {string} type - Type of toast: 'success', 'danger', or ''
 */
function showToast(msg, type=''){
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(()=> t.className='toast', 1600);
}

/**
 * Show inline error message near input field
 * @param {string} elementId - CSS selector for error element
 * @param {string} msg - Error message (empty string to hide)
 */
function showInlineError(elementId, msg){
  const el = $(elementId);
  if(!el) return;
  if(msg){
    el.textContent = msg;
    el.style.display = 'block';
  }else{
    el.textContent = '';
    el.style.display = 'none';
  }
}

/* ============================================================================
 * Tab Navigation
 * ============================================================================ */
$$('.tab').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $$('.tab').forEach(b=> b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $$('.panel').forEach(p=> p.classList.remove('active'));
    $(`#panel-${tab}`).classList.add('active');
  });
});

/* ============================================================================
 * Core Cryptographic Functions
 * ============================================================================ */

/**
 * Parse pattern string into array of integers
 * Accepts multiple delimiters: hyphen, space, comma, Japanese comma
 * @param {string} str - Pattern string (e.g., "3-1-4-2")
 * @param {number} n - Expected length (optional, for validation)
 * @returns {number[]|null} - Parsed pattern or null if invalid
 */
function parsePattern(str, n){
  // Accept forms like "3-1-4-2" or "3 1 4 2" or "3,1,4,2"
  if(!str) return null;

  // Trim and check for trailing delimiters
  const trimmed = str.trim();
  if(/[\s,\-，、]$/.test(trimmed)){
    return null; // Ends with delimiter
  }

  const parts = trimmed.split(/[\s,\-，、]+/).filter(Boolean);

  // Check if all parts are valid integers
  const numbers = parts.map(x => {
    const num = parseInt(x, 10);
    // Check if parsing succeeded and the string representation matches
    if(isNaN(num) || String(num) !== x.trim()){
      return NaN;
    }
    return num;
  });

  if(numbers.some(Number.isNaN)) return null;
  if(n && numbers.length !== n) return null;
  return numbers;
}

/**
 * Validate permutation pattern
 * Ensures pattern is a valid permutation of 1..n
 * @param {number[]} perm - Permutation array to validate
 * @returns {{ok: boolean, msg?: string}} - Validation result
 */
function validatePermutation(perm){
  if(!Array.isArray(perm) || perm.length<2) {
    return {ok:false, msg:'長さ2以上のパターンを指定してください'};
  }

  const n = perm.length;

  // Check for non-positive integers
  if(perm.some(x => x < 1 || !Number.isInteger(x))){
    return {ok:false, msg:'1以上の整数のみ使用できます'};
  }

  // Check for values out of range (must be in 1..n)
  const outOfRange = perm.filter(x => x > n);

  if(outOfRange.length > 0){
    const outOfRangeStr = [...new Set(outOfRange)].join(', ');
    return {ok:false, msg:`範囲外の値: ${outOfRangeStr}（1〜${n}の値のみ使用できます）`};
  }

  // Check for duplicates
  const set = new Set(perm);
  if(set.size !== n) {
    const duplicates = perm.filter((val, idx) => perm.indexOf(val) !== idx);
    return {ok:false, msg:`重複があります: ${[...new Set(duplicates)].join(', ')}`};
  }

  // Check for missing values
  const missing = [];
  for(let i=1; i<=n; i++){
    if(!set.has(i)) missing.push(i);
  }
  if(missing.length > 0){
    return {ok:false, msg:`不足している値があります: ${missing.join(', ')}`};
  }

  return {ok:true};
}

/**
 * Calculate inverse permutation for decryption
 * @param {number[]} perm - Original permutation (1-based)
 * @returns {number[]} - Inverse permutation
 * @example inversePermutation([3,1,4,2]) returns [2,4,1,3]
 */
function inversePermutation(perm){
  const inv = new Array(perm.length);
  // perm[i] = j  (1-based) means position i -> j
  // inverse: inv[j-1] = i+1
  perm.forEach((j, i)=> inv[j-1] = i+1);
  return inv;
}

/**
 * Split string into fixed-size chunks (blocks)
 * @param {string} str - Input string
 * @param {number} size - Block size
 * @returns {string[]} - Array of chunks
 */
function chunkBy(str, size){
  const chunks = [];
  for(let i=0;i<str.length;i+=size){
    chunks.push(str.slice(i, i+size));
  }
  return chunks;
}

/**
 * Apply permutation to a single block
 * @param {string} block - Input block
 * @param {number[]} perm - Permutation pattern (1-based)
 * @param {string} padChar - Padding character
 * @param {boolean} padEnable - Whether to pad incomplete blocks
 * @returns {string} - Permuted block
 */
function applyPermutationToBlock(block, perm, padChar, padEnable){
  const n = perm.length;
  let b = block;
  if(block.length < n){
    if(padEnable && padChar){
      b = block + padChar.repeat(n - block.length);
    }else{
      // leave as-is (no permutation if shorter than n)
      // Alternative: permute existing positions only.
      // Here we leave as-is to avoid ambiguity.
      return block;
    }
  }
  const out = new Array(n);
  for(let i=0;i<n;i++){
    const from = i;          // 0-based index
    const to = perm[i]-1;    // 0-based destination
    out[to] = b[from];
  }
  return out.join('');
}

/**
 * Apply permutation to entire string (block-wise)
 * @param {string} str - Input string
 * @param {number[]} perm - Permutation pattern
 * @param {string} padChar - Padding character
 * @param {boolean} padEnable - Enable padding
 * @returns {string} - Encrypted string
 */
function applyPermutation(str, perm, padChar, padEnable){
  const n = perm.length;
  return chunkBy(str, n).map(block=>{
    return applyPermutationToBlock(block, perm, padChar, padEnable);
  }).join('');
}

/**
 * Trim padding characters from right end of string
 * @param {string} str - Input string
 * @param {string} padChar - Padding character to remove
 * @returns {string} - String with padding removed
 */
function trimRightPad(str, padChar){
  if(!padChar) return str;
  let i = str.length-1;
  while(i>=0 && str[i]===padChar) i--;
  return str.slice(0, i+1);
}

/**
 * Convert permutation array to string representation
 * @param {number[]} perm - Permutation array
 * @returns {string} - Pattern string (e.g., "3-1-4-2")
 */
function buildPatternString(perm){
  return perm.join('-');
}

/**
 * Generate random permutation using Fisher-Yates shuffle
 * @param {number} n - Length of permutation
 * @returns {number[]} - Random permutation of 1..n
 */
function generateRandomPermutation(n){
  const arr = Array.from({length:n}, (_,i)=>i+1);
  // Fisher-Yates shuffle
  for(let i=n-1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ============================================================================
 * Key Management Functions
 * ============================================================================ */

/**
 * Update the current active key and sync UI
 * @param {number[]|null} pattern - New permutation pattern
 */
function updateCurrentKey(pattern){
  currentKey = pattern;
  const keyText = $('#current-key-text');
  const keyCopyBtn = $('#key-copy');
  if(pattern){
    keyText.textContent = buildPatternString(pattern);
    keyCopyBtn.disabled = false;
    // Update all tabs
    updateKeyDisplays();
    // Update visualization
    renderKeyVisualization(pattern);
  }else{
    keyText.textContent = '未生成';
    keyCopyBtn.disabled = true;
    // Hide visualization
    const vizContainer = $('#key-visualization');
    if(vizContainer) vizContainer.style.display = 'none';
  }
}

/**
 * Update key display in encryption and decryption tabs
 */
function updateKeyDisplays(){
  const keyStr = currentKey ? buildPatternString(currentKey) : '鍵生成タブで鍵を生成してください';
  const displays = ['#encrypt-key-display', '#decrypt-key-display'];
  displays.forEach(sel=>{
    const el = $(sel);
    if(el) el.textContent = keyStr;
  });

  // Update block size info
  if(currentKey){
    const blockSize = currentKey.length;
    const blockInfo = `（ブロックサイズ：${blockSize}文字ごとに処理）`;
    const encInfo = $('#encrypt-block-info');
    const decInfo = $('#decrypt-block-info');
    if(encInfo) encInfo.textContent = blockInfo;
    if(decInfo) decInfo.textContent = blockInfo;
  }else{
    const encInfo = $('#encrypt-block-info');
    const decInfo = $('#decrypt-block-info');
    if(encInfo) encInfo.textContent = '';
    if(decInfo) decInfo.textContent = '';
  }
}

function renderKeyVisualization(pattern){
  const vizContainer = $('#key-visualization');
  if(!vizContainer) return;

  const n = pattern.length;
  const inverse = inversePermutation(pattern);

  // Render forward pattern
  const forwardViz = $('#pattern-viz-forward');
  if(forwardViz){
    forwardViz.innerHTML = '';

    // Top row (positions 1,2,3,4...)
    const topRow = document.createElement('div');
    topRow.className = 'viz-row';
    for(let i=1; i<=n; i++){
      const cell = document.createElement('div');
      cell.className = 'viz-cell top';
      cell.textContent = i;
      topRow.appendChild(cell);
    }
    forwardViz.appendChild(topRow);

    // Arrows
    const arrows = document.createElement('div');
    arrows.className = 'viz-arrows';
    for(let i=0; i<n; i++){
      const arrow = document.createElement('div');
      arrow.className = 'viz-arrow';
      arrow.textContent = '↓';
      arrows.appendChild(arrow);
    }
    forwardViz.appendChild(arrows);

    // Bottom row (pattern values)
    const bottomRow = document.createElement('div');
    bottomRow.className = 'viz-row';
    for(let i=0; i<n; i++){
      const cell = document.createElement('div');
      cell.className = 'viz-cell bottom';
      cell.textContent = pattern[i];
      bottomRow.appendChild(cell);
    }
    forwardViz.appendChild(bottomRow);
  }

  // Render inverse pattern
  const inverseViz = $('#pattern-viz-inverse');
  if(inverseViz){
    inverseViz.innerHTML = '';

    // Top row (positions 1,2,3,4...)
    const topRow = document.createElement('div');
    topRow.className = 'viz-row';
    for(let i=1; i<=n; i++){
      const cell = document.createElement('div');
      cell.className = 'viz-cell top';
      cell.textContent = i;
      topRow.appendChild(cell);
    }
    inverseViz.appendChild(topRow);

    // Arrows
    const arrows = document.createElement('div');
    arrows.className = 'viz-arrows';
    for(let i=0; i<n; i++){
      const arrow = document.createElement('div');
      arrow.className = 'viz-arrow';
      arrow.textContent = '↓';
      arrows.appendChild(arrow);
    }
    inverseViz.appendChild(arrows);

    // Bottom row (inverse values)
    const bottomRow = document.createElement('div');
    bottomRow.className = 'viz-row';
    for(let i=0; i<n; i++){
      const cell = document.createElement('div');
      cell.className = 'viz-cell bottom';
      cell.textContent = inverse[i];
      bottomRow.appendChild(cell);
    }
    inverseViz.appendChild(bottomRow);
  }

  vizContainer.style.display = 'block';
}

/* ============================================================================
 * localStorage Pattern Management
 * ============================================================================ */

/**
 * Load saved patterns from localStorage
 * @returns {Array<{name: string, pattern: string}>} - Array of saved patterns
 */
function loadSaved(){
  try{
    const data = localStorage.getItem(STORAGE_KEY);
    if(!data) return [];
    const parsed = JSON.parse(data);
    if(!Array.isArray(parsed)) return [];
    return parsed;
  }catch(e){
    console.error('Failed to load saved patterns:', e);
    return [];
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
function renderSaved(container, onLoad, onDelete){
  const saved = loadSaved();
  container.innerHTML = '';
  if(saved.length===0){
    const p = document.createElement('p');
    p.className='muted';
    p.textContent='（保存なし）';
    container.appendChild(p);
    return;
  }
  saved.forEach(({name, pattern})=>{
    const chip = document.createElement('div');
    chip.className='chip';
    const btnLoad = document.createElement('button');
    btnLoad.textContent = name;
    btnLoad.title = pattern;
    btnLoad.addEventListener('click', ()=> onLoad({name, pattern}));
    const btnDel = document.createElement('button');
    btnDel.innerHTML = '✕';
    btnDel.setAttribute('aria-label', '削除');
    btnDel.addEventListener('click', ()=>{
      const list = loadSaved().filter(x=> x.name!==name);
      saveSaved(list);
      renderSaved(container, onLoad, onDelete);
      showToast(`削除: ${name}`, 'danger');
      onDelete && onDelete({name});
    });
    chip.append(btnLoad, btnDel);
    container.appendChild(chip);
  });
}

function addSaved(name, pattern){
  if(!name) return {ok:false, msg:'保存名を入力してください'};
  const list = loadSaved();
  const exists = list.find(x=> x.name===name);
  if(exists){
    exists.pattern = pattern;
  }else{
    list.push({name, pattern});
  }
  saveSaved(list);
  return {ok:true};
}

/* ========== Drag Editor ========== */
function openDragEditor(listEl, wrapEl, patternStr, n){
  // initialize from pattern string or sequential 1..n
  const perm = parsePattern(patternStr, n) || Array.from({length:n}, (_,i)=>i+1);
  listEl.innerHTML = '';
  perm.forEach(val=>{
    const li = document.createElement('li');
    li.draggable = true;
    li.textContent = String(val);
    li.dataset.value = String(val);
    listEl.appendChild(li);
  });
  wrapEl.hidden = false;

  let dragSrc = null;
  listEl.addEventListener('dragstart', e=>{
    if(e.target.tagName !== 'LI') return;
    dragSrc = e.target;
    dragSrc.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.value);
  });
  listEl.addEventListener('dragend', e=>{
    if(e.target.tagName !== 'LI') return;
    e.target.classList.remove('dragging');
  });
  listEl.addEventListener('dragover', e=>{
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });
  listEl.addEventListener('drop', e=>{
    e.preventDefault();
    const li = e.target.closest('li');
    if(!li || !dragSrc || li===dragSrc) return;
    const nodes = Array.from(listEl.children);
    const from = nodes.indexOf(dragSrc);
    const to = nodes.indexOf(li);
    if(from<to){
      listEl.insertBefore(dragSrc, li.nextSibling);
    }else{
      listEl.insertBefore(dragSrc, li);
    }
  });
}

function readDragPattern(listEl){
  return Array.from(listEl.children).map(li=> parseInt(li.dataset.value,10));
}

/* ========== Mapping Table ========== */
function renderMapTable(tbody, before, after, direction='forward'){
  tbody.innerHTML = '';
  const n = Math.max(before.length, after.length);
  for(let i=0;i<n;i++){
    const tr = document.createElement('tr');
    const idx = document.createElement('td');
    idx.textContent = String(i+1);
    const a = document.createElement('td');
    const b = document.createElement('td');
    if(direction==='forward'){
      a.textContent = before[i] ?? '';
      b.textContent = after[i] ?? '';
    }else{
      a.textContent = after[i] ?? '';
      b.textContent = before[i] ?? '';
    }
    tr.append(idx,a,b);
    tbody.appendChild(tr);
  }
}


/* ============================================================================
 * KEY GENERATION TAB
 * ============================================================================
 * Features:
 * - Random pattern generation (Fisher-Yates)
 * - Manual pattern input with validation
 * - Visual drag-and-drop pattern editor
 * - Pattern visualization (forward and inverse)
 * - Pattern save/load via localStorage
 * ============================================================================ */

const keygenEls = {
  length: $('#keygen-length'),
  presetBtns: $$('.btn-preset'),
  randomBtn: $('#keygen-random'),
  manual: $('#keygen-manual'),
  validateBtn: $('#keygen-validate'),
  visualBtn: $('#keygen-visual'),
  dragWrap: $('#keygen-draggable-wrap'),
  dragList: $('#keygen-draggable'),
  visualApplyBtn: $('#keygen-visual-apply'),
  saveName: $('#key-save-name'),
  saveBtn: $('#key-save'),
  savedList: $('#key-saved-list'),
  copyBtn: $('#key-copy'),
};

// Preset buttons - just set the value, no active state
keygenEls.presetBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const length = parseInt(btn.dataset.length, 10);
    keygenEls.length.value = String(length);
  });
});

// Random generation
keygenEls.randomBtn.addEventListener('click', ()=>{
  const n = Math.max(2, Math.min(64, parseInt(keygenEls.length.value,10) || 4));
  keygenEls.length.value = String(n);
  const pattern = generateRandomPermutation(n);
  updateCurrentKey(pattern);
  showToast('ランダム鍵を生成しました', 'success');
});

// Manual validation
keygenEls.validateBtn.addEventListener('click', ()=>{
  const input = keygenEls.manual.value.trim();
  const expectedLength = Math.max(2, Math.min(64, parseInt(keygenEls.length.value,10) || 4));
  keygenEls.length.value = String(expectedLength);

  if(!input){
    showInlineError('#keygen-manual-error', 'パターンを入力してください');
    showToast('パターンを入力してください', 'danger');
    return;
  }

  // Parse without length constraint first
  const perm = parsePattern(input);
  if(!perm){
    showInlineError('#keygen-manual-error', 'パターン形式が不正です（例: 3-1-4-2）');
    showToast('パターン形式が不正です', 'danger');
    return;
  }

  // Check if length matches the expected length
  if(perm.length !== expectedLength){
    showInlineError('#keygen-manual-error', `パターン長${expectedLength}なら、1〜${expectedLength}の数字をそれぞれ1回だけ使用してください。`);
    showToast(`パターン長${expectedLength}なら、1〜${expectedLength}の数字をそれぞれ1回だけ使用してください。`, 'danger');
    return;
  }

  // Validate permutation
  const v = validatePermutation(perm);
  if(!v.ok){
    showInlineError('#keygen-manual-error', v.msg);
    showToast(v.msg, 'danger');
    return;
  }

  showInlineError('#keygen-manual-error', '');
  updateCurrentKey(perm);
  showToast(`✓ 有効な鍵です（長さ: ${perm.length}）`, 'success');
});

// Visual editor
keygenEls.visualBtn.addEventListener('click', ()=>{
  const n = Math.max(2, Math.min(64, parseInt(keygenEls.length.value,10) || 4));
  keygenEls.length.value = String(n);
  const initial = currentKey && currentKey.length===n ? buildPatternString(currentKey) : '';
  openDragEditor(keygenEls.dragList, keygenEls.dragWrap, initial, n);
});

keygenEls.visualApplyBtn.addEventListener('click', ()=>{
  const pattern = readDragPattern(keygenEls.dragList);
  const v = validatePermutation(pattern);
  if(!v.ok){
    showToast(v.msg, 'danger');
    return;
  }
  updateCurrentKey(pattern);
  showToast('ビジュアル編集の鍵を設定しました', 'success');
});

// Copy key
keygenEls.copyBtn.addEventListener('click', async ()=>{
  if(!currentKey) return;
  try{
    await navigator.clipboard.writeText(buildPatternString(currentKey));
    showToast('鍵をコピーしました', 'success');
  }catch{
    showToast('コピー失敗', 'danger');
  }
});

// Save key
keygenEls.saveBtn.addEventListener('click', ()=>{
  if(!currentKey){
    showToast('先に鍵を生成してください', 'danger');
    return;
  }
  const name = keygenEls.saveName.value.trim();
  const res = addSaved(name, buildPatternString(currentKey));
  if(!res.ok){ showToast(res.msg, 'danger'); return; }
  renderSaved(keygenEls.savedList, ({pattern})=>{
    const perm = parsePattern(pattern);
    if(perm){
      updateCurrentKey(perm);
      keygenEls.length.value = String(perm.length);
      showToast(`読込: ${pattern}`, 'success');
    }
  });
  showToast('鍵を保存しました', 'success');
});

// Load saved keys
renderSaved(keygenEls.savedList, ({pattern})=>{
  const perm = parsePattern(pattern);
  if(perm){
    updateCurrentKey(perm);
    keygenEls.length.value = String(perm.length);
    showToast(`読込: ${pattern}`, 'success');
  }
});

/* ============================================================================
 * ENCRYPTION TAB
 * ============================================================================
 * Features:
 * - Block-wise permutation encryption
 * - Example text presets
 * - Padding configuration (enable/disable, custom character)
 * - Block navigation for multi-block analysis
 * - Mapping table (plaintext → ciphertext)
 * - Animation demo for educational purposes
 * - Send to decryption tab workflow
 * ============================================================================ */

const encryptEls = {
  input: $('#encrypt-input'),
  presetToggle: $('#encrypt-preset-toggle'),
  presetList: $('#encrypt-preset-list'),
  presetItems: $$('.preset-item'),
  padChar: $('#encrypt-pad-char'),
  padEnable: $('#encrypt-pad-enable'),
  run: $('#encrypt-run'),
  animate: $('#encrypt-animate'),
  output: $('#encrypt-output'),
  copy: $('#encrypt-copy'),
  toDecrypt: $('#encrypt-to-decrypt'),
  mapBody: $('#encrypt-map tbody'),
  blockPrev: $('#encrypt-block-prev'),
  blockNext: $('#encrypt-block-next'),
  blockIndicator: $('#encrypt-block-indicator'),
};

let encryptBlocks = { input: [], output: [] };
let encryptCurrentBlock = 0;

// Preset toggle
if(encryptEls.presetToggle && encryptEls.presetList){
  encryptEls.presetToggle.addEventListener('click', ()=>{
    const isHidden = encryptEls.presetList.style.display === 'none';
    encryptEls.presetList.style.display = isHidden ? 'block' : 'none';
    encryptEls.presetToggle.textContent = isHidden ? '✕ 閉じる' : '📝 例文を選択';
  });
}

// Preset selection
if(encryptEls.presetItems){
  encryptEls.presetItems.forEach(item=>{
    item.addEventListener('click', ()=>{
      if(!encryptEls.input) return;
      encryptEls.input.value = item.dataset.text || '';
      if(encryptEls.presetList) encryptEls.presetList.style.display = 'none';
      if(encryptEls.presetToggle) encryptEls.presetToggle.textContent = '📝 例文を選択';
      showToast('例文を設定しました', 'success');
    });
  });
}

function updateEncryptBlockNav(){
  const totalBlocks = encryptBlocks.input.length;
  encryptEls.blockIndicator.textContent = totalBlocks > 0 ? `ブロック ${encryptCurrentBlock + 1} / ${totalBlocks}` : 'ブロック 1';
  encryptEls.blockPrev.disabled = encryptCurrentBlock <= 0;
  encryptEls.blockNext.disabled = encryptCurrentBlock >= totalBlocks - 1 || totalBlocks === 0;

  if(totalBlocks > 0){
    const blockIn = encryptBlocks.input[encryptCurrentBlock] || '';
    const blockOut = encryptBlocks.output[encryptCurrentBlock] || '';
    renderMapTable(encryptEls.mapBody, blockIn, blockOut, 'forward');
  }
}

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

encryptEls.run.addEventListener('click', ()=>{
  if(!currentKey){
    showToast('鍵生成タブで鍵を生成してください', 'danger');
    return;
  }
  const padChar = (encryptEls.padChar.value || '').slice(0,1) || '';
  const padEnable = encryptEls.padEnable.checked;
  const input = encryptEls.input.value;
  const output = applyPermutation(input, currentKey, padChar, padEnable);
  encryptEls.output.value = output;

  // Store blocks for navigation
  const n = currentKey.length;
  encryptBlocks.input = chunkBy(input, n);
  encryptBlocks.output = chunkBy(output, n);
  encryptCurrentBlock = 0;

  updateEncryptBlockNav();
  showToast('暗号化を実行しました', 'success');
});

encryptEls.copy.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(encryptEls.output.value || '');
    showToast('暗号文をコピーしました', 'success');
  }catch{
    showToast('コピー失敗', 'danger');
  }
});

encryptEls.toDecrypt.addEventListener('click', ()=>{
  const ciphertext = encryptEls.output.value;
  if(!ciphertext){
    showToast('先に暗号化を実行してください', 'danger');
    return;
  }
  $('#decrypt-input').value = ciphertext;
  // Switch to decrypt tab
  $$('.tab').forEach(b=> b.classList.remove('active'));
  $$('.panel').forEach(p=> p.classList.remove('active'));
  $('[data-tab="decrypt"]').classList.add('active');
  $('#panel-decrypt').classList.add('active');
  showToast('暗号文を復号タブに送りました', 'success');
});

encryptEls.animate.addEventListener('click', ()=>{
  if(!currentKey){
    showToast('鍵生成タブで鍵を生成してください', 'danger');
    return;
  }
  const n = currentKey.length;
  const src = encryptEls.input.value || 'ENIGMA IS FUN';
  encryptEls.input.value = src;
  const first = src.slice(0,n);
  if(first.length < n){
    showToast('デモ用にブロック長以上の文字を入れてください', 'danger');
    return;
  }
  const padChar = (encryptEls.padChar.value || '').slice(0,1) || '';
  const padEnable = encryptEls.padEnable.checked;
  const output = applyPermutation(src, currentKey, padChar, padEnable);
  encryptEls.output.value = output;

  // Animate table
  const tbody = encryptEls.mapBody;
  tbody.innerHTML = '';
  for(let i=0;i<n;i++){
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = String(i+1);
    const td2 = document.createElement('td');
    td2.textContent = first[i] || '';
    const td3 = document.createElement('td');
    td3.textContent = '';
    tr.append(td1, td2, td3);
    tbody.appendChild(tr);
  }
  let k = 0;
  const timer = setInterval(()=>{
    if(k>=n){
      clearInterval(timer);
      renderMapTable(tbody, first, output.slice(0,n),'forward');
      return;
    }
    const to = currentKey[k]-1;
    const row = tbody.children[k];
    if(row){
      row.cells[2].textContent = output[to];
      row.style.background = '#e0f2fe';
      setTimeout(()=> row.style.background='', 260);
    }
    k++;
  }, 220);
});

/* ============================================================================
 * DECRYPTION TAB
 * ============================================================================
 * Features:
 * - Automatic inverse permutation calculation
 * - Padding trim (optional)
 * - Mapping table (ciphertext → plaintext)
 * ============================================================================ */

const decryptEls = {
  input: $('#decrypt-input'),
  padChar: $('#decrypt-pad-char'),
  padTrim: $('#decrypt-pad-trim'),
  run: $('#decrypt-run'),
  output: $('#decrypt-output'),
  copy: $('#decrypt-copy'),
  mapBody: $('#decrypt-map tbody'),
};

decryptEls.run.addEventListener('click', ()=>{
  if(!currentKey){
    showToast('鍵生成タブで鍵を生成してください', 'danger');
    return;
  }
  const inv = inversePermutation(currentKey);
  const input = decryptEls.input.value;
  const out = applyPermutation(input, inv, '', false);
  const result = decryptEls.padTrim.checked ? trimRightPad(out, decryptEls.padChar.value.slice(0,1)||'') : out;
  decryptEls.output.value = result;

  // Map table for first block preview
  const n = currentKey.length;
  const firstIn = input.slice(0,n);
  const firstOut = result.slice(0,n);
  renderMapTable(decryptEls.mapBody, firstOut, firstIn, 'reverse');

  showToast('復号を実行しました', 'success');
});

decryptEls.copy.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(decryptEls.output.value || '');
    showToast('平文をコピーしました', 'success');
  }catch{
    showToast('コピー失敗', 'danger');
  }
});

/* ============================================================================
 * Initialization - Default Values
 * ============================================================================ */

/**
 * Set default values for demo purposes
 */
(function initDefaults(){
  encryptEls.input.value = 'ENIGMA IS FUN';
  decryptEls.input.value = 'IEGN';
  // Set default key
  updateCurrentKey([3,1,4,2]);
})();
