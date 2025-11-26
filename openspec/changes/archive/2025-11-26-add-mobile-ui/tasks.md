# Tasks: スマートフォン向けタッチ操作UI追加

## Implementation Order

### 1. 型定義の拡張
- [x] `src/types.ts` に `UiMode` 型を追加（`'auto-hide' | 'persistent'`）
- [x] `ThreadSettings` インターフェースに `uiMode: UiMode` フィールドを追加
- [x] デフォルト値を `'auto-hide'` に設定
- [x] **`src/ui/prompt.ts` を更新**: `promptUserForSettings()` が返す `ThreadSettings` オブジェクト (prompt.ts:37-43) に `uiMode: 'auto-hide'` を追加
- [x] `tests/ui/prompt.test.ts` を更新: テストで期待される `ThreadSettings` オブジェクトに `uiMode: 'auto-hide'` を追加

**検証**:
- TypeScript の型チェックが通ること（`npm run type-check`）
- `prompt.ts` の型エラーが発生しないこと
- `tests/ui/prompt.test.ts` が通ること

---

### 2. 入力フォームへのUI表示モード選択追加
- [x] `src/ui/input_form.ts` の `InputFormOverlay.createOverlay()` にUI表示モード選択のラジオボタンを追加
- [x] デフォルト値は `'auto-hide'`、`'persistent'` も選択可能に
- [x] `collectSettings()` で選択された `uiMode` を `ThreadSettings` に含める
- [x] `getDefaultSettings()` のデフォルト値に `uiMode: 'auto-hide'` を追加

**検証**:
- 入力フォームにUI表示モード選択が表示されること
- デフォルトで「自動非表示」が選択されていること
- フォーム送信時に `uiMode` が正しく取得されること

---

### 3. FloatingControlPanel の基本実装
- [x] `src/ui/floating_control.ts` を新規作成
- [x] `FloatingControlPanel` クラスを実装:
  - コンストラクタで `onPlayPause`, `onSpeedUp`, `onSpeedDown` コールバックを受け取る
  - `show()`, `hide()`, `destroy()` メソッドを実装
  - `updateState(threadTime, speed, paused)` でステータス更新
- [x] 3段階の表示モード（`minimized`, `status`, `full`）を内部状態として管理
- [x] `cycleDisplayMode()` で表示モード切り替え
- [x] DOM要素の生成と初期スタイル適用（右下に固定、z-index設定）

**検証**:
- `FloatingControlPanel` インスタンスが生成できること
- `show()` で画面右下にアイコンが表示されること
- `cycleDisplayMode()` で表示状態が切り替わること（目視確認）

---

### 4. FloatingControlPanel のドラッグ機能実装
- [x] タッチイベント（`touchstart`, `touchmove`, `touchend`）のハンドラを実装
- [x] マウスイベント（`mousedown`, `mousemove`, `mouseup`）のハンドラを実装
- [x] ドラッグ中は `event.preventDefault()` で画面スクロールを抑制
- [x] 画面境界を超えないように位置を制限
- [x] ドラッグ位置を内部状態として保持

**検証**:
- タッチでパネルをドラッグして移動できること
- マウスでパネルをドラッグして移動できること
- ドラッグ中に画面がスクロールしないこと
- 画面外にドラッグできないこと

---

### 5. FloatingControlPanel のボタン実装
- [x] フルコントロール表示時に再生/一時停止ボタンを表示
- [x] 再生/一時停止ボタンタップで `onPlayPause()` を呼び出し
- [x] 速度+ボタンと速度-ボタンを表示
- [x] 速度+ボタンタップで `onSpeedUp()` を呼び出し
- [x] 速度-ボタンタップで `onSpeedDown()` を呼び出し
- [x] ボタンのスタイル設定（タップ可能なサイズ、視認性の高い色）

**検証**:
- 各ボタンをタップして対応するコールバックが呼ばれること
- ボタンの視認性が高く、タップしやすいこと（目視確認）

---

### 6. FloatingControlPanel のステータス表示実装
- [x] `updateState()` で現在のスレッド日時、速度、再生/一時停止状態を受け取る
- [x] ステータス表示モード時に日時と速度を表示
- [x] フルコントロール表示モード時にもステータス情報を表示
- [x] 日時フォーマット: `YYYY/MM/DD HH:MM:SS`
- [x] 速度フォーマット: `X.Xx`（小数点第1位まで）
- [x] 再生/一時停止状態の表示（「再生中」「一時停止中」）
- [x] `showMessage(text: string, isError?: boolean)` メソッドを実装し、システムメッセージを表示
  - 「準備完了、xキーでスクロール開始」
  - 「タイムライン終了」
  - 将来的な拡張用に `isError` パラメータを用意（赤色で強調表示）
- [x] メッセージは自動的に消えず、常駐表示する
- [x] メッセージはステータス表示領域に表示され、通常のステータス情報（日時・速度）と切り替え可能
- [x] **注**: 開始位置解決エラーは `window.alert` で表示されるため、`FloatingControlPanel` では扱わない

**検証**:
- `updateState()` 呼び出し後、ステータス表示が更新されること
- 日時と速度が正しいフォーマットで表示されること
- `showMessage()` でメッセージが表示され、自動的に消えないこと

---

### 7. ScrollController との統合
- [x] `src/ui/scroller.ts` の `ScrollController` コンストラクタで `settings.uiMode` を確認
- [x] `uiMode === 'persistent'` の場合、`FloatingControlPanel` をインスタンス化
- [x] `uiMode === 'persistent'` の場合、既存の `StatusOverlay` と `SpeedOverlay` を無効化
- [x] `start()` メソッドで `FloatingControlPanel.show()` を呼び出し
- [x] `stop()` メソッドで `FloatingControlPanel.destroy()` を呼び出し
- [x] `updateStatusOverlay()` の代わりに `FloatingControlPanel.updateState()` を呼び出し
- [x] `togglePause()`, `adjustSpeed()` の処理後に `FloatingControlPanel` を更新
- [x] **システムメッセージのリダイレクト**: `uiMode === 'persistent'` の場合、以下の `statusOverlay.showMessage()` 呼び出しを `FloatingControlPanel.showMessage()` にリダイレクト:
  - `start()` メソッド内の `statusOverlay.showMessage('準備完了、xキーでスクロール開始')` (scroller.ts:94)
  - `handleTimelineEnd()` メソッド内の `statusOverlay.showMessage('タイムライン終了')` (scroller.ts:225)
- [x] 常駐モード時は `statusOverlay.showMessage()` を呼び出さないよう分岐処理を追加
- [x] **注**: `onError` コールバック (scroller.ts:78) は `window.alert` にハードコードされており (main.ts:96)、コントローラ生成前に呼ばれる可能性があるため、引き続き `alert` で表示する

**検証**:
- 常駐表示モード選択時に `FloatingControlPanel` が表示されること
- 自動非表示モード選択時に既存の `StatusOverlay` が表示されること
- キーボード操作でも `FloatingControlPanel` が更新されること
- 常駐モード時に「準備完了、xキーでスクロール開始」が `FloatingControlPanel` に表示されること
- 常駐モード時に「タイムライン終了」が `FloatingControlPanel` に表示されること
- 開始位置解決エラーは引き続き `window.alert` で表示されること

---

### 8. テストの追加と既存テストの修正
- [x] `tests/ui/floating_control.test.ts` を新規作成
- [x] 表示モード切り替えのテストを追加
- [x] ボタンコールバックのテストを追加
- [x] `updateState()` のテストを追加
- [x] `destroy()` でイベントリスナーが解除されることをテスト
- [x] `showMessage()` のテストを追加（通常メッセージとエラーメッセージ）
- [x] `tests/ui/scroller.test.ts` に `uiMode` による分岐のテストを追加
- [x] 常駐モード時に `start()` で「準備完了」メッセージが `FloatingControlPanel` に表示されることをテスト
- [x] 常駐モード時に `handleTimelineEnd()` で「タイムライン終了」メッセージが表示されることをテスト
- [x] **既存テストの `ThreadSettings` オブジェクトに `uiMode` フィールドを追加**:
  - `tests/ui/prompt.test.ts`: 期待される設定オブジェクトに `uiMode: 'auto-hide'` を追加
  - `tests/ui/input_form.test.ts`: モックの設定オブジェクトに `uiMode: 'auto-hide'` を追加
  - `tests/ui/scroller.test.ts`: テスト用の設定オブジェクトに `uiMode: 'auto-hide'` を追加
  - `tests/main.test.ts`: 統合テストの設定オブジェクトに `uiMode: 'auto-hide'` を追加
  - その他 `ThreadSettings` を使用する全てのテストファイル

**検証**:
- `npm test` で全テストが通ること
- カバレッジが低下しないこと

---

### 9. ブラウザでの動作確認
- [x] `npm run build` でビルド
- [x] PC環境のFutabaスレッドで動作確認:
  - 自動非表示モード選択時、既存の動作が維持されること
  - 常駐表示モード選択時、浮動UIが表示されること
  - キーボード操作が引き続き動作すること
- [x] スマートフォン環境（実機またはChrome DevToolsのデバイスモード）で動作確認:
  - 常駐表示モード選択時、タッチ操作で再生/一時停止、速度調整ができること
  - パネルをドラッグして移動できること
  - ドラッグ中にページがスクロールしないこと

**検証**:
- PC、スマートフォンの両環境で正常に動作すること
- 既存機能が壊れていないこと

---

### 10. ドキュメント更新
- [x] `CLAUDE.md` に常駐表示モードの説明を追加
- [x] `openspec/project.md` の「主な機能」セクションに追記
- [x] `README.md` にスマートフォン対応の説明を追加（操作方法、UI表示モード選択）

**検証**:
- ドキュメントが最新の実装を反映していること

---

## Dependencies

- タスク1（型定義）は全ての後続タスクの前提条件
- タスク2（入力フォーム）はタスク7（統合）の前提条件
- タスク3-6（FloatingControlPanel）は並行実行可能
- タスク7（統合）はタスク2-6の完了後に実行
- タスク8（テスト）はタスク3-7の完了後に実行
- タスク9（動作確認）はタスク8の完了後に実行
- タスク10（ドキュメント）はタスク9の完了後に実行

## Parallelizable Work

以下のタスクは並行して作業可能:
- タスク3（基本実装）とタスク4（ドラッグ）
- タスク5（ボタン）とタスク6（ステータス表示）

## Estimated Effort

- タスク1-2: 30分
- タスク3-6: 3-4時間
- タスク7: 1-2時間
- タスク8: 1-2時間
- タスク9: 1時間
- タスク10: 30分

合計: 約7-10時間
