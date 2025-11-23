# Implementation Tasks

## 1. 型定義の拡張
- [x] 1.1 `src/types.ts` の `ThreadSettings` に以下を追加:
  - `startMode: 'index' | 'timestamp' | 'no'`
  - `startValue: number | string`
  - `additionalThreadUrls: string[]`
- [x] 1.2 既存の `startResponseIndex` を非推奨にせず、`startMode === 'index'` の場合のみ使用するよう変更
- [x] 1.3 型定義のテストを `tests/types.test.ts` に追加（型チェックのみ）

## 2. タイムスタンプパーサーの拡張
- [x] 2.1 `src/parsers/timestamp.ts` の `parseTimestamp()` を拡張:
  - `YY/MM/DD(曜)HH:MM:SS` 形式に加えて `YYYY/MM/DD HH:MM:SS` 形式をサポート
  - 曜日チェックを省略可能にする（曜日がない形式では検証しない）
  - または専用の `parseFlexibleTimestamp()` を追加して2形式に対応
- [x] 2.2 `tests/parsers/timestamp.test.ts` でユニットテストを追加:
  - 既存の `YY/MM/DD(曜)HH:MM:SS` 形式のテスト（曜日検証あり）
  - 新しい `YYYY/MM/DD HH:MM:SS` 形式のテスト（曜日検証なし）
  - 不正な形式のエラーケース

## 3. HTML入力UIの実装
- [x] 3.1 `src/ui/input_form.ts` を新規作成し、`InputFormOverlay` クラスを実装
  - フォームHTML生成
  - ラジオボタンによる開始位置形式の選択
  - テキストエリアでの追加URL入力
  - バリデーション（速度倍率、URL形式など）
  - 再実行時に既存オーバーレイを破棄してから再生成（初期状態へリセット）
- [x] 3.2 `src/ui/input_form.ts` のCSSスタイルを追加（既存オーバーレイと一貫性を保つ）
- [x] 3.3 `tests/ui/input_form.test.ts` でユニットテストを追加
  - フォーム表示・非表示
  - 入力値の取得と検証
  - キャンセル処理
  - 再実行時の初期化確認

## 4. ローディングUIの実装
- [x] 4.1 `src/ui/loading_overlay.ts` を新規作成し、`LoadingOverlay` クラスを実装
  - 「スレッド取得中...」テキスト表示
  - 回転アニメーション（CSS `@keyframes`）
  - 進捗表示（「1/3」形式）
  - CORS/取得失敗時のエラーメッセージ表示（続行ボタンなし、全体中断）
- [x] 4.2 CSSスタイルとアニメーションを追加
- [x] 4.3 `tests/ui/loading_overlay.test.ts` でユニットテストを追加

## 5. 外部スレッド取得とDOM統合
- [x] 5.1 `src/dom/thread_fetcher.ts` を新規作成し、以下を実装:
  - `fetchThreadHtml(url: string): Promise<Document>` - fetchとDOMParser
  - `detectLogFormat(doc: Document): 'futaba' | 'futaclo' | 'tsumanne' | 'futafuta'` - ログ形式の自動判定（優先順位順）
    1. Futafuta: `<title>` 要素のテキストに `Futafuta` を含む場合
    2. tsumanne.net: `<script src>` 属性に `tsumanne.net` を含む、または `.cnw` 要素のテキストに `ID:` が含まれる場合
    3. ふたクロ: `.thre > div > table` が存在する場合
    4. ふたば本家: 上記に該当しない場合（デフォルト）
  - `extractResponses(doc: Document, format: LogFormat): ResponseElement[]` - ログ形式に応じたレスポンス要素の抽出
    - **ふたば本家**: `.thre > table` セレクタでレスポンス要素を抽出し、`<span class="cnw">` と `<span class="cno">` から情報を取得
    - **ふたクロ**: `.thre > div > table` または `.thre > table` でレスポンス要素を抽出し、`<div style="">` ラッパーがある場合はラッパーごとレス要素として扱う（DOM統合時も保持する）
    - **tsumanne.net**: `.thre > table` でレスポンス要素を抽出し、`<table border=0 class=deleted>` の削除済みレスは除外、`<span class="cnw">` に `ID:` が含まれる場合は日時部分のみを抽出してパース
    - **Futafuta**: スレ主投稿は `.thre` 直下の子ノード（`childNodes`）から `<table>` 以外の連続ノード群で `.cnw` / `.cno` を含むものを検出して複数ノードグループとして扱う（テキストノード、要素ノードを含む）。返信レスは `.thre > table[border="0"]` で抽出し、各レスから `<span class="cnw">` と `<span class="cno">` から情報を取得
  - ResponseElement 型: `{ elements: HTMLElement[], timestamp: Date, no: string }` - 単一または複数のDOM要素をグループ化
  - エラーハンドリング（CORS、ネットワークエラー）: 失敗したURLを返して全体中断
- [x] 5.2 `src/dom/merge.ts` を新規作成し、以下を実装:
  - `mergeThreads(urls: string[], loadingOverlay: LoadingOverlay, updateManager: ResponseUpdateManager): Promise<ResponseEntry[]>` - 複数スレッド取得とDOM挿入
  - 各スレッドのログ形式を個別に判定し、適切な抽出方法を適用
  - DOM末尾への要素挿入（`.thre` コンテナ）
    - ふたクロ形式の場合、`<div style="">` ラッパーごと挿入（既存DOMの構造を可能な限り保持）
    - tsumanne.net形式の削除済みレス (`class=deleted`) は挿入対象から除外
  - `No.` 昇順でソートし、既存DOMと新規レス間で `No.` 重複を除外
  - マージ中は `ResponseUpdateManager` のポーリングを停止し、終了後に再開
  - **DOM統合完了後、`captureResponses()` を再実行してマージ済みレスポンス配列を返す**
- [x] 5.3 `tests/dom/thread_fetcher.test.ts` でユニットテストを追加（fetchモック使用）
  - ログ形式の自動判定:
    - Futafuta 判定（`<title>` 要素に `Futafuta` を含む）
    - tsumanne.net 判定（スクリプトURL方式、ID付きタイムスタンプ方式、削除済みレスが0個でも判定成功）
    - ふたクロ判定（`.thre > div > table` 存在確認）
    - ふたば本家判定（デフォルト）
  - 各ログ形式からのレスポンス抽出
  - ふたクロ形式の `<div style="">` ラッパー処理
  - tsumanne.net形式の `class=deleted` 除外と `ID:` 付きタイムスタンプのパース
  - Futafuta形式のスレ主投稿（複数ノードグループ、テキストノードを含む）と返信レスの抽出
  - ResponseElement 型の複数ノードグループ化の確認
  - テキストノード（"画像ファイル名："、"-(51291 B)"）が保持されることの確認
- [x] 5.4 `tests/dom/merge.test.ts` でユニットテストを追加（jsdomでDOM操作検証）
  - `No.` 重複排除と昇順挿入の確認
  - 0レス目（ふたば本家/ふたクロ/tsumanne）を含めた昇順挿入・重複除外の確認
  - マージ中のポーリング停止/再開の確認
  - マージ後のレスポンス再取得の確認
  - 異なるログ形式のスレッド間でのマージ（例: ふたば本家 + ふたクロ + Futafuta）
  - ふたクロ形式のラッパーごとDOM挿入の確認
  - tsumanne.net形式の削除済みレスが挿入されないことの確認
  - Futafuta形式のスレ主投稿（複数ノードグループ、テキストノードを含む）の順番挿入確認
  - テキストノードが失われずに挿入されることの確認
  - Futafuta形式の返信レスの統合確認

## 5.5. captureResponses() の混在形式対応
- [x] 5.5.1 `src/dom/capture.ts` の `captureResponses()` を拡張:
  - **ベースページの形式（タイトル）に関係なく、DOM構造から各レスポンスを判定**
  - `.thre` コンテナの全ての子ノード（`childNodes`）を順番に走査
  - 各ノード/ノードグループを以下のルールで判定:
    - **Futafutaスレ主投稿**: `.thre` 直下で、`.cnw` と `.cno` を両方含む `<table>` 以外の連続ノードグループ（テキストノード含む）。グループは次の `<table>` 直前までを1レスポンスとしてまとめ、DOM中の任意位置に複数存在しても検出する
    - **table形式レス**: `<table>` 要素（ふたば本家、ふたクロ、tsumanne.net、Futafuta返信レスすべて）
  - 各ノード/グループから `.cnw` と `.cno` を探してタイムスタンプとNo.を抽出
  - テキストノード（例: "画像ファイル名："、"-(51291 B)"）も保持する
  - 全てのレスポンスを統合して配列を生成
  - **重要**: ふたば本家ページにFutafutaスレッドをマージした場合でも、Futafutaのスレ主投稿（table外）がDOM中のどの位置にあっても認識できること
- [x] 5.5.2 `tests/dom/capture.test.ts` を更新:
  - 単一形式でのレスポンスキャプチャテスト（ふたば本家/ふたクロ/tsumanne.net/Futafuta）
  - Futafuta形式のスレ主投稿抽出確認（テキストノード含む）
  - テキストノード（"画像ファイル名："、"-(51291 B)"）が保持されることを確認
  - **混在形式でのレスポンスキャプチャテスト（ふたば本家ページ + Futafutaスレッド）**:
    - ふたば本家の table 形式レスポンスが認識されることを確認
    - Futafuta のスレ主投稿（table外の連続ノードグループ）が認識されることを確認（DOM途中に挿入されたケースを含む）
    - Futafuta の返信レス（table形式）が認識されることを確認
    - 全ての形式が統合され、No.昇順でソートされることを確認
  - 複数Futafutaスレッドマージ後のキャプチャテスト:
    - 各Futafutaスレッドのスレ主投稿が個別に認識されることを確認（スレ主が `<table>` 後に現れる場合を含む）
    - マージ順に挿入された複数のスレ主投稿を全て取得できることを確認

## 6. 開始位置指定の拡張
- [x] 6.1 `src/domain/start_position.ts` を新規作成し、以下を実装:
  - `resolveStartPosition(settings: ThreadSettings, responses: ResponseEntry[]): Date | null`
  - `index` モード: 既存のindex → timestamp変換
  - `timestamp` モード: parseTimestamp()で解析（`YY/MM/DD(曜)HH:MM:SS` または `YYYY/MM/DD HH:MM:SS`、曜日チェックなし）
  - `no` モード: DOM内のNo.検索（`.cno` テキストから抽出）
  - `timestamp` モードでは拡張版 `parseTimestamp()` または `parseFlexibleTimestamp()` を使用
- [x] 6.2 `tests/domain/start_position.test.ts` でユニットテストを追加
  - 各モードの動作検証
  - No.が見つからない場合のエラー
  - 4桁年フォーマットと曜日無視の検証

## 7. ScrollController の変更
- [x] 7.1 `src/ui/scroller.ts` の `start()` メソッドを変更:
  - `ThreadSettings.startMode` に基づいて開始時刻を取得
  - `resolveStartPosition()` を呼び出して開始時刻を決定
- [x] 7.2 既存のテスト `tests/ui/scroller.test.ts` を更新（新しいstartMode対応）
- [x] 7.3 再実行時に速度・一時停止・ポーリング状態が初期化されることをテスト
    - [x] 7.4 `src/ui/scroller.ts` の `tick()` メソッドを変更:
      - **日時指定でスレッド終了後の時刻を指定した場合の処理を追加**
      - `findPreviousResponse()` が `null` を返し、かつ `currentThreadTime` がスレッドの最後のレスのタイムスタンプより後の場合:
        - スレッドの最後のレスへ即座にスクロール
        - タイムラインを終了状態として扱い、それ以上のスクロールを発生させない（フラグを設定）
        - StatusOverlay に「タイムライン終了」等のメッセージを表示（オプション）
      - 無限待機を防ぐための終了判定ロジックを追加
    - [x] 7.5 `tests/ui/scroller.test.ts` を更新:
      - 日時指定でスレッド終了後の時刻を指定した場合、最後のレスへスクロールし、タイムラインが終了することを確認
      - 無限待機が発生しないことを確認

## 8. main.ts の変更
- [x] 8.1 `src/main.ts` を変更:
  - `promptUserForSettings()` を `InputFormOverlay` に置き換え
  - `ThreadSettings.additionalThreadUrls` が空でない場合、`LoadingOverlay` を表示して `mergeThreads()` を呼び出す
  - **`mergeThreads()` が返すマージ済みレスポンス配列を使って `ScrollController` をインスタンス化**
  - マージ完了後、`controller.start()` を呼ばず、StatusOverlayに「準備完了、xキーでスクロール開始」を表示
  - マージ中に `ResponseUpdateManager` のポーリングを停止し、完了後に再開
  - 取得失敗時はエラー表示して全体キャンセル（部分続行なし）
- [x] 8.2 `tests/main.test.ts` を更新（新しいフロー対応）
  - マージ失敗時の全体中断とポーリング再開の確認
  - 再実行時の初期化確認
  - マージ後のレスポンスが ScrollController に正しく渡されることを確認

## 9. バリデーションの追加
- [x] 9.1 `src/domain/validation.ts` に以下を追加:
  - `validateTimestamp(timestamp: string): Result<Date, ValidationError>` - 日時形式検証（拡張版parseTimestampを呼び出し）
  - `validateNo(no: string): Result<string, ValidationError>` - No.形式検証（`No.` プレフィックスチェック、数字のみ抽出）
  - `validateUrl(url: string): Result<string, ValidationError>` - URL形式検証
- [x] 9.2 `tests/domain/validation.test.ts` を更新

## 10. ドキュメント更新
- [x] 10.1 `openspec/project.md` の「主な機能」セクションに複数スレッドマージ機能を追加
- [x] 10.2 `openspec/project.md` のディレクトリ構造を更新（新規ファイル追加）
- [x] 10.3 CLAUDE.md の使用方法セクションを更新（新しい入力UIの説明）
- [x] 10.4 再実行時の初期化方針と重複除外について追記
- [x] 10.5 `openspec/project.md` と CLAUDE.md を Futafuta 対応（4つのログ形式）に更新
- [x] 10.6 `captureResponses()` の混在形式対応について追記:
  - ベースページの形式に関係なく、DOM構造から各レスポンスを判定すること
  - 混在形式（ふたば本家ページ + Futafutaスレッド）での動作
  - `childNodes` 走査による統一的な処理

## 11. 開始位置解決のタイミング修正とエラーハンドリング
    - [x] 11.1 `src/main.ts` を変更:
      - マージ処理の前に `resolveStartPosition()` を呼び出していないことを確認
      - `mergeThreads()` からマージ済みレスポンス配列を取得した後に `resolveStartPosition()` を呼び出すよう修正
      - マージなし（`additionalThreadUrls` が空）の場合も、`captureResponses()` 実行後に `resolveStartPosition()` を呼び出すよう統一
      - **`resolveStartPosition()` が失敗した場合（レス番号範囲外、No.未発見、日時パース失敗）、ローディングオーバーレイを非表示にし、InputFormOverlayを直前の入力内容とエラーメッセージ付きで再表示する**
      - **スクロール処理を開始せず、ユーザーの再入力を待つ**
    - [x] 11.2 `src/ui/input_form.ts` のバリデーションとエラー表示を変更:
      - 入力値の形式バリデーション（数値かどうか、URL形式かどうか）のみを実施
      - 開始位置の解決（レス番号の範囲チェック、No.の存在確認）はマージ後に延期
      - バリデーションエラーはフォーム内で表示し、解決エラーはマージ後のエラーハンドリングで表示
      - **新しいメソッド `showWithError(settings: ThreadSettings, errorMessage: string, errorField: 'startValue' | 'speedMultiplier' | 'urls')` を追加**
        - 直前の入力内容を復元してフォームを再表示
        - 指定されたフィールドにエラーメッセージを表示
        - 他のフィールドは編集可能だが、デフォルト値は直前の入力内容
    - [x] 11.3 `src/domain/start_position.ts` の `resolveStartPosition()` を変更:
      - マージ・ソート後の最終的なレスポンス配列を受け取ることを明示
      - レス番号指定の範囲チェックを、受け取った配列の長さに基づいて実施
      - No.指定の存在確認を、受け取った配列（マージ後のDOM状態）に基づいて実施
      - 日時指定で該当レスが存在しない場合、パースした日時を成功として返す（正常系として扱う）
        - スレッド開始前の日時: 正常系として扱い、最初のレスまで待機
        - スレッド終了後の日時: 正常系として扱い、最後のレスへ即座にスクロール（`ScrollController` 側で判定・処理）
      - **失敗時に詳細なエラー情報を返す（`Result<Date, StartPositionError>` 型）**
        - `Result<T, E>` 型は既存のプロジェクト共通型（`src/types.ts` で定義）を使用
        - `StartPositionError` に `type: 'index_out_of_range' | 'no_not_found' | 'timestamp_parse_error'` と `message`、および各エラー種別に応じた追加情報を含める
        - レス番号範囲外: `validRange: { min: number; max: number }`
        - No.未発見: `searchedNo: string`
        - 日時パース失敗: `inputValue: string`
    - [x] 11.4 `tests/main.test.ts` を更新:
      - マージ前に `resolveStartPosition()` が呼ばれないことを確認
      - マージ後に `resolveStartPosition()` が呼ばれ、マージ済み配列が渡されることを確認
      - ソートによる順序変更時、レス番号指定がソート後の位置で解決されることを確認
      - **日時指定で該当レスが存在しない場合、`resolveStartPosition()` が成功を返し（`success: true`）、エラーハンドリングが発動しないことを確認**
      - **`resolveStartPosition()` が失敗した場合（レス番号範囲外、No.未発見、日時パース失敗）、InputFormOverlay が再表示され、エラーメッセージが表示されることを確認**
      - **再入力後、正常に処理が進むことを確認**
    - [x] 11.5 `tests/domain/start_position.test.ts` を更新:
      - マージ後の配列を想定したテストケースを追加
      - ソート後の配列でのレス番号解決をテスト
      - No.指定と日時指定がソートの影響を受けないことを確認
      - **日時指定で該当レスが存在しない場合、パースした日時が成功として返されることを確認（正常系テスト）**
        - スレッド開始前の日時: 成功として返される
        - スレッド終了後の日時: 成功として返される（`ScrollController` 側で終了判定）
      - **レス番号範囲外、No.未発見、日時パース失敗の各エラーケースをテスト**
      - **エラー時に適切な `StartPositionError` が返されることを確認**
        - `Result<Date, StartPositionError>` 型の `success: false` 分岐をテスト
        - 各エラー種別（`index_out_of_range`, `no_not_found`, `timestamp_parse_error`）で適切な追加情報が含まれることを確認
    - [x] 11.6 `tests/ui/input_form.test.ts` を更新:
      - **`showWithError()` メソッドのテストを追加**
        - 直前の入力内容が復元されることを確認
        - 指定されたフィールドにエラーメッセージが表示されることを確認
        - 他のフィールドは編集可能で、デフォルト値が保持されることを確認
    - [x] 11.7 ドキュメント更新:
      - `openspec/changes/add-multi-thread-merge/design.md` に開始位置解決タイミングとエラーハンドリングの設計方針を追記
      - CLAUDE.md の操作メモに「開始位置はマージ完了後に解決され、失敗時はフォームに戻る」旨を追記

## 12. 統合テストと手動検証
    - [x] 12.1 全ユニットテストがパスすることを確認（`npm test`）- **11.x の実装変更後に再実行**
    - [x] 12.2 型チェックがパスすることを確認（`npm run type-check`）- **11.x の実装変更後に再実行**
    - [x] 12.3 ビルドが成功することを確認（`npm run build`）- **11.x の実装変更後に再実行**
- [x] 12.4 手動テスト:
  - ふたばスレッドでブックマークレット実行
  - HTML入力UIで各形式（レス番号/日時/No.）を試す
  - 追加スレッドURLを1つ、複数、なしで試す
  - ローディング表示の確認
  - xキーでスクロール開始の確認
  - エラーケース（無効なURL、存在しないNo.、CORS失敗など）の確認
  - 一度マージ＆再生したあと、再実行して開始時刻のみ変更するパスの確認
  - **開始位置解決タイミングの確認（新規追加）**:
    - 時系列的に後のスレッドで起動し、レス番号50を指定
    - 時系列的に前のスレッドを追加してマージ
    - ソート後、レス番号50が正しくソート後の50番目のレスを指すことを確認
    - No.指定と日時指定は、ソートに関係なく正しく該当レスを見つけることを確認
  - **日時指定で該当レスがない場合の正常系確認（新規追加）**:
    - **スレッド開始前の日時を指定した場合**:
      - スレッドの最初のレスより前の日時（例: スレ開始の1時間前）を指定
      - マージ完了後、エラーにならず「準備完了、xキーでスクロール開始」が表示されることを確認
      - xキーで再生を開始し、指定した日時から再生が始まり、最初のレスが表示されるまで待機することを確認
    - **スレッド終了後の日時を指定した場合**:
      - スレッドの最後のレスより後の日時（例: 最後のレスの1時間後）を指定
      - マージ完了後、エラーにならず「準備完了、xキーでスクロール開始」が表示されることを確認
      - xキーで再生を開始し、スレッドの最後のレスへ即座にスクロールすることを確認
      - タイムラインが終了状態として扱われ、それ以上のスクロールが発生しないことを確認
      - StatusOverlay に「タイムライン終了」等のメッセージが表示されることを確認（オプション）
      - 無限待機が発生しないことを確認
  - **開始位置解決失敗時のエラーハンドリング確認（新規追加）**:
    - レス番号を範囲外（例: 999999）に指定してマージ完了まで進む
    - エラーメッセージ「レス番号が範囲外です（1〜{実際の配列長}）」がフォームに表示されることを確認
    - 直前の入力内容（速度、追加URL）が復元されていることを確認
    - レス番号を修正して再度「開始」をクリックし、正常に処理が進むことを確認
    - 存在しないNo.を指定した場合、「指定されたNo.が見つかりません」エラーが表示されることを確認
    - 不正な日時形式を指定した場合、「日時形式が不正です」エラーが表示されることを確認
  - 4つのログ形式での動作確認:
    - ふたば本家ログ形式でのマージとスクロール
    - ふたクロログ形式でのマージとスクロール（`<div style="">` ラッパー保持確認）
    - tsumanne.netログ形式でのマージとスクロール（削除済みレス除外確認）
    - Futafutaログ形式でのマージとスクロール（スレ主投稿の複数ノードグループ挿入と返信レスの統合確認、No.昇順の保持確認）
    - **Futafutaページでスレ主投稿がスキップされず、正しく認識されることを確認**
    - **Futafutaページでテキストノード（"画像ファイル名："など）が失われないことを確認**
    - **FutafutaページでNo./日時ベースの開始位置指定が機能することを確認**
    - **混在形式での動作確認（最重要）**:
      - ふたば本家ページでFutafutaスレッドをマージし、Futafutaのスレ主投稿（table外）が正しく認識されることを確認
      - マージ後のNo./日時ベースの開始位置指定がFutafutaコンテンツでも機能することを確認
      - ふたクロページでFutafutaスレッドをマージし、両形式が共存することを確認
    - 異なるログ形式のスレッド間でのマージ（例: ふたば本家 + ふたクロ + Futafuta）
