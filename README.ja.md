# NotebookLM Quiz Keypad (Chrome Extension)

NotebookLM のクイズUIをキーボードだけで操作するための拡張です。複数の
iframe/blob コンテキストにも対応できるよう、全フレームに content script を
注入し、見えているボタンの text/aria-label を使って操作対象を判定します。

Anki のように、キーボードだけでテンポ良く回答したいという意図で作りました。

## 主な機能

- 回答選択: `1` → A, `2` → B, `3` → C, `4` → D
- 移動: `Space` → Next, `Shift+Space` → Previous
- ヒント/解説: `5` → Hint（無ければ Explain）
- 回答後の自動Nextなし
- クイズUIが見えている間は Space のスクロールを抑止

## 対象URL

- `https://notebooklm.google.com/*`
- `https://*.usercontent.goog/*`

## インストール（開発者モード）

1. `chrome://extensions` を開く
2. 右上の **デベロッパーモード** をオン
3. **パッケージ化されていない拡張機能を読み込む** をクリック
4. このフォルダを選択

## 使い方

- NotebookLM のノートブックでクイズを開く
- クイズが表示されている状態で `1-5` と `Space` を使う
- DevTools を開くと `[NBLM-EXT]` プレフィックスのログが出ます

## 仕組み

content script が全フレームで動作し、以下を行います。

- 可視なボタンの text/aria-label をマッチしてクイズUIを検出
- ショートカットに応じて該当ボタンをクリック
- フレーム間でキーイベントを中継し、blob/iframe 側まで届くようにする

## トラブルシューティング

- 反応しない場合は DevTools の Console で `[NBLM-EXT]` のログを確認
- コード変更後は拡張を再読み込み

## ファイル

- `manifest.json` — MV3 マニフェスト
- `content.js` — content script（キーボード処理 + クリック）

## ライセンス

MIT License
