# Design: リンク絶対化の実装

## Context
複数のスレッドをNo.昇順でマージする機能は実装済みだが、マージしたスレッド内の相対リンクが破綻する問題がある。これは、異なるベースURLを持つスレッドを1つのDOMに統合するため、相対URLが現在のページのベースURLで解決されてしまうことが原因。

実データで確認された相対URLパターン:
- tsumanne: ファイル名のみ（`1761814517439.jpg`, `1761814517439s.jpg`）
- ふたば本家: ルート相対パス（`/b/res/1368544718.htm`, `/b/thumb/1763368306577s.jpg`）
- ふたば本家: プロトコル相対URL（`//dec.2chan.net/85/futaba.htm`）
- Futafuta: ルート相対パス（`/b/src/1731744598843.jpg`, `/b/thumb/1731506577359s.jpg`）

実データで未確認: `<video>`, `<audio>`, `<source>`, `<area>`, `<object>`, `srcset`属性

制約:
- ブラウザのDOMParser APIを使用してHTMLをパースしている
- Node.cloneNode() でノードをクローンしている
- ブックマークレット環境（外部ライブラリは使用不可）

## Goals / Non-Goals

**Goals:**
- 外部スレッドから取り込んだ対象要素の属性に含まれる相対リンクを、元のスレッドのベースURLを基準とした絶対URLに変換する
- 絶対URLはそのまま保持する
- パフォーマンスへの影響を最小限に抑える
- エラーハンドリングを適切に行う（不正なURLはそのまま保持）

**Non-Goals:**
- 現在のページのDOMから直接キャプチャしたレスポンスの変換（ブラウザが正しく解決する）
- 対象要素リスト外の要素・属性（`<form action>`, `<iframe src>`, `<script src>` 等）
- JavaScriptコード内のURL参照
- CSSファイル・インラインスタイルの `url()` 関数内のURL
- `srcset` 属性（パース仕様が複雑で、不正確なパースによる破壊リスクがメリットを上回る）

## Decisions

### 決定1: リンク変換のタイミング
**選択**: ノードをクローンした直後、mergeIntoDom() に渡す前に変換する

**理由**:
- 各形式抽出関数で `cloneNodeGroup()` を呼び出した後に変換すれば、全形式で統一的に処理できる
- DOMに挿入する前に変換することで、captureResponses() が再実行されたときには既に絶対URLになっている

**却下した代替案**:
- DOMに挿入した後に変換: タイミングが遅すぎる
- fetchThreadHtml() の直後に変換: クローン済みノードを変更する方が効率的

### 決定2: URL解決方法
**選択**: 標準の `URL` コンストラクタ (`new URL(relativeUrl, baseUrl)`) を使用

**理由**:
- ブラウザネイティブAPIで、全ての相対URL解決ルール（`./`, `../`, `/`, `//`, クエリ、フラグメントなど）を正しく処理
- 不正なURLの場合はエラーをthrowするため、try-catchでハンドリング可能
- 外部ライブラリ不要

### 決定3: 対象となる要素と属性
**選択**: `<a href>`, `<img src>` を主要対象とし、その他の `src`/`href`/`poster`/`data` 系属性も防御的に対応。`srcset` は対象外。

| 要素 | 属性 | 実データでの確認 |
|------|------|-----------------|
| `<a>` | `href` | 確認済み（全形式） |
| `<img>` | `src` | 確認済み（全形式） |
| `<video>` | `src`, `poster` | 未確認（防御的対応） |
| `<audio>` | `src` | 未確認（防御的対応） |
| `<source>` | `src` | 未確認（防御的対応） |
| `<area>` | `href` | 未確認（防御的対応） |
| `<object>` | `data` | 未確認（防御的対応） |

**対象外:**
| 要素 | 属性 | 除外理由 |
|------|------|---------|
| `<img>`, `<source>` | `srcset` | パース仕様が複雑（カンマ区切り＋記述子、データURI内カンマ）で破壊リスクが高い |
| `<form>` | `action` | スレッドログ内でユーザー操作可能なフォームは不要 |
| `<iframe>` | `src` | スレッドログに含まれない |
| `<script>` | `src` | スレッドログに含まれない |
| `<link>` | `href` | スレッドログに含まれない |

### 決定4: 実装アプローチ
**選択**: 新しい関数 `convertRelativeUrls(nodes: Node[], baseUrl: string): void` を作成し、各形式の抽出関数から `cloneNodeGroup()` 直後に呼び出す

- `extractResponses()` および各形式抽出関数に `baseUrl` パラメータを追加
- 変換ロジックは単一関数に集約し、全形式で共有

### 決定5: ベースURL決定方法
**選択**: `response.url`（リダイレクト後の最終URL）を直接使用する。専用の決定関数は設けない。

**理由**:
- `return finalUrl;` しか行わない関数は不要（YAGNI）
- merge.ts の `fetchAllResponses()` で `finalUrl` を直接 `extractResponses()` に渡す

**却下した代替案**:
- `determineBaseUrl(doc, fetchUrl, finalUrl)` 関数: 実質 `return finalUrl` のみで過剰
- `<base>` タグを採用: 一貫性が失われ、ユーザー投稿にbase注入されるリスク
- fetch時のURLを使用: リダイレクト後と異なる場合にリンクが破綻

### 決定6: フラグメントのみのリンクの扱い
**選択**: `href="#..."` は変換対象外とし、そのまま保持する

**理由**:
- 絶対化すると元のスレッドへのリンクになり、マージ後のDOM内アンカーが機能しなくなる
- 実データではフラグメントのみリンクは未確認だが、防御的に対応

### 決定7: 特殊スキーム・データURIの扱い
**選択**: 変換結果のプロトコルが `http:` または `https:` 以外の場合、元の値を保持する。`data:` で始まるURLは `new URL()` を試行せずスキップする。

具体的な動作:
- `data:image/png;base64,...` → `data:` 判定でスキップ（URL解決を試みない）
- `javascript:void(0)` → `new URL()` 成功するがプロトコルが `javascript:` なので元の値を保持
- `mailto:user@example.com` → `new URL()` 成功するがプロトコルが `mailto:` なので元の値を保持
- `tel:+81-3-1234-5678` → 同上
- `blob:https://...` → 同上

### 決定8: エラーハンドリング
**選択**: URL解決に失敗した場合は元のURL文字列をそのまま保持し、エラーログを出力しない

### 決定9: srcset属性の除外
**選択**: `srcset` 属性は変換対象外とする

**理由**:
- 実データに `srcset` 属性は存在しない
- `srcset` のパース仕様が複雑: カンマ区切り＋記述子（`1x`, `2x`, `100w`）、データURI内のカンマとの区別が必要
- 単純な `split(',')` では記述子付きURLやデータURIを含むケースで壊れる
- 不正確なパースによる既存コンテンツの破壊リスクが、防御的対応のメリットを上回る
- 将来 `srcset` が実データに出現した場合は、その時点でHTML仕様に準拠したパーサーを実装する

## Implementation Outline

実装の方針のみ記載する（詳細コードは実装フェーズで決定）:

1. **fetchThreadHtml()** の戻り値を `{ doc, finalUrl }` に変更（`response.url` を返す）
2. **convertRelativeUrls()** を新規追加:
   - セレクタ + 属性名のペアリストを走査
   - `#` 始まり・`data:` 始まりはスキップ
   - `new URL(current, baseUrl)` で解決し、結果のプロトコルが `http:` / `https:` の場合のみ `.href` で上書き
   - 例外時・非HTTP(S)プロトコル時は元の値を保持
3. **extractResponses()** および各形式抽出関数に `baseUrl` 引数を追加し、`cloneNodeGroup()` 直後に `convertRelativeUrls()` を呼び出す
4. **merge.ts** の `fetchAllResponses()` で `finalUrl` を取得し `extractResponses()` に渡す

## Risks / Trade-offs

### パフォーマンスへの影響
querySelectorAll() を複数回実行するが、変換はマージ時の1回のみで、対象要素は数十〜数百程度。影響は軽微。

### 不正なURLの扱い
try-catchで捕捉し元の値を保持。特殊スキームはプロトコル判定で除外。

### fetchThreadHtml() の戻り値変更
export関数のため、全呼び出し箇所の更新が必要。影響範囲を実装時に要確認。

## Open Questions

なし（全て解決済み）
