# Project Context

## Purpose
FutabaScroller は、双葉☆ちゃんねる（Futaba）の画像掲示板スレッドを、投稿タイムスタンプに基づいて自動スクロールするブックマークレットです。レスのタイムスタンプを解析し、ユーザーが選択した開始地点と再生速度で、スレッドがリアルタイムで展開されていく様子を再現します。

主な機能:
- スレッド内の全レスポンスのタイムスタンプをキャプチャ
- HTML入力フォームで開始位置（レス番号/日時/No.）と速度、追加スレッドURLを入力
- 追加スレッドのDOM統合と No. 昇順マージ（重複No.は除外）
- 4つのログ形式に対応（ふたば本家、ふたクロ、tsumanne.net、Futafuta）
- タイムスタンプベースで自動スクロール
- 起動時は一時停止状態で準備し、xキーで開始
- キーボードショートカットによる速度調整
- UI表示モードの選択（自動非表示/常駐表示）。常駐表示では浮動コントロールパネルを常時表示し、タッチ操作で再生/一時停止や速度変更が可能
- ローディング/ステータスオーバーレイ表示

## Tech Stack
- **TypeScript (5.7+)** - 型安全な開発、モジュール化されたコード
- **esbuild** - 高速バンドラー（TypeScript → IIFE 形式にバンドル）
- **Jest + jsdom** - 自動テストフレームワーク（ドメイン・UI・パーサーをテスト）
- **ESLint** - コード品質チェック（TypeScript ESLint プラグイン使用）
- **Prettier** - コードフォーマッター（4スペースインデント）
- **Node.js** - 開発ツール（型チェック、ビルド、テスト実行）
- **Bookmarklet** - 配布形式（バンドル後の IIFE を単一 URL に変換）

## Project Conventions

### Code Style
- **言語**: TypeScript（厳格な型チェック有効）
- **インデント**: 4スペース（タブ不可）
- **変数宣言**: デフォルトは `const`、可変な状態のみ `let` を使用
- **関数名**: 命令形の英語名（例: `captureResponses`, `scrollToClosestResponse`）
- **クラス名**: PascalCase（例: `ScrollController`, `TimelineCalculator`）
- **ファイル名**: snake_case（例: `response_update_manager.ts`, `speed_overlay.ts`）
- **型定義**: 明示的な型注釈を推奨、必要に応じて `types.ts` に共通型を集約
- **配列・オブジェクト**: 複数行の場合は末尾カンマを付ける
- **ユーザー向けテキスト**: すべて日本語（Futaba のインターフェースに合わせる）
- **セレクタ**: 具体性を保つ（例: `body > div.thre table .cnw`）
- **フォーマット**: Prettier で自動整形（`npm run format`）
- **Lint**: ESLint でコード品質をチェック（`npm run lint`、コミット前に `npm run lint:fix`）

### Architecture Patterns
- **モジュール構成**: TypeScript でモジュール化（`src/` 配下）し、esbuild で IIFE にバンドル
- **レイヤー分離**: ドメインロジック（`domain/`）、UI制御（`ui/`）、DOM操作（`dom/`）、パーサー（`parsers/`）を分離
- **クラスベース設計**: 状態と振る舞いを持つコンポーネントはクラス化（例: `ScrollController`, `ResponseUpdateManager`）
- **依存性注入**: コンストラクタで依存を注入してテスト容易性を確保
- **タイマーベース**: `setInterval()` で500ms毎にスクロール位置を更新
- **イベント駆動**: キーボードショートカットは `keydown` イベントで処理
- **速度変更時の基準時刻保持**: `ScrollController` が速度変更時の基準点を管理し、`TimelineCalculator` に状態を渡して計算
- **再実行の初期化**: スクリプト再実行時は一時停止・速度・ポーリング状態をリセットし、重複No.はマージ段階で除外
- **レスキャプチャ**: `.thre` の `childNodes` を順番に走査し、`.cnw` と `.cno` を両方含むノード群をレスとみなす。table形式レスに加えて Futafuta の非tableスレ主投稿も検出し、ふたば本家ページにFutafutaをマージした混在構成でも `captureResponses()` が全レスを取得できる

ディレクトリ構造:
```
src/
├── index.ts              # エントリーポイント（IIFE ラッパー）
├── main.ts               # メイン処理（コンポーネント組み立て）
├── types.ts              # 共通型定義
├── domain/               # ドメインロジック
│   ├── timeline.ts       # TimelineCalculator（時刻計算）
│   ├── response_update_manager.ts  # レス更新管理
│   ├── validation.ts     # 入力値検証
│   └── start_position.ts # 開始位置解決（レス番号/日時/No.）
├── ui/                   # UI制御
│   ├── scroller.ts       # ScrollController（スクロール制御）
│   ├── prompt.ts         # （レガシー）promptベースの設定入力
│   ├── input_form.ts     # HTMLフォーム入力オーバーレイ
│   ├── loading_overlay.ts # ローディングオーバーレイ
│   ├── speed_overlay.ts  # 速度オーバーレイ
│   ├── status_overlay.ts # ステータスオーバーレイ
│   └── floating_control.ts # 常駐表示モードの浮動コントロール
├── dom/                  # DOM操作
│   ├── capture.ts        # レスポンスキャプチャ
│   ├── response_nodes.ts # レスノードのグループ化（形式判定に依存しない）
│   ├── scroll.ts         # スクロール処理
│   ├── selectors.ts      # CSS セレクタ
│   ├── merge.ts          # 追加スレッドのDOM統合
│   └── thread_fetcher.ts # 外部スレッドの取得と形式判定
├── parsers/              # パーサー
│   └── timestamp.ts      # タイムスタンプ解析
└── utils/                # ユーティリティ
    └── hash.ts           # コンテンツハッシュ計算（レス同一性判定）
```

コアコンポーネント:
1. **ScrollController** (`src/ui/scroller.ts:23`): スクロール制御、一時停止/再開、速度調整、基準時刻管理
2. **FloatingControlPanel** (`src/ui/floating_control.ts`): 常駐表示モードのタッチ操作UI（ステータス常時表示、メッセージ表示、再生/一時停止・速度±、ドラッグ移動）
3. **ResponseUpdateManager** (`src/domain/response_update_manager.ts:16`): 10秒毎にレス更新を検出
4. **TimelineCalculator** (`src/domain/timeline.ts`): ステートレスなタイムライン計算（TimelineState を受け取り現在時刻を計算）
5. **SpeedOverlay / StatusOverlay** (`src/ui/*.ts`): オーバーレイUI描画

### Testing Strategy
- **自動テスト**: Jest + jsdom で単体テスト（`npm test`）
  - **ドメインロジック**: `tests/domain/timeline.test.ts`, `tests/domain/validation.test.ts`, `tests/domain/response_update_manager.test.ts`
  - **UI制御**: `tests/ui/scroller.test.ts`, `tests/ui/prompt.test.ts`
  - **パーサー**: `tests/parsers/timestamp.test.ts`
  - **DOM操作**: `tests/dom/capture.test.ts`
  - **統合**: `tests/main.test.ts`
- **テストコマンド**:
  - `npm test` - 全テスト実行
  - `npm run test:watch` - Watch モード
  - `npm run test:coverage` - カバレッジ計測
- **手動テスト** (ブラウザ検証):
  - Futaba スレッドを開く
  - DevTools コンソールに `dist/futaba_scroller.js` を貼り付け
  - HTML入力フォームで開始位置（レス番号/日時/No.）と速度を指定し、開始はxキーで行う
  - 追加スレッドURLを1件/複数件指定し、ローディング表示とNo.昇順マージ・重複除外を確認
  - ふたば本家/ふたクロ/tsumanneログを組み合わせてマージし、削除レス除外とラッパー保持を確認
  - キーボードショートカット（一時停止/速度調整）の動作確認
  - UI表示モードを「常駐表示」にして、浮動コントロールパネルのドラッグ移動・タッチ操作（再生/一時停止・速度±）・ステータス/メッセージ常時表示を確認

### Git Workflow
- **メインブランチ**: `master`
- **コミットメッセージ**: 日本語で簡潔に（例: 「レスの定期更新機能を実装」）
- **リリース**: バージョンタグ（例: `version2.0`）
- **Claude Code 協働**: コミットメッセージに `🤖 Generated with [Claude Code]` および `Co-Authored-By: Claude <noreply@anthropic.com>` を含む

## Domain Context

**双葉☆ちゃんねる（Futaba Channel）**:
- 日本の匿名画像掲示板
- レス（返信）には `YY/MM/DD(曜日)HH:MM:SS` 形式のタイムスタンプが付く
- DOM構造: `.cnw` クラス要素にタイムスタンプが含まれる
- セレクタ例: `body > div.thre table .cnw`

**タイミングアルゴリズム**:
```
currentThreadTime = threadStartTime + (Date.now() - startTime) * speedMultiplier
```
500ms毎に `response.timestamp ≤ currentThreadTime` の最新レスを探してスクロール

## Important Constraints

1. **ビルドフロー必須**: TypeScript で開発 → esbuild でバンドル → `dist/` に出力
2. **自己完結型**: バンドル後は外部依存なし（IIFE 形式の単一ファイル）
3. **CSP-safe**: コンテンツセキュリティポリシーに違反しない（既存ページのコンテキストで実行）
4. **ミニファイケーション**: プロダクションビルド時に esbuild が自動圧縮（`npm run build`）
5. **配布形式**:
   - `dist/futaba_scroller.js` - バンドル済み JavaScript（開発・検証用）
   - `dist/futaba_scroller.bookmarklet.txt` - `javascript:...` 形式のブックマークレットURL
6. **ブラウザ互換性**: ES2020 ターゲット（Chromium/Firefox/Safari の最新版）
7. **型安全性**: TypeScript strict モード必須（`npm run type-check` で検証）
8. **ソース編集の禁止**: `dist/` は自動生成物のため直接編集しない（`src/` のみ編集）

## External Dependencies

なし（完全に自己完結型のブックマークレット）

## Development Workflow

### 開発サイクル
1. `src/` 配下の TypeScript ファイルを編集
2. `npm run type-check` - 型チェック
3. `npm run lint` - コード品質チェック
4. `npm test` - 自動テスト実行
5. `npm run build` - プロダクションビルド（または `npm run build:dev` で開発ビルド）
6. `dist/futaba_scroller.js` をブラウザで手動テスト

### 主要コマンド
- **型チェック**: `npm run type-check` - TypeScript コンパイラで型検証（ビルド前に自動実行）
- **ビルド**: `npm run build` - プロダクションビルド（ミニファイ有効）
- **開発ビルド**: `npm run build:dev` - ソースマップ付きビルド（ミニファイ無効）
- **テスト**: `npm test` - Jest でテスト実行
- **Lint**: `npm run lint` - ESLint でコード品質チェック
- **Lint 修正**: `npm run lint:fix` - ESLint で自動修正
- **フォーマット**: `npm run format` - Prettier でコード整形
- **フォーマット確認**: `npm run format:check` - Prettier でフォーマット確認のみ

### ビルド成果物
- `dist/futaba_scroller.js` - バンドル済み JavaScript（ブラウザで実行可能）
- `dist/futaba_scroller.bookmarklet.txt` - ブックマークレットURL（ブラウザのブックマークに登録）

### 推奨エディタ設定
- VSCode の場合: TypeScript/ESLint/Prettier 拡張機能を有効化
- 保存時にフォーマット自動実行を推奨
