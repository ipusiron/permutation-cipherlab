# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Permutation CipherLab** is a static web application that demonstrates permutation (block transposition) ciphers for educational purposes. Text is split into blocks of the key length, and every block is rearranged by the same permutation key (e.g., `3-1-4-2`).

This is part of the "100 Security Tools with Generative AI" project (Day 095).

## Running and Testing

No build step and no dependencies.

```bash
# Open index.html directly (file:// works: scripts are classic scripts, not ES modules)
start index.html

# Or serve locally
python -m http.server 8000

# Tests (Node.js 22+, node:test only)
npm test
```

GitHub Actions (`.github/workflows/test.yml`) runs `npm test` on push and pull request.

## Architecture

| File | Role |
|---|---|
| `js/permutation-core.js` | Pure logic (`PermutationCore`, also `module.exports`). No DOM. Returns errors/notes as `{ key, params }` |
| `js/messages.js` | UI strings (`PclMessages.format(lang, key, params)`). Japanese only for now |
| `js/wiring.js` | SVG wiring diagram (`PclWiring.render`). Attributes and classes only (no `style` attributes) |
| `script.js` | DOM controller. Single `state` object; every input change recomputes and re-renders |
| `index.html` | Tabs: 鍵生成 / 暗号化 / 復号 / 座学 |
| `style.css` | Design tokens in `:root` (`--primary-strong`, `--muted-strong`, `--wire`, …) |

### Key conventions

- Internally a key is the **scatter ("送る向き")** array `p` (1-based): plaintext char `i` goes to ciphertext position `p[i]`. `3-1-4-2` turns `ENIG` into `NGEI` and `ABCD` into `BDAC`.
- The **gather ("取り出す向き")** notation (Stinson, dCode) is the inverse permutation. The UI toggle changes only how keys are written and read (`toNotation` / `fromNotation`); the stored key and all outputs stay the same.
- Saved keys (`localStorage` key `pcl_patterns_v1`, `[{name, pattern}]`) are always stored in scatter notation and validated with `sanitizeSaved` on load.

### Behaviour that tests depend on

- Text is NFC-normalized and processed per code point (emoji are never split).
- Padding: one visible code point (default `X`). Encryption warns (`enc.endsWithPad`) when the plaintext ends with the pad char. Decryption trims at most `n − 1` trailing pad chars, and only when the ciphertext length is a multiple of `n`.
- Without padding, a short final block is left as-is (`enc.shortBlockKept` / `dec.shortBlockKept`).
- Random keys use `crypto.getRandomValues` with rejection sampling; there is no `Math.random` fallback.
- The step-by-step view keeps only `state.enc.step` (number of wires drawn); the picture is derived from `partialBlock()`. Any input/key/block change stops autoplay and shows all wires.
- The key editor registers its listeners once on the `<ol>` (event delegation).

## Constraints

- Keep CSP-compatible: no inline scripts, no `on*` attributes, no `style` attributes in HTML. Use `hidden`, classes, or CSSOM.
- `script.js` must not contain Japanese string literals; add strings to `js/messages.js` (checked by `test/messages.test.js`).
- README examples are recomputed by `test/readme.test.js`. Change the logic and the README tables together.
- Do not add npm dependencies, CDNs, or a bundler.

## Educational Context

- Permutation vs substitution, inverse permutations, key space n!
- Scatter vs gather notation differs between textbooks and tools (Stinson / dCode vs CrypTool 2 / Crypto Corner); Gaines (1939) shows both uses of one key.
- Fixed-length rail fence, scytale, columnar and route ciphers are all single permutations; the README gives equivalent keys.
- Padding is ambiguous with plaintext that ends in the pad character (`TAX` → `AXTX` → `TA`).
