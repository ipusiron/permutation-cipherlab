# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Permutation CipherLab** is a static web application that demonstrates permutation (transposition) ciphers for educational purposes. It allows users to encrypt/decrypt text by rearranging characters according to custom patterns (e.g., `3-1-4-2`).

This is part of the "100 Security Tools with Generative AI" project (Day 095).

## Running the Application

This is a static site with no build process or dependencies:

```bash
# Open in browser directly
start index.html

# Or serve locally (if needed)
python -m http.server 8000
```

The app runs entirely in the browser using vanilla JavaScript.

## Architecture

### Core Components

**Single-page application with three tabs:**
- **転置 (Permutation)**: Encrypts plaintext by applying permutation pattern
- **復号 (Inverse)**: Decrypts ciphertext by applying inverse permutation
- **座学 (Study)**: Educational content about permutation ciphers

**Key files:**
- `index.html`: Complete UI structure with three tab panels
- `script.js`: All application logic (no frameworks)
- `style.css`: Full styling with CSS variables
- No external dependencies or build tools

### Core Cryptographic Logic (script.js)

**Permutation handling:**
- `parsePattern(str, n)`: Parses pattern strings like "3-1-4-2", "3 1 4 2", or "3,1,4,2"
- `validatePermutation(perm)`: Ensures pattern is valid (1..n with no duplicates)
- `inversePermutation(perm)`: Computes the inverse permutation for decryption
- `applyPermutationToBlock(block, perm, padChar, padEnable)`: Applies permutation to a single block
- `applyPermutation(str, perm, padChar, padEnable)`: Block-wise encryption using `chunkBy`

**Key algorithm details:**
- Block-wise processing: text is split into chunks of size `n` (pattern length)
- 1-based indexing for permutation patterns (user-facing)
- 0-based indexing internally (implementation)
- Optional padding for incomplete final blocks
- Pattern editor supports text input or drag-and-drop GUI

### Data Persistence

**localStorage storage:**
- Key: `pcl_patterns_v1`
- Stores saved permutation patterns as JSON array: `[{name, pattern}, ...]`
- Functions: `loadSaved()`, `saveSaved(list)`, `addSaved(name, pattern)`

### UI Architecture

**Tab system:**
- Manual DOM manipulation for tab switching
- Each tab has separate DOM element references (e.g., `permEls`, `invEls`)
- No routing or state management library

**Drag-and-drop pattern editor:**
- `openDragEditor()`: Initializes draggable list from pattern
- `readDragPattern()`: Reads current order from DOM
- Uses native HTML5 drag-and-drop API

**Mapping tables:**
- `renderMapTable()`: Shows before/after character correspondence
- Displays first block only for visualization
- Animation demo in permutation tab highlights character movements

### Pattern Validation

Permutation patterns must be:
- Length ≥ 2
- Contain integers 1 through n exactly once
- No duplicates or missing values

Example: For n=4, valid pattern is `[3,1,4,2]`, invalid is `[3,1,1,2]` (duplicate 1, missing 4)

## Common Development Tasks

**Testing encryption/decryption:**
1. Open index.html in browser
2. Default test case: "ENIGMA IS FUN" with pattern "3-1-4-2"
3. Switch to 復号 tab to decrypt the result

**Modifying cipher logic:**
- Core permutation logic: `applyPermutationToBlock()` in script.js:70-90
- Inverse computation: `inversePermutation()` in script.js:54-60
- Block processing: `chunkBy()` in script.js:62-68

**Adding new features:**
- New tabs: Add button to `.tabs`, panel to `main`, update tab click handler (script.js:22-30)
- New cipher modes: Follow the pattern of `permEls` or `invEls` object structure
- Pattern validation: Modify `validatePermutation()` in script.js:42-52

## Educational Context

This tool demonstrates:
- **Permutation vs Substitution**: Characters are rearranged, not replaced
- **Block cipher structure**: Modern ciphers like DES/AES use P-boxes (permutation boxes) for diffusion
- **Historical context**: From Scytale cipher to columnar transposition to modern P-boxes
- **Key concept**: Simple reordering can function as a cryptographic "key"
