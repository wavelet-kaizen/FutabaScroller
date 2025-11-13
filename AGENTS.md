# Repository Guidelines
必ず日本語で回答してください。

## Claude Code 連携ガイド

### 目的

ユーザーが 「Claude Codeと相談しながら進めて」 （または類似表現）と指示した場合、
Codex は Claude Code を随時呼び出しながら、複数ターンにわたる協業を行う。

### トリガー
• 正規表現: /Claude.*相談しながら/
• 一度トリガーした後は、ユーザーが明示的に終了を指示するまで 協業モード を維持する。

### 協業ワークフロー (ループ可)

1 PROMPT 準備 最新のユーザー要件(ユーザから提示された解析用データ、参照ファイルパス等はかならず渡すこと) + これまでの議論要約を $PROMPT に格納
2 Claude Code 呼び出し ターミナルで以下を実行すると Claude Code と対話できる。必要に応じ --max_tokens 等を追加。

```bash
claude -p --input-format text <<EOF
$PROMPT
EOF
```

3 出力貼り付け  Claude Code ➜ セクションに全文、長い場合は要約＋原文リンク
4 Codex コメント  Codex ➜ セクションで Claude Code の提案を分析・統合し、次アクションを提示
5 継続判定  ユーザー入力 or プラン継続で 1〜4 を繰り返す。「Codexコラボ終了」「ひとまずOK」等で通常モード復帰

形式テンプレート

**Claude Code ➜**
<Claude Code からの応答>
**Codex ➜**
<統合コメント & 次アクション>


## Project Structure & Module Organization
The repository currently contains a single bookmarklet at `futaba_scroller.js`, which runs directly in the browser. Keep browser-only helpers within this file until multiple features demand structure; at that point stage shared modules under `src/` and bundle or concatenate back into the bookmarklet before release. Stash walkthrough docs or future specs under `docs/`, and keep captured HTML fixtures or screenshots that support manual testing inside `assets/`.

## Build, Test, and Development Commands
Run `node --check futaba_scroller.js` to perform a quick syntax check before sharing updates. Format consistently with `npx prettier --tab-width 4 --write futaba_scroller.js` (install Prettier locally if it is not yet in `devDependencies`). When iterating in the browser, print the bookmarklet with `node -p "require('fs').readFileSync('futaba_scroller.js','utf8')"` and paste the output into the console to verify behavior live.

## Coding Style & Naming Conventions
Follow modern ES2020 syntax that Chromium, Firefox, and Safari handle without transpilation. Use 4 spaces, trailing commas for multiline literals, and descriptive names tied to domain behavior (e.g., `captureResponses`, `scrollToClosestResponse`). Prefer `const` for immutable bindings, reserve `let` for mutable state, and keep user-facing alerts in Japanese to match the Futaba interface.

## Testing Guidelines
Manual testing remains the baseline: open an active Futaba thread, paste the bookmarklet via DevTools, and confirm logs list timestamps in order before auto-scrolling. When adding parsing rules or timing math, mirror a sample thread in `assets/fixtures` and exercise the logic with a headless browser or Jest DOM harness; target high-confidence coverage for timestamp parsing and scroll selection. Document any new testing utilities in `docs/testing-notes.md` so other contributors can repeat the checks.

## Commit & Pull Request Guidelines
Use imperative, present-tense commit subjects under ~65 characters (`Improve timestamp parsing`). Explain the motivation, key changes, and manual verification in the body, linking issues with `Refs #123` when relevant. Pull requests should outline context, summarize the solution, list manual/automated test results, and attach before-and-after screenshots or console excerpts that demonstrate the scrolling timeline still matches the thread.

## Bookmarklet Packaging Tips
Keep the bookmarklet self-contained and avoid dependencies that require loaders or CSP changes. Before publishing, minify with a trusted local tool and double-check that multibyte characters survive the process. Provide both the raw JS file and the bookmark URL version so others can drag it directly into their bookmarks bar.
