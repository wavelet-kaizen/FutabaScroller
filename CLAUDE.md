<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.
ドキュメントはすべて日本語で作成し、ユーザへの回答は全て日本語で返してください。

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

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
codex exec << 'EOF'
<質問・依頼内容>
EOF
```


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FutabaScroller is a browser bookmarklet that automatically scrolls through Futaba (Japanese imageboard) threads based on timestamps. It now uses an HTML入力フォームで開始位置（レス番号/日時/No.）と速度・追加スレッドURLを入力し、起動時は一時停止状態で準備してから x キーで再生を開始する。複数スレッドを No. 昇順にマージし、重複No.は自動除外する。

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

## 操作メモ（新しい入力UI）
- ブックマークレット実行後に表示されるフォームで開始位置の形式（レス番号/日時/No.）と値、速度倍率を入力
- 追加スレッドURLがあれば改行区切りで入力（ふたば本家/ふたクロ/tsumanne/Futafuta 対応、No.重複は除外）
- 「開始」を押したらローディングオーバーレイ完了まで待機し、メインオーバーレイの「準備完了、xキーでスクロール開始」表示後に x キーで再生を開始
- 再実行時はオーバーレイとポーリング状態がリセットされる
- 開始位置の解決はマージ完了後に実施し、失敗時（レス番号範囲外/No.未発見/日時パース失敗）は入力フォームをエラーメッセージ付きで再表示して再入力を待つ
- 日時指定でスレ開始前なら最初のレスが来るまで待機、スレ終了後なら開始時に最後のレスへ即スクロールしタイムライン終了扱い（ステータスオーバーレイで案内）

## Architecture

### Core Components

- **InputFormOverlay** (`src/ui/input_form.ts`): フルスクリーンのHTMLフォームで開始位置・速度・追加スレッドURLを入力、バリデーションと再実行時リセットを担当
- **LoadingOverlay** (`src/ui/loading_overlay.ts`): 追加スレッド取得中のローディング表示とエラー表示
- **Thread Merge** (`src/dom/thread_fetcher.ts`, `src/dom/merge.ts`): ふたば本家/ふたクロ/tsumanne/Futafuta ログを判定してレス要素を抽出し、No.昇順で重複除外しながらDOMへ挿入
- **ScrollController** (`src/ui/scroller.ts`): 開始位置（レス番号/日時/No.）の解決、一時停止/再開、速度調整、ステータスオーバーレイ表示を管理
- **ResponseUpdateManager** (`src/domain/response_update_manager.ts`): 10秒おきにレス差分を検出し、コントローラに追加
- **Timestamp Parsing** (`src/parsers/timestamp.ts`): `YY/MM/DD(曜)HH:MM:SS` と `YYYY/MM/DD HH:MM:SS` をパースし、曜日チェックはオプション

## Testing

Manual testing is primary: open a Futaba thread, paste bookmarklet in DevTools console, HTMLフォームで開始位置と速度・追加URLを入力し、ローディング後に x キーで開始する。No.重複除外とマルチフォーマットマージ（ふたば本家/ふたクロ/tsumanne/Futafuta）を確認。パーサーやタイミング計算を変える場合は `assets/fixtures/` にサンプルHTMLを保存し、Jest + jsdom で検証。

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
