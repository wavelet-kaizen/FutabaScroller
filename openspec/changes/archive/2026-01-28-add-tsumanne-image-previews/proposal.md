# Change: tsumanneの画像単体リンクにプレビュー追加

## Why
tsumanneログでは画像がリンクのみで表示され、内容確認に手間がかかる。画像リンク直下にプレビューを追加して閲覧性を向上させる。

## What Changes
- tsumanne形式のレス本文（blockquote）内で、同一blockquote内にimgタグが存在しない画像リンクにプレビューimgを挿入する
- 画像リンクが複数ある場合は全てプレビューする
- DOM末尾の `#attachment` 要素内のリンクは対象外とする（セクション除外）
- リンクURLに `#attachment` などのフラグメントが付いている場合は拡張子判定時に無視する
- 対象拡張子は `.jpg/.jpeg/.png/.gif/.webp` に限定する
- 対象範囲は tsumanne 形式のみとする

## Impact
- Affected specs: `tsumanne-image-preview`
- Affected code: `src/dom/thread_fetcher.ts`, `src/dom/capture.ts`（または同等のDOM処理ユーティリティ）
