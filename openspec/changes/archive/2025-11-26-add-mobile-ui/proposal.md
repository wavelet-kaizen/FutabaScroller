# Proposal: スマートフォン向けタッチ操作UI追加

## Summary
キーボードに依存しない、タッチ操作可能な浮動UIコントロールパネルを追加し、スマートフォンでも完全に操作可能にする。

## Why
スマートフォンでFutabaを閲覧するユーザーが増えているにもかかわらず、FutabaScrollerは外部キーボード接続なしでは操作不可能。これにより、モバイル環境での利用が完全に阻害されている。

現在のキーボード依存設計は以下の問題を引き起こしている:
- スマートフォンユーザーが機能を全く利用できない
- タッチ操作に対応する手段が存在しない
- ステータス情報が5秒で消えるため、スマホで確認しづらい

タッチ操作可能なUIを追加することで、スマートフォンユーザーにも同等の機能を提供し、ユーザー層を拡大できる。

## Background
現在の FutabaScroller はPC向けに設計されており、以下の制約がある:
- 操作がキーボードショートカット（x, d, s）に完全依存
- ステータスオーバーレイは5秒後に自動非表示
- スマートフォンでは外部キーボード接続が必須

これにより、スマートフォンユーザーは実質的に利用できない状態。

## Goals
1. **タッチ操作対応**: 再生/一時停止、速度調整をタッチで実行可能に
2. **常駐UI**: 操作パネルを画面上に常時表示（必要に応じて最小化可能）
3. **移動可能**: ドラッグでUIの位置を自由に調整
4. **表示モード切り替え**: アイコンタップで3段階表示（最小化 → ステータスのみ → フルコントロール）
5. **PC互換性維持**: 既存のキーボード操作は引き続き動作

## Non-Goals
- ジェスチャー操作（スワイプ、ピンチなど）
- レスポンシブデザインの全面的な再設計
- タブレット専用UI

## What Changes
この変更により、以下のコンポーネントとファイルが影響を受ける:

### 新規追加
- `src/ui/floating_control.ts`: 浮動コントロールパネルの実装（約300-400行）
- `tests/ui/floating_control.test.ts`: 浮動コントロールパネルのテスト

### 変更
- `src/types.ts`: `UiMode` 型と `ThreadSettings` に `uiMode` フィールドを追加
- `src/ui/input_form.ts`: UI表示モード選択のラジオボタンを追加
- `src/ui/scroller.ts`: `uiMode` による分岐処理、`FloatingControlPanel` の統合
- `tests/ui/input_form.test.ts`: `uiMode` フィールドを含むテストデータ修正
- `tests/ui/scroller.test.ts`: `uiMode` による動作分岐のテスト追加
- `tests/main.test.ts`: 統合テストの設定オブジェクト修正

### 影響を受けるユーザー体験
- PC環境: デフォルトで既存の動作を維持（自動非表示モード）
- スマートフォン環境: 常駐表示モードを選択することで、タッチ操作が可能に
- 既存のキーボード操作: 両方のモードで引き続き動作

## Proposed Solution

### 1. UI表示モード選択
入力フォーム（`InputFormOverlay`）に新しい選択項目を追加:
- **自動非表示モード（デフォルト）**: PC向け、既存の5秒自動非表示動作
- **常駐モード**: スマートフォン向け、浮動UIパネルを常時表示

### 2. 浮動コントロールパネル (`FloatingControlPanel`)
新しいUIコンポーネントを `src/ui/floating_control.ts` として実装:

#### 表示状態（3段階）
1. **最小化**: アイコンのみ（36x36px程度の円形ボタン）
2. **ステータス表示**: アイコン + ステータス情報（日時、速度、再生/一時停止状態）
3. **フルコントロール**: アイコン + ステータス + 操作ボタン（再生/一時停止、速度+/-）

#### 操作
- **アイコンタップ**: 表示状態を切り替え（最小化 → ステータス → フル → 最小化）
- **ドラッグ**: パネル全体をドラッグして画面内で移動
- **ボタンタップ**: 再生/一時停止、速度調整を実行

#### 初期位置
- 画面右下（既存ステータスオーバーレイの位置と重ならないよう右側に配置）

### 3. 既存コンポーネントの統合
- `StatusOverlay` の機能を `FloatingControlPanel` に統合（常駐モード時）
- `ScrollController` に浮動UIの状態更新メソッドを追加
- UI表示モードを `ThreadSettings` に追加
- **システムメッセージのリダイレクト**: 常駐モード時、以下のメッセージを `FloatingControlPanel.showMessage()` 経由で表示:
  - 起動時の「準備完了、xキーでスクロール開始」
  - タイムライン終了時の「タイムライン終了」
  - **注**: 開始位置解決エラーは、コントローラ生成前に発生するため、引き続き `window.alert` で表示

### 4. 実装の詳細設計

#### ThreadSettings 型の拡張
```typescript
type UiMode = 'auto-hide' | 'persistent';

interface ThreadSettings {
    // 既存フィールド
    startMode: 'index' | 'timestamp' | 'no';
    startValue: number | string;
    startResponseIndex: number;
    speedMultiplier: number;
    additionalThreadUrls: string[];

    // 新規フィールド
    uiMode: UiMode;
}
```

#### FloatingControlPanel の API
```typescript
class FloatingControlPanel {
    constructor(
        private onPlayPause: () => void,
        private onSpeedUp: () => void,
        private onSpeedDown: () => void
    );

    show(): void;
    hide(): void;
    updateState(threadTime: Date | null, speed: number, paused: boolean): void;
    showMessage(text: string, isError?: boolean): void; // システムメッセージを表示（将来的な拡張用にisErrorパラメータを用意）
    destroy(): void;

    // 内部メソッド
    private cycleDisplayMode(): void; // 最小化 → ステータス → フル → 最小化
    private handleDragStart(event: TouchEvent | MouseEvent): void;
    private handleDragMove(event: TouchEvent | MouseEvent): void;
    private handleDragEnd(): void;
}
```

## Alternatives Considered

### 代替案1: 画面下部固定のコントロールバー
- **利点**: ドラッグ不要でシンプル
- **欠点**: スレッド表示領域を常に圧迫、画面サイズによってはコンテンツが隠れる
- **却下理由**: ユーザーが自由に配置できる方が柔軟性が高い

### 代替案2: 既存ステータスオーバーレイを拡張
- **利点**: 新しいコンポーネント不要
- **欠点**: PC向けの自動非表示とスマホ向けの常駐が同一コンポーネントで混在し複雑化
- **却下理由**: 責務の分離のため、新規コンポーネント化が望ましい

## Open Questions
1. ドラッグ操作時にスクロールと干渉しないか？
   - 対策: ドラッグ中は `event.preventDefault()` で画面スクロールを抑制
2. 画面回転時の位置調整は必要か？
   - 初期実装では画面サイズ変更時の位置調整はスコープ外とし、必要に応じて追加

## Success Metrics
- スマートフォンで外部キーボードなしに全機能を操作可能
- PC環境で既存の操作方法が引き続き動作
- UIの表示/非表示切り替えが直感的に操作可能

## Impact
- **ユーザー**: スマートフォンでの利用が可能になる
- **開発**: 新規コンポーネント追加（約300-400行）、既存コンポーネントへの統合（約50行の変更）
- **テスト**: 新規UIコンポーネントの単体テスト、統合テストの追加

## Timeline
提案承認後、以下の順序で実装:
1. `FloatingControlPanel` の基本実装（最小化/ステータス/フル表示切り替え）
2. ドラッグ機能の実装
3. `InputFormOverlay` への UI モード選択追加
4. `ScrollController` との統合
5. テスト追加とブラウザ検証
