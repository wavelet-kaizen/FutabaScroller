# CLAUDE.md
必ず日本語で回答してください。

## Codex 連携ガイド

### 目的
Codex から **Claude Code** が呼び出された際に、
Claude Code は Codex との対話コンテキストを保ちながら、複数ターンに渡り協働する。

---

### Codex の使い方
- ターミナルで以下を実行すると Codex と対話できる。

```bash
codex exec <<EOF
<質問・依頼内容>
EOF
```


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FutabaScroller is a browser bookmarklet that automatically scrolls through Futaba (Japanese imageboard) threads based on timestamps. It captures response timestamps, lets users select a starting point with playback speed, and auto-scrolls to simulate the thread unfolding in real-time.

**必ず日本語で回答してください** (Always respond in Japanese when collaborating with Codex)

## Development Commands

**Syntax check:**
```bash
node --check futaba_scroller.js
```

**Format code:**
```bash
npx prettier --tab-width 4 --write futaba_scroller.js
```

**Print bookmarklet for browser testing:**
```bash
node -p "require('fs').readFileSync('futaba_scroller.js','utf8')"
```

## Architecture

### Core Components

The bookmarklet (`futaba_scroller.js`) is a self-contained IIFE with:

1. **Response Capture** (`captureResponses()` at line 13): Queries DOM for `.cnw` elements containing timestamps, parses them, and stores in `responses` array
2. **Timestamp Parser** (`parseTimestamp()` at line 52): Converts Japanese date format `YY/MM/DD(day)HH:MM:SS` to Date objects
3. **User Settings** (`promptUserForSettings()` at line 69): Prompts for response number and playback speed multiplier
4. **Scroll Logic** (`scrollToClosestResponse()` at line 132, `updateScroll()` at line 163): Calculates current thread time based on elapsed real time × speed multiplier, finds closest past response, and scrolls to it

### Key State Variables

- `responses[]`: Array of `{timestamp, element}` objects sorted chronologically
- `threadStartTime`: Selected response's timestamp (user-chosen starting point)
- `speedMultiplier`: Playback speed (e.g., 1.5 = 1.5x speed)
- `startTime`: Real-world execution start timestamp

### Timing Algorithm

```
currentThreadTime = threadStartTime + (Date.now() - startTime) * speedMultiplier
```

Every 500ms, finds the most recent response where `response.timestamp ≤ currentThreadTime` and scrolls to it.

## Testing

Manual testing is primary: open a Futaba thread, paste bookmarklet in DevTools console, verify console logs show timestamps in order, input response number and speed, confirm smooth scrolling matches expected timeline.

For new parsing logic or timing calculations, save sample Futaba thread HTML in `assets/fixtures/` and test with headless browser or Jest DOM harness.

## Coding Style

- **Language:** Modern ES2020 syntax (no transpilation needed for Chromium/Firefox/Safari)
- **Formatting:** 4 spaces, trailing commas for multiline, imperative names (`captureResponses`, not `capturer`)
- **Variables:** `const` by default, `let` for mutable state
- **User-facing text:** Japanese (matches Futaba interface)
- **Selector specificity:** Current selector is `body > div.thre table .cnw` (line 15)

## Bookmarklet Constraints

- **Self-contained:** No external dependencies or loaders
- **CSP-safe:** Runs in existing page context without violating Content Security Policy
- **Minification:** Before release, minify while preserving multibyte characters
- **Distribution:** Provide both raw `.js` file and `javascript:(function(){...})()` URL format

## Common Pitfalls

- **Off-by-one errors:** Response number is 1-indexed for users but `responses[responseNumber - 1]` in code
- **Date parsing failures:** `parseTimestamp()` returns `null` for malformed strings; always check before pushing to array
- **Speed multiplier edge cases:** Validate `speedMultiplier > 0` to prevent time reversal or division by zero
- **Element references:** Store `el.closest("table")` not just `.cnw` so entire response scrolls into view

## Future Structure (not yet implemented)

When multiple features require modularity:
- Shared utilities → `src/`
- Documentation → `docs/`
- Test fixtures → `assets/fixtures/`
- Bundle/concatenate back into single bookmarklet before release
