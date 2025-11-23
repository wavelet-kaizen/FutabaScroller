# FutabaScroller

[日本語](#日本語) | [English](#english)

---

## 日本語

ふたば☆ちゃんねるのスレッドを投稿時刻に基づいて自動スクロールするブックマークレットです。

### 特徴

- **タイムスタンプベースの自動スクロール**: レスの投稿時刻に合わせてリアルタイムでスクロール
- **マルチスレッド対応**: 複数のスレッドをNo.順にマージして表示（重複除外）
- **柔軟な開始位置**: レス番号、日時、No.のいずれかで開始位置を指定可能
- **速度調整**: キーボードで再生速度を自由に変更（0.1倍〜10倍）
- **一時停止/再開**: `x`キーで一時停止・再開をコントロール
- **自動更新**: 10秒ごとに新着レスを自動取得
- **対応サイト**:
  - ふたば☆ちゃんねる
  - ふたクロ（futakuro）ログ
  - 「」っちー（tsumanne.net）
  - Futafuta

### インストール

#### 方法1: ブックマークレットとして追加

1. [`dist/futaba_scroller.bookmarklet.txt`](dist/futaba_scroller.bookmarklet.txt) の内容をコピー
2. ブラウザでブックマークを新規作成
3. URL欄にコピーした内容を貼り付け
4. 任意の名前（例: "Futaba Scroller"）を付けて保存

#### 方法2: 開発者ツールから実行

1. ふたばのスレッドを開く
2. 開発者ツール（F12）のコンソールを開く
3. [`dist/futaba_scroller.js`](dist/futaba_scroller.js) の内容をコピー＆ペースト
4. Enterキーで実行

### 使い方

1. ふたばのスレッドページでブックマークレットを実行
2. HTMLフォームが表示されるので、以下を入力:
   - **開始位置の形式**: レス番号/日時/No.のいずれかを選択
   - **開始位置**: 対応する値を入力
     - レス番号: `5`（5番目のレスから）
     - 日時: `25/01/23(木)12:34:56` または `2025/01/23 12:34:56`
     - No.: `No.123456789`（「No.」プレフィックス付きで入力）
   - **速度倍率**: `1.0`（通常速度）、`2.0`（2倍速）など
   - **追加スレッドURL**（任意）: 改行区切りで複数のスレッドURLを入力
3. 「開始」ボタンをクリック
4. ローディング完了後、ステータスオーバーレイに「準備完了、xキーでスクロール開始」と表示される
5. `x`キーを押すとスクロール開始

### キーボードショートカット

| キー | 機能 |
|------|------|
| `x` | 一時停止/再開 |
| `d` | 速度を上げる（+0.1倍） |
| `s` | 速度を下げる（-0.1倍） |

### 開発

#### 必要な環境

- Node.js 20以上
- npm

#### セットアップ

```bash
npm install
```

#### ビルド

```bash
npm run build
```

ビルド成果物は `dist/` に出力されます:
- `futaba_scroller.js`: 開発者ツール用
- `futaba_scroller.bookmarklet.txt`: ブックマークレット用

#### テスト

```bash
# 全テスト実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ計測
npm run test:coverage
```

#### コード品質

```bash
# 型チェック
npm run type-check

# Lint
npm run lint

# 自動修正
npm run lint:fix

# フォーマット
npm run format
```

#### プロジェクト構成

```
src/
├── domain/          # ビジネスロジック
├── dom/             # DOM操作とスレッド取得
├── parsers/         # タイムスタンプ等のパーサー
├── ui/              # UIコンポーネント
└── index.ts         # エントリーポイント

tests/               # Jestテスト
dist/                # ビルド成果物
```

### ライセンス

MIT License

---

## English

A bookmarklet that automatically scrolls through Futaba (Japanese imageboard) threads based on post timestamps.

### Features

- **Timestamp-based auto-scrolling**: Scrolls in real-time according to post timestamps
- **Multi-thread support**: Merge multiple threads by No. order with duplicate filtering
- **Flexible start position**: Specify start position by response number, datetime, or No.
- **Speed adjustment**: Change playback speed freely via keyboard (0.1x ~ 10x)
- **Pause/Resume**: Control playback with the `x` key
- **Auto-update**: Automatically fetch new responses every 10 seconds
- **Supported sites**:
  - Futaba Channel (futaba-chan)
  - Futakuro
  - Tsumanne
  - Futafuta

### Installation

#### Method 1: Add as Bookmarklet

1. Copy contents of [`dist/futaba_scroller.bookmarklet.txt`](dist/futaba_scroller.bookmarklet.txt)
2. Create a new bookmark in your browser
3. Paste the copied content into the URL field
4. Give it a name (e.g., "Futaba Scroller") and save

#### Method 2: Run from DevTools

1. Open a Futaba thread
2. Open DevTools console (F12)
3. Copy and paste contents of [`dist/futaba_scroller.js`](dist/futaba_scroller.js)
4. Press Enter to execute

### Usage

1. Execute the bookmarklet on a Futaba thread page
2. An HTML form will appear; enter the following:
   - **Start position format**: Choose from Response Number/Datetime/No.
   - **Start position value**: Enter the corresponding value
     - Response Number: `5` (start from 5th response)
     - Datetime: `25/01/23(Thu)12:34:56` or `2025/01/23 12:34:56`
     - No.: `No.123456789` (must include "No." prefix)
   - **Speed multiplier**: `1.0` (normal speed), `2.0` (2x speed), etc.
   - **Additional thread URLs** (optional): Enter multiple thread URLs separated by newlines
3. Click the "Start" button
4. After loading completes, the status overlay will show "準備完了、xキーでスクロール開始" (Ready, press x to start scrolling)
5. Press `x` key to start scrolling

### Keyboard Shortcuts

| Key | Function |
|-----|----------|
| `x` | Pause/Resume |
| `d` | Increase speed (+0.1x) |
| `s` | Decrease speed (-0.1x) |

### Development

#### Requirements

- Node.js 20+
- npm

#### Setup

```bash
npm install
```

#### Build

```bash
npm run build
```

Build artifacts are output to `dist/`:
- `futaba_scroller.js`: For DevTools
- `futaba_scroller.bookmarklet.txt`: For bookmarklet

#### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

#### Code Quality

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Auto-fix
npm run lint:fix

# Format
npm run format
```

#### Project Structure

```
src/
├── domain/          # Business logic
├── dom/             # DOM manipulation and thread fetching
├── parsers/         # Parsers for timestamps, etc.
├── ui/              # UI components
└── index.ts         # Entry point

tests/               # Jest tests
dist/                # Build artifacts
```

### License

MIT License
