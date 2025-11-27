# refine-mobile-ui-defaults Tasks

## 実装タスク

### 1. UI表示モードのデフォルトを「常駐表示」に変更
- [x] `src/ui/input_form.ts` の `getDefaultSettings()` メソッドを修正
  - `uiMode: 'auto-hide'` → `uiMode: 'persistent'` に変更（line 72付近）
- [x] 手動テスト: ブックマークレット起動時に「常駐表示（スマホ向け）」がデフォルト選択されていることを確認

**依存関係**: なし
**検証方法**: 入力フォームを開き、UI表示モードのラジオボタンで「常駐表示」が選択されていることを目視確認

---

### 2. 浮動コントロールパネルの初期表示状態を「フル表示」に変更
- [x] `src/ui/floating_control.ts` の初期値を修正
  - `displayMode: DisplayMode = 'minimized'` → `displayMode: DisplayMode = 'full'` に変更（line 26付近）
- [x] 手動テスト: 常駐表示モードで起動時にフル表示（ボタンが全て見える状態）になることを確認

**依存関係**: タスク1完了後
**検証方法**: 常駐表示モードで起動し、浮動パネルにステータス情報とコントロールボタン（▶/⏸、＋、－）が全て表示されることを確認

---

### 3. 表示モード切り替えサイクルを変更
- [x] `src/ui/floating_control.ts` の `cycleDisplayMode()` メソッドを修正（line 378-387付近）
  - 現在: `minimized` → `status` → `full` → `minimized`
  - 変更後: `full` → `minimized` → `status` → `full`
  - 実装例:
    ```typescript
    private cycleDisplayMode(): void {
        if (this.displayMode === 'full') {
            this.displayMode = 'minimized';
        } else if (this.displayMode === 'minimized') {
            this.displayMode = 'status';
        } else {
            this.displayMode = 'full';
        }
        this.render();
    }
    ```
- [x] 手動テスト: アイコンを3回タップして「フル→最小化→ステータス→フル」の順に切り替わることを確認

**依存関係**: タスク2完了後
**検証方法**: 浮動パネルのアイコンを連続タップし、表示状態が期待通りのサイクルで切り替わることを確認

---

### 4. 準備完了メッセージの文言を変更
- [x] `src/ui/scroller.ts` の準備完了メッセージを修正
  - 現在: `'準備完了、xキーでスクロール開始'`（line 111付近）
  - 変更後: `'準備完了、▶ボタンまたはxキーで再生開始'`
  - ただし、常駐モード時のみ新しい文言を使用し、自動非表示モード時は従来通り「xキー」のみ表示
  - 実装例:
    ```typescript
    if (options.startPaused) {
        const message = this.isPersistentMode
            ? '準備完了、▶ボタンまたはxキーで再生開始'
            : '準備完了、xキーでスクロール開始';
        this.showStatusMessage(message);
    }
    ```
- [x] 手動テスト: 常駐モードで起動時に「▶ボタンまたはxキー」と表示されることを確認
- [x] 手動テスト: 自動非表示モードで起動時に「xキー」のみ表示されることを確認

**依存関係**: タスク1完了後
**検証方法**: 両方のUIモードで起動し、メッセージ文言が適切に表示されることを確認

---

### 5. 再生開始時に準備完了メッセージをクリア
- [x] `src/ui/scroller.ts` の `togglePause()` メソッドを修正
  - 一時停止状態から再生状態に切り替わる時、常駐モードの場合は `activeMessage` をクリア
  - `FloatingControlPanel` に `clearMessage()` メソッドを追加（または既存の仕組みを利用）
  - 実装箇所を特定するために `togglePause()` メソッドを確認
- [x] `src/ui/floating_control.ts` にメッセージクリア機能を追加
  - `clearMessage()` メソッドを追加:
    ```typescript
    clearMessage(): void {
        this.activeMessage = null;
        this.render();
    }
    ```
- [x] `src/ui/scroller.ts` で再生開始時にメッセージをクリア
  - 一時停止→再生への切り替え時に `this.floatingControl?.clearMessage()` を呼び出す
- [x] 手動テスト: 準備完了状態から▶ボタンまたはxキーで再生開始すると、メッセージが消えることを確認

**依存関係**: タスク4完了後
**検証方法**: 起動後に準備完了メッセージが表示され、再生開始時に消えることを確認

---

### 6. README.mdにスマートフォン向けセットアップ手順を追加
- [x] `README.md` のインストールセクションに新しいサブセクションを追加
  - セクション名: 「方法3: スマートフォンでの利用（CDN経由）」
  - 追加位置: 「方法2: 開発者ツールから実行」の後
  - 内容:
    - jsDelivr CDN経由でスクリプトを読み込むブックマークレットコードを記載
    - ブックマークレットコード例:
      ```javascript
      javascript:(function(){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/gh/wavelet-kaizen/FutabaScroller@latest/dist/futaba_scroller.js';document.body.appendChild(s);})();
      ```
    - スマートフォンでのブックマーク登録手順を簡潔に説明
  - 日本語セクションと英語セクションの両方に追加
- [x] レビュー: 追加した手順が分かりやすく、実際に動作することを確認

**依存関係**: なし（並行作業可能）
**検証方法**:
- 実際のスマートフォンで手順に従ってブックマークレットを登録
- ふたばスレッドでブックマークレットを実行し、正常に動作することを確認

---

## テストタスク

### 7. 既存テストの更新と実行
- [x] `tests/ui/input_form.test.ts` のデフォルト値テストを更新
  - デフォルトの `uiMode` が `'persistent'` になっていることを確認するテストを追加または修正
- [x] `tests/ui/floating_control.test.ts` のテストを確認
  - 初期表示状態が `'full'` になっていることを確認
  - サイクル切り替えのテストが新しいサイクル（`full` → `minimized` → `status` → `full`）に対応しているか確認
  - 必要に応じてテストケースを修正
- [x] `npm test` で全テストを実行
  - 全てのテストがパスすることを確認
  - 失敗するテストがあれば修正

**依存関係**: タスク1〜5完了後
**検証方法**: `npm test` の実行結果が全てグリーンであること

---

### 8. 手動統合テスト
- [x] **常駐表示モード**での動作確認:
  - 入力フォームで「常駐表示」がデフォルト選択されている
  - 起動時に浮動パネルがフル表示で現れる
  - 「準備完了、▶ボタンまたはxキーで再生開始」と表示される
  - 準備完了メッセージは自動タイマーでは消えない（表示され続ける）
  - ▶ボタンをタップすると再生が開始され、メッセージが消える
  - アイコンタップで「フル→最小化→ステータス→フル」の順に切り替わる
  - ステータス情報が正しく更新される
  - ブックマークレットを再実行すると、既存のパネルが破棄され、新しいパネルがフル表示で生成される
- [x] **自動非表示モード**での動作確認（回帰テスト）:
  - 入力フォームで「自動非表示」を選択できる
  - 起動時に従来のステータスオーバーレイが表示される
  - 「準備完了、xキーでスクロール開始」と表示される
  - xキーで再生が開始される
  - 5秒後にオーバーレイが自動的に消える
- [x] **スマートフォンでの動作確認**:
  - README.mdの手順に従ってブックマークレットを登録
  - ふたばスレッドで実行し、正常に動作することを確認

**依存関係**: タスク7完了後
**検証方法**: 上記の全ての動作が期待通りであることを目視確認

---

## 完了条件

- [x] 全ての実装タスク（1〜6）が完了
- [x] 全ての自動テストがパス（タスク7）
- [x] 手動統合テストが全て成功（タスク8）
- [x] コードレビュー完了（必要に応じて）
- [x] `openspec validate refine-mobile-ui-defaults --strict` がパス
