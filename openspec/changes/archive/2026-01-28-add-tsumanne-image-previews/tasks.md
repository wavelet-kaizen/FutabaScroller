## 1. Implementation
- [x] 1.1 tsumanne用の画像リンク判定（拡張子フィルタ）とプレビュー挿入ヘルパーを追加する
- [x] 1.2 tsumanneログ取得時（外部スレッド取得）にプレビュー挿入を適用する
- [x] 1.3 tsumanneベースページ実行時に、現在DOMにもプレビュー挿入を適用する
- [x] 1.4 #attachment での処理スキップと、同一blockquote内にimgがある場合のスキップを実装する

## 2. Validation
- [x] 2.1 `data/data_sample/tsumannne_まりなす7周年記念ラ - 二次元裏＠ふたば.html` をブラウザで開き、`fu6083034.jpg` / `fu6083050.jpg` の直リンク下にプレビューが表示され、`#attachment` には追加されないことを確認する
- [x] 2.2 `npm run type-check` を実行する
