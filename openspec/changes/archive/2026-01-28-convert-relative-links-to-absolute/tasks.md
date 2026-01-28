# Implementation Tasks

## 1. fetchThreadHtml の戻り値変更
- [x] 1.1 `src/dom/thread_fetcher.ts` の `fetchThreadHtml()` の戻り値を `Promise<{ doc: Document; finalUrl: string }>` に変更
- [x] 1.2 `response.url` を使用してリダイレクト後の最終URLを取得し `{ doc, finalUrl }` を返す
- [x] 1.3 全ての呼び出し箇所（merge.ts 等）を新しい戻り値形式に対応

## 2. リンク変換関数の実装（タスク1に依存）
- [x] 2.1 `src/dom/thread_fetcher.ts` に `convertRelativeUrls(nodes: Node[], baseUrl: string): void` 関数を追加
- [x] 2.2 対象要素と属性のリストを定義: `a[href]`, `img[src]`, `video[src]`, `video[poster]`, `audio[src]`, `source[src]`, `area[href]`, `object[data]`
- [x] 2.3 各ノードを走査し、対象要素を検索（ルートノード自体も対象）
- [x] 2.4 スキップ条件: フラグメントのみ（`#...`）、データURI（`data:...`）
- [x] 2.5 `new URL(current, baseUrl)` で解決し、結果のプロトコルが `http:` / `https:` の場合のみ上書き（特殊スキームは元の値を保持）
- [x] 2.6 例外時は元の値を保持

## 3. extractResponses のシグネチャ変更（タスク2に依存）
- [x] 3.1 `extractResponses()` に `baseUrl: string` パラメータを追加
- [x] 3.2 各形式の抽出関数（`extractFutabaResponses`, `extractFutacloResponses`, `extractTsumanneResponses`, `extractFutafutaResponses`）に `baseUrl` パラメータを追加
- [x] 3.3 各形式の抽出関数で、`cloneNodeGroup()` の直後に `convertRelativeUrls(cloned, baseUrl)` を呼び出す

## 4. merge.ts の統合（タスク1, 3に依存）
- [x] 4.1 `fetchAllResponses()` で `fetchThreadHtml()` の戻り値を `{ doc, finalUrl }` として受け取る
- [x] 4.2 `extractResponses(doc, format, finalUrl)` にベースURLを渡す
- [x] 4.3 型チェックを実行して全ての呼び出し箇所が更新されていることを確認

## 5. テストの追加（タスク2, 3に依存）
- [x] 5.1 `convertRelativeUrls` の単体テストを作成
- [x] 5.2 ファイル名のみ相対URL（tsumanne形式: `1761814517439.jpg`）が絶対URLに変換されることをテスト
- [x] 5.3 ルート相対パス（`/b/res/1368544718.htm`）が正しく変換されることをテスト
- [x] 5.4 プロトコル相対URL（`//dec.2chan.net/85/futaba.htm`）が正しく変換されることをテスト
- [x] 5.5 絶対URL（`https://example.com`）がそのまま保持されることをテスト
- [x] 5.6 フラグメントのみのリンク（`#r5`）が変換されず保持されることをテスト
- [x] 5.7 特殊スキーム（`javascript:void(0)`, `mailto:user@example.com`）が変換されず保持されることをテスト
- [x] 5.8 URL解決で例外が発生するケース（`http://[invalid`）がエラーにならず保持されることをテスト
- [x] 5.9 ネストした要素・ルートノード自体が正しく変換されることをテスト
- [x] 5.10 対象外要素（`<form action>`, `<iframe src>` 等）の相対URLが変換されないことをテスト
- [x] 5.11 `<img srcset>` 属性が変換されないことをテスト
- [x] 5.12 データURI（`<img src="data:image/png;base64,...">`）が変換されず保持されることをテスト

## 6. 手動検証（タスク4に依存）
- [x] 6.1 型チェック・lint・ビルドが成功することを確認
- [x] 6.2 ふたば本家スレッドに別のふたば本家スレッドをマージし、リンク・画像が正しく動作することを確認
- [x] 6.3 ふたば本家にtsumanne/Futafutaをマージし、画像リンクが正しく表示されることを確認
- [x] 6.4 http→httpsリダイレクト発生時にリンクがhttpsで変換されることを確認
