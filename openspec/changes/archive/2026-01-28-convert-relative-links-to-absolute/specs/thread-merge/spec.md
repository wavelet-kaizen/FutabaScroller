# thread-merge Specification Delta

## ADDED Requirements

### Requirement: リンクの絶対URL変換
システムは、外部スレッドから取り込んだレスポンス要素内の**対象要素の属性に含まれる**非絶対URL値（相対パス `foo.jpg`、ドット相対パス `./foo` `../bar`、ルート相対パス `/b/res/...`、プロトコル相対URL `//host/...` を含む）を、元のスレッドのベースURLを基準とした完全な絶対URLに変換しなければならない（SHALL）。フラグメントのみのリンク（`#...`）、特殊スキーム（`javascript:`, `mailto:` 等）、データURI（`data:...`）は変換対象外とする。対象外の要素・属性に含まれるURLは変換しない。

#### Scenario: tsumanne形式のファイル名のみ相対URLが変換される
- **WHEN** tsumanneスレッド `https://tsumanne.net/si/data/2025/01/01/1234567/` から `<a href="1761814517439.jpg">` を含むレスポンスを取得する
- **THEN** システムはこの相対URLを `https://tsumanne.net/si/data/2025/01/01/1234567/1761814517439.jpg` に変換する
- **AND** `<img src="1761814517439s.jpg">` も同様に `https://tsumanne.net/si/data/2025/01/01/1234567/1761814517439s.jpg` に変換する
- **NOTE** 実データで最も破綻しやすいパターン（ファイル名のみの相対URL）

#### Scenario: 異なるホスト間マージ時にルート相対パスが正しく変換される
- **WHEN** Futafutaスレッド `https://futafuta.example.com/b/res/1253711563.htm` から `<img src="/b/thumb/1731506577359s.jpg">` を含むレスポンスを取得する
- **AND** マージ先がふたば本家 `https://may.2chan.net/b/res/9999.htm` である
- **THEN** システムはこのルート相対パスを `https://futafuta.example.com/b/thumb/1731506577359s.jpg` に変換する（元のホストを基準に解決）
- **AND** マージ先ホスト `may.2chan.net` ではなく、元のホストの画像が正しく参照される

#### Scenario: ふたば本家のルート相対パスリンクが変換される
- **WHEN** ふたば本家スレッド `https://may.2chan.net/b/res/1368544718.htm` から `<a href="/b/res/1373518198.htm">` を含むレスポンスを取得する
- **THEN** システムはこのルート相対パスを `https://may.2chan.net/b/res/1373518198.htm` に変換する
- **AND** `<img src="/b/thumb/1763368306577s.jpg">` も `https://may.2chan.net/b/thumb/1763368306577s.jpg` に変換する

#### Scenario: プロトコル相対URLが変換される
- **WHEN** ふたば本家スレッド `https://may.2chan.net/b/res/1234567890.htm` から `<a href="//dec.2chan.net/85/futaba.htm">` を含むレスポンスを取得する
- **THEN** システムはこのプロトコル相対URLを `https://dec.2chan.net/85/futaba.htm` に変換する（ベースURLのプロトコル `https:` を使用）

#### Scenario: 絶対URLはそのまま保持される
- **WHEN** 外部スレッドから `<a href="https://example.com/page.html">` を含むレスポンスを取得する
- **THEN** システムはこのURLをそのまま `https://example.com/page.html` として保持する

#### Scenario: クエリパラメータを含むルート相対パスの変換
- **WHEN** ふたば本家スレッド `https://may.2chan.net/b/res/1234567890.htm` から `<a href="/b/futaba.php?mode=cat&sort=1">` を含むレスポンスを取得する
- **THEN** システムはこのルート相対パスを `https://may.2chan.net/b/futaba.php?mode=cat&sort=1` に変換する
- **AND** クエリパラメータが正しく保持される

#### Scenario: フラグメントのみのリンクは変換対象外
- **WHEN** 外部スレッドから `<a href="#r5">` を含むレスポンスを取得する
- **THEN** システムはこのリンクを変換せず、`#r5` のまま保持する
- **AND** マージ後、このリンクは現在のページ内のアンカーとして機能する
- **NOTE** 実データではフラグメントのみリンクは未確認だが、防御的に対応する

#### Scenario: 特殊スキームのURLは変換しない
- **WHEN** 外部スレッドから `<a href="javascript:void(0)">` や `<a href="mailto:user@example.com">` を含むレスポンスを取得する
- **THEN** システムはこれらのURLを変換せず、そのまま保持する
- **NOTE** `javascript:`, `mailto:`, `tel:`, `blob:` 等のHTTP(S)以外のスキームを持つURLは変換対象外とする。判定は `new URL()` を試行し、結果のプロトコルが `http:` または `https:` 以外であれば元の値を保持する。

#### Scenario: URL解決に失敗した場合はそのまま保持される
- **WHEN** 外部スレッドから `<a href="http://[invalid">` のようにURL解決時に例外が発生するURLを含むレスポンスを取得する
- **THEN** システムは例外を捕捉し、元のURL文字列をそのまま保持する
- **AND** マージ処理全体は継続され、エラーにならない
- **AND** ユーザーには警告やエラーメッセージを表示しない

### Requirement: 変換対象要素と属性
システムは、以下に列挙する要素と属性のみをURL変換の対象としなければならない（SHALL）。列挙外の要素・属性（`<form action>`, `<iframe src>`, `<script src>` 等）は変換しない。

#### Scenario: 実データで確認済みの変換対象要素
- **WHEN** システムがレスポンス要素内のリンクを変換する
- **THEN** 以下の要素と属性を主要な対象とする:
  - `<a>` 要素の `href` 属性（スレ参照、画像リンク、ナビゲーション）
  - `<img>` 要素の `src` 属性（サムネイル、画像本体）
- **NOTE** 実データで相対URLとして使用されていることを確認済み

#### Scenario: 防御的に対応する変換対象要素
- **WHEN** システムがレスポンス要素内のリンクを変換する
- **THEN** 以下の要素と属性も対象とする（実データでは未確認だが、将来の変化に備える）:
  - `<video>` 要素の `src` 属性および `poster` 属性
  - `<audio>` 要素の `src` 属性
  - `<source>` 要素の `src` 属性
  - `<area>` 要素の `href` 属性
  - `<object>` 要素の `data` 属性
- **AND** データURI（`data:` スキームを使用するURL）は変換対象外とし、そのまま保持する

#### Scenario: srcset属性は対象外
- **WHEN** レスポンス要素内に `<img srcset="...">` や `<source srcset="...">` が存在する
- **THEN** システムは `srcset` 属性を変換対象としない
- **NOTE** 実データでは `srcset` 属性は未確認。`srcset` のパース仕様（カンマ区切り＋記述子、データURI内のカンマ）が複雑であり、不正確なパースによる破壊リスクが防御的対応のメリットを上回るため、対象外とする。

#### Scenario: ネストした要素も変換対象
- **WHEN** レスポンス要素内にネストした `<a>` や `<img>` が存在する（例: `<div><div><a href="...">`）
- **THEN** システムはネストの深さに関係なく、全ての対象要素を検出して変換する

#### Scenario: ルートノード自体も変換対象
- **WHEN** レスポンスのルートノード自体が `<a>` や `<img>` 要素である
- **THEN** システムはルートノード自体も変換対象として処理する

### Requirement: 変換のタイミング
システムは、外部スレッドのレスポンス要素をDOMにクローンした直後、現在のページのDOMに統合する前にリンク変換を実行しなければならない（SHALL）。

#### Scenario: DOM統合前に変換完了
- **WHEN** システムが外部スレッドからレスポンスを抽出する
- **THEN** レスポンス要素をクローンした直後に、リンク変換処理を実行する
- **AND** 変換完了後のレスポンス要素をDOM統合処理に渡す
- **AND** 現在のページのDOMに統合された時点で、既に全てのリンクが絶対URLになっている

#### Scenario: 全ログ形式で統一的に変換
- **WHEN** システムが ふたば本家、ふたクロ、tsumanne.net、Futafuta のいずれかの形式でレスポンスを抽出する
- **THEN** 全ての形式で同じリンク変換処理が実行される
- **AND** 形式によってリンク変換の有無や方法が異なることはない

### Requirement: ベースURLの決定
システムは、外部スレッドのベースURLとして、リダイレクト後の最終的なURL（`response.url`）を直接使用しなければならない（SHALL）。

#### Scenario: ベースURLの決定ルール
- **WHEN** システムが外部スレッドを取得してリンクを変換する
- **THEN** リダイレクト後の最終的なURL（`response.url`）をベースURLとして直接使用する
- **AND** HTML内に `<base href>` タグが存在する場合でも、それを無視して `response.url` を使用する（一貫性とセキュリティのため）

#### Scenario: リダイレクト発生時のベースURL
- **WHEN** `http://may.2chan.net/b/res/1234567890.htm` にアクセスし、`https://may.2chan.net/b/res/1234567890.htm` にリダイレクトされる
- **THEN** システムはリダイレクト後の `https://may.2chan.net/b/res/1234567890.htm` をベースURLとして使用する
- **AND** 相対URL `/b/src/123.jpg` は `https://may.2chan.net/b/src/123.jpg` に変換される（http ではなく https）

### Requirement: URL解決アルゴリズム
システムは、標準の `URL` コンストラクタを使用して非絶対URL値を完全な絶対URLに変換しなければならない（SHALL）。

#### Scenario: 標準URL APIによる解決
- **WHEN** システムが相対URL `/b/res/1373518198.htm` とベースURL `https://may.2chan.net/b/res/1368544718.htm` を受け取る
- **THEN** システムは標準の URL API を使用して相対URLを解決する
- **AND** 結果は `https://may.2chan.net/b/res/1373518198.htm` になる

#### Scenario: URL解決エラーのハンドリング
- **WHEN** URL解決中に例外が発生する（不正なURL形式など）
- **THEN** システムは例外を捕捉し、元のURL文字列をそのまま保持する（属性値を変更しない）
- **AND** マージ処理全体は継続され、エラーにならない

### Requirement: 変換対象はfetchで取得した外部スレッドのレスポンスのみ
システムは、`fetchThreadHtml()` で外部から取得しクローンしたレスポンス要素のみを変換対象としなければならない（SHALL）。現在のページのDOMから直接キャプチャしたレスポンス要素は変換してはならない（SHALL NOT）。

#### Scenario: 外部取得レスのみ変換する
- **WHEN** システムが `fetchThreadHtml()` で外部スレッドを取得し、レスポンス要素をクローンする
- **THEN** クローンしたレスポンス要素に対してリンク変換を実行する
- **AND** 現在のページのDOMから `captureResponses()` で取得したレスポンス要素には変換を実行しない
- **NOTE** 現在のページ内の相対リンクはブラウザのデフォルト動作で正しく解決されるため、変換不要
