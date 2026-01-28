## ADDED Requirements
### Requirement: tsumanne単体画像リンクのプレビュー表示
システムは、tsumanneログ形式のレス本文（blockquote）内に、同一blockquote内でimgタグが存在しない画像リンクがある場合、リンク直後に改行を挿入し、imgタグのプレビューを表示しなければならない（SHALL）。

#### Scenario: 画像リンクのみのblockquoteにプレビューを追加
- **WHEN** tsumanneログのblockquoteがテキストと画像リンク（例: `fu6083034.jpg`）を含み、同一blockquote内にimgタグが存在しない
- **THEN** システムは対象リンクの直後に改行を挿入し、同じURLをsrcにしたimgタグを続けて挿入する
- **AND** blockquote内に他のテキストが存在していても、画像リンクはプレビュー対象として扱う

#### Scenario: 複数の画像リンクを全てプレビュー
- **WHEN** 1つのblockquote内に `.jpg/.jpeg/.png/.gif/.webp` の画像リンクが複数存在し、処理開始時点のDOMにimgタグが存在しない
- **THEN** システムは各リンクの直後に改行とプレビューimgを挿入する

#### Scenario: imgタグが既に存在するblockquoteでは挿入しない
- **WHEN** blockquote内に処理開始時点のDOM由来のimgタグが存在する
- **THEN** システムは当該blockquote内の画像リンクに対してプレビューを追加しない

#### Scenario: 再実行時の重複挿入防止
- **WHEN** 同一のblockquoteが再度処理され、すでにプレビューimgが存在する
- **THEN** システムは追加のプレビューimgを挿入しない

#### Scenario: 対象外拡張子は無視する
- **WHEN** blockquote内のリンクが `.jpg/.jpeg/.png/.gif/.webp` 以外の拡張子である
- **THEN** システムはプレビューimgを挿入しない

#### Scenario: #attachment セクションは対象外
- **WHEN** リンクが DOM末尾の `#attachment` 要素内に存在する
- **THEN** システムはプレビューimgを挿入しない

#### Scenario: フラグメント付きURLでも拡張子判定する
- **WHEN** blockquote内の画像リンクURLが `foo.jpg#attachment` のようにフラグメントを含む
- **THEN** システムはフラグメントを無視して拡張子を判定し、対象拡張子であればプレビューimgを挿入する

#### Scenario: マージ後のtsumanneレスにも適用
- **WHEN** tsumanneログのレスが追加スレッド取り込みでDOMに統合された後に、当該レスが処理対象となる
- **THEN** そのblockquote内の単体画像リンクにプレビューimgを挿入する
- **AND** 現在のページがtsumanne形式の場合も同じルールで処理する

#### Scenario: 対象範囲はtsumanneのみ
- **WHEN** ログ形式が tsumanne 以外である
- **THEN** システムはプレビューimgを挿入しない
