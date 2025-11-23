# Capability: Thread Merge

複数スレッドのレスポンスを統合してシームレスに再生する機能。

## ADDED Requirements

### Requirement: 複数ログ形式の互換性
システムは、ふたば本家、ふたクロ、tsumanne.net、Futafuta の4つのログ形式に対応しなければならない（SHALL）。

#### Scenario: ログ形式の自動判定
- **WHEN** 外部スレッドのHTMLを取得する
- **THEN** システムは以下の優先順位でログ形式を判定する:
  1. `<title>` 要素のテキストに `Futafuta` を含む場合は Futafuta 形式と判定
  2. `<script src>` 属性に `tsumanne.net` を含む場合、または `.cnw` 要素のテキストに `ID:` が含まれる場合は tsumanne.net 形式と判定
  3. `.thre > div > table` セレクタで要素が見つかる場合は ふたクロ 形式と判定
  4. 上記に該当しない場合は ふたば本家 形式と判定
- **AND** 削除済みレスが0個の tsumanne.net アーカイブでも、スクリプトURL または ID付きタイムスタンプで正しく判定される
- **AND** Futafuta はスクリプト配置変更の影響を受けないよう、タイトル要素で判定する

#### Scenario: ふたば本家ログ形式の解析
- **WHEN** ふたば本家 (img.2chan.net) のログHTMLを取得する
- **THEN** システムは `.thre > table` セレクタでレスポンス要素を抽出する
- **AND** `<span class="cnw">` からタイムスタンプを取得する
- **AND** `<span class="cno">` から No. を取得する

#### Scenario: ふたクロログ形式の解析
- **WHEN** ふたクロのログHTMLを取得する
- **THEN** システムは `.thre > div > table` または `.thre > table` セレクタでレスポンス要素を抽出する
- **AND** `<div style="">` ラッパーがある場合はラッパーごとレス要素として扱い、DOM統合時も同じ構造で挿入する
- **AND** `<span class="cnw">`, `<span class="cno">` から タイムスタンプと No. を取得する

#### Scenario: tsumanne.netログ形式の解析
- **WHEN** tsumanne.net のログHTMLを取得する
- **THEN** システムは `.thre > table` セレクタでレスポンス要素を抽出する
- **AND** `<table border=0 class=deleted>` の削除済みレスは除外する
- **AND** `<span class="cnw">` に `ID:` が含まれる場合は `ID:` 以降を除去し、日時部分のみを解析する
- **AND** `<span class="cnw">`, `<span class="cno">` から タイムスタンプと No. を取得する

### Requirement: スレ主投稿のマージ
システムは、対応する全ログ形式で 0レス目(スレ主投稿) をマージ対象として扱わなければならない（SHALL）。

#### Scenario: ふたば本家/ふたクロ/tsumanne のスレ主統合
- **WHEN** ふたば本家・ふたクロ・tsumanne.net のスレッドを追加マージする
- **THEN** 最初のレス(table要素)を含む全レスを No. 昇順ソートの対象にし、既存DOMの重複No.がある場合は挿入をスキップする
- **AND** スレ主投稿も `.cnw` と `.cno` から時刻と No. を抽出して `captureResponses()` の出力に含まれる

#### Scenario: Futafuta のスレ主統合
- **WHEN** Futafuta スレッドを追加マージする
- **THEN** `.thre` 直下にあるスレ主投稿の連続ノード群（table以外のノードを含む）を一つのレスポンスとして保持し、No. 昇順ソート・重複除外の対象にする
- **AND** 挿入位置が既存の `<table>` 要素より後になっても、スレ主投稿が欠落しないようノード群をまとめて配置する
- **AND** `.cnw` と `.cno` から取得した時刻と No. を `captureResponses()` が解決できる状態でDOMに残す

#### Scenario: Futafutaログ形式の解析（スレ主投稿）
- **WHEN** Futafuta のログHTMLを取得する
- **THEN** システムは `.thre` コンテナの子ノード（`childNodes`）を順番に走査する
- **AND** 最初の `<table border="0">` 要素に到達するまでの全ての直下ノードをスレ主投稿として収集する（テキストノード、要素ノードを含む）
- **AND** 収集したノード群から `<span class="cnw">`, `<span class="cno">` でタイムスタンプと No. を抽出する
- **AND** テキストノード（例: "画像ファイル名："、"-(51291 B)"）も含めて保持する
- **AND** スレ主投稿は複数のDOMノードグループとして扱い、マージ時は順番に挿入する

#### Scenario: Futafutaログ形式の解析（返信レス）
- **WHEN** Futafuta のログHTMLから返信レスを抽出する
- **THEN** システムは `.thre > table[border="0"]` セレクタで返信レス要素を抽出する
- **AND** 各 `<table>` 要素から `<span class="cnw">`, `<span class="cno">` でタイムスタンプと No. を取得する
- **AND** タイムスタンプは `YY/MM/DD(曜)HH:MM:SS` 形式で解析する

### Requirement: 外部スレッド取得
システムは、指定されたURLから外部スレッドのHTMLを取得し、レスポンスを抽出しなければならない（SHALL）。

#### Scenario: 単一スレッドURL取得成功
- **WHEN** ユーザーが追加スレッドURLとして `https://may.2chan.net/b/res/1234567890.htm` を1つ指定する
- **THEN** システムはfetchでHTMLを取得し、DOMParserでパースする
- **AND** パース後、ログ形式を自動判定して適切なセレクタで `captureResponses()` を呼び出す

#### Scenario: 複数スレッドURL取得成功
- **WHEN** ユーザーが追加スレッドURLを3つ指定する
- **THEN** システムは指定順にfetchを実行し、各スレッドのレスポンスを抽出する
- **AND** 各スレッドのログ形式を個別に判定する（ふたば本家、ふたクロ、tsumanne.net、Futafuta を混在可能）

#### Scenario: スレッド取得失敗
- **WHEN** 指定URLがネットワークエラーまたはCORS制約で取得できない
- **THEN** システムはエラーメッセージ「スレッド {URL} を取得できませんでした」をユーザーに表示する
- **AND** マージ処理全体を中断し、スクロール開始処理を行わない

### Requirement: DOM統合
システムは、取得した外部スレッドのレスポンス要素を現在のタブのDOM末尾に挿入しなければならない（SHALL）。

#### Scenario: レスポンス要素のDOM挿入
- **WHEN** 外部スレッドから5つのレスポンスを抽出する
- **THEN** システムは現在のタブの `.thre` コンテナ末尾にレスポンス要素を順番に挿入する
- **AND** ふたクロ形式の `<div style="">` ラッパーがある場合は、ラッパーごと挿入する
- **AND** Futafuta 形式のスレ主投稿の場合は、収集した複数のDOMノード（テキストノード、要素ノードを含む）を順番に挿入する
- **AND** 挿入後、`captureResponses()` を再実行して統合されたレスポンス配列を取得する

#### Scenario: No.昇順での統合と重複排除
- **WHEN** ユーザーが追加スレッドURLを2つ指定する
- **THEN** システムは現在のスレッドと全ての追加スレッドのレスポンスを `No.` で昇順ソートする
- **AND** 既存DOM上に同一 `No.` が存在するレスポンスは再挿入しない（重複排除）
- **AND** ソート後のレスポンスを `.thre` コンテナに順番に挿入する
- **AND** tsumanne.net形式の削除済みレス (`class=deleted`) は挿入対象から除外する
- **AND** 異なるログ形式（ふたば本家、ふたクロ、tsumanne.net、Futafuta）のスレッドを混在してマージ可能

#### Scenario: マージ後のレスポンス再取得
- **WHEN** DOM統合が完了する
- **THEN** システムは `captureResponses()` を再実行してマージ済みレスポンス配列を取得する
- **AND** `captureResponses()` はログ形式を判定し、Futafutaの場合はスレ主投稿（`.thre` 直下）も含めて抽出する
- **AND** 取得したレスポンス配列を `ScrollController` のインスタンス化に使用する
- **AND** ユーザーが追加スレッド内の `No.` または日時を開始位置に指定した場合でも、正しく開始位置が解決される

### Requirement: スレッドマージ中の状態管理
システムは、外部スレッド取得中にローディング表示を行い、完了後に一時停止状態で待機しなければならない（SHALL）。

#### Scenario: マージ処理開始
- **WHEN** ユーザーがHTML入力UIで「開始」ボタンを押す
- **THEN** システムはローディングオーバーレイを表示し、「スレッド取得中...」を表示する
- **AND** 追加スレッドURLが指定されている場合、順番にfetchを実行する

#### Scenario: マージ処理完了
- **WHEN** 全ての追加スレッド取得とDOM統合が完了する
- **THEN** システムはローディングオーバーレイを非表示にする
- **AND** StatusOverlayに「準備完了、xキーでスクロール開始」を表示する
- **AND** ScrollControllerは起動せず、一時停止状態とする

#### Scenario: 追加スレッドなしの場合
- **WHEN** ユーザーが追加スレッドURLを入力しない
- **THEN** システムはローディング表示をスキップし、即座に一時停止状態で待機する

### Requirement: captureResponses() の混在形式対応
システムは、`captureResponses()` 関数でベースページの形式に関係なく、DOM内の全てのログ形式（ふたば本家、ふたクロ、tsumanne.net、Futafuta）のレスポンスを認識しなければならない（SHALL）。

#### Scenario: 単一形式ページでのレスポンスキャプチャ
- **WHEN** いずれかのログ形式（ふたば本家/ふたクロ/tsumanne.net/Futafuta）のページで `captureResponses()` を実行する
- **THEN** システムは `.thre` コンテナの `childNodes` を順番に走査する
- **AND** `<table>` 要素は返信レスとして扱い、内部の `.cnw` と `.cno` からタイムスタンプと No. を抽出する
- **AND** `<table>` ではない連続ノード群で `.cnw` と `.cno` を両方含むものを Futafuta のスレ主投稿として1レスポンスにまとめ、直後の `<table>` までをグループ化する
- **AND** 全てのレスポンス（スレ主投稿を含む）を配列に収集し、時刻と No. を保持する

#### Scenario: 混在形式でのレスポンスキャプチャ
- **WHEN** ふたば本家ページに Futafuta スレッドをマージした後に `captureResponses()` を再実行する
- **THEN** システムはベースページのタイトルに関係なく、DOM構造から各レスポンスを判定する
- **AND** ふたば本家の table 形式レスポンスを認識する
- **AND** Futafuta のスレ主投稿を、ページ先頭だけでなく DOM 中の任意位置に現れる非table連続ノード群として認識する
- **AND** Futafuta の返信レス（table 形式）を認識する
- **AND** 全ての形式を統合し、No.昇順でソートされたレスポンス配列を返す

#### Scenario: 複数Futafutaスレッドマージ後のキャプチャ
- **WHEN** 複数の Futafuta スレッドをマージした後に `captureResponses()` を再実行する
- **THEN** システムはマージ順に挿入された複数のスレ主投稿ノード群を、それぞれ独立したレスポンスとして取得する
- **AND** 各スレ主投稿のテキストノード（例: "画像ファイル名："、"-(51291 B)"）も保持する
- **AND** スレ主投稿が `<table>` より後にあっても `.cnw` と `.cno` から時刻と No. を抽出し、No.昇順でのタイムライン計算に利用できる配列を返す

### Requirement: 開始位置解決のタイミング
システムは、開始位置（レス番号/日時/No.）の解決を、スレッドマージおよびレスソートの完了後に実施しなければならない（SHALL）。

#### Scenario: マージ前の開始位置解決の禁止
- **WHEN** ユーザーが追加スレッドURLと開始位置（レス番号/日時/No.）を指定する
- **THEN** システムは入力値のバリデーションのみを実施し、開始位置の解決（範囲チェック、該当レスの検索、タイムスタンプの特定）は実施しない
- **AND** マージ処理とソート処理が完了するまで、開始位置の解決を保留する

#### Scenario: マージ完了後の開始位置解決
- **WHEN** スレッドマージとNo.昇順ソートが完了し、`captureResponses()` がマージ済みレスポンス配列を返す
- **THEN** システムは `resolveStartPosition()` を呼び出して開始位置を解決する
- **AND** レス番号指定の場合、マージ・ソート後の最終的な配列インデックスに基づいて該当レスを特定する
- **AND** 日時指定の場合、マージ・ソート後の配列から該当する日時を検索する
- **AND** No.指定の場合、マージ・ソート後のDOM内から該当するNo.を検索する
- **AND** 範囲チェック（レス番号が配列長を超える、No.が見つからないなど）は、マージ・ソート後の最終状態で実施する

#### Scenario: ソートによる順序変更時の挙動
- **WHEN** 現在のスレッドが時系列的に後で、追加スレッドが時系列的に前の場合
- **THEN** No.昇順ソートにより、追加スレッドのレスが現在のスレッドのレスより前に配置される
- **AND** レス番号指定の場合、ソート後の配列での位置に基づいて開始レスが決定される（入力時の位置とは異なる可能性がある）
- **AND** No.指定または日時指定の場合、ソートに関係なく該当するNo.または日時のレスが正しく検索される

#### Scenario: マージなしの場合の開始位置解決
- **WHEN** ユーザーが追加スレッドURLを指定しない
- **THEN** システムは現在のスレッドのみで `captureResponses()` を実行する
- **AND** マージ処理をスキップし、即座に `resolveStartPosition()` を呼び出して開始位置を解決する
- **AND** レス番号/日時/No.のいずれの形式でも、現在のスレッドのレスポンス配列に基づいて解決される

### Requirement: 開始位置解決のエラー分類とインターフェース
システムは、`resolveStartPosition()` が失敗した場合、エラーの種別を明確に区別して呼び出し側に通知しなければならない（SHALL）。

#### Scenario: 開始位置解決の戻り値インターフェース
- **WHEN** システムが `resolveStartPosition(settings: ThreadSettings, responses: ResponseEntry[])` を呼び出す
- **THEN** 戻り値は `Result<Date, StartPositionError>` 型である
- **AND** 成功時は `{ success: true, value: Date }` 形式の結果を返す
- **AND** 失敗時は `{ success: false, error: StartPositionError }` 形式の結果を返す
- **AND** `Result<T, E>` 型は既存のプロジェクト共通型（`src/types.ts` で定義）を使用する

#### Scenario: レス番号範囲外エラーの分類
- **WHEN** レス番号指定（`startMode === 'index'`）で、指定された値がマージ済み配列の範囲外である（`startValue < 1` または `startValue > responses.length`）
- **THEN** `resolveStartPosition()` は以下のエラーを返す:
  - `error.type = 'index_out_of_range'`
  - `error.message = 'レス番号が範囲外です（1〜{responses.length}）'`
  - `error.validRange = { min: 1, max: responses.length }`

#### Scenario: No.未発見エラーの分類
- **WHEN** No.指定（`startMode === 'no'`）で、指定されたNo.がマージ済みDOM内に存在しない
- **THEN** `resolveStartPosition()` は以下のエラーを返す:
  - `error.type = 'no_not_found'`
  - `error.message = '指定されたNo.が見つかりません'`
  - `error.searchedNo = startValue`（検索したNo.の値）

#### Scenario: 日時パース失敗エラーの分類
- **WHEN** 日時指定（`startMode === 'timestamp'`）で、指定された日時文字列がパース不可能である
- **THEN** `resolveStartPosition()` は以下のエラーを返す:
  - `error.type = 'timestamp_parse_error'`
  - `error.message = '日時形式が不正です（例: 25/11/16(日)22:48:03 または 2025/11/16 22:48:03）'`
  - `error.inputValue = startValue`（入力された日時文字列）

#### Scenario: 日時指定で該当レスが存在しない場合（スレッド開始前）
- **WHEN** 日時指定（`startMode === 'timestamp'`）で、指定された日時がスレッドの最初のレスより前である
- **THEN** `resolveStartPosition()` は成功として、パースした日時を開始時刻として返す（`{ success: true, value: parsedDate }`）
- **AND** スクロール処理は指定された日時から開始され、最初にその日時以降のレス（スレッドの最初のレス）が表示されるまで待機する
- **AND** これはエラーではなく正常系として扱う

#### Scenario: 日時指定で該当レスが存在しない場合（スレッド終了後）
- **WHEN** 日時指定（`startMode === 'timestamp'`）で、指定された日時がスレッドの最後のレスより後である
- **THEN** `resolveStartPosition()` は成功として、パースした日時を開始時刻として返す（`{ success: true, value: parsedDate }`）
- **AND** スクロール処理は開始時（または x キー押下時）に、スレッドの最後のレスへ即座にスクロールする
- **AND** タイムラインは終了状態として扱い、それ以上のスクロールは発生しない
- **AND** StatusOverlay に「タイムライン終了」等のメッセージを表示する（オプション、UX向上のため）
- **AND** これはエラーではなく正常系として扱う

#### Scenario: エラー型の定義
- **WHEN** システムが開始位置解決のエラーを扱う
- **THEN** `StartPositionError` 型は以下の構造を持つ:
  ```typescript
  type StartPositionError =
    | { type: 'index_out_of_range'; message: string; validRange: { min: number; max: number } }
    | { type: 'no_not_found'; message: string; searchedNo: string }
    | { type: 'timestamp_parse_error'; message: string; inputValue: string }
  ```
- **AND** UIレイヤーは `error.type` に応じて適切なエラーメッセージを表示し、フォームを再表示する
