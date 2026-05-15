# Asset Credits

ArigatoArena で使用するサードパーティ素材・生成AI出力のクレジット一覧。

## 生成AI

### Higgsfield (nano_banana_2 via MCP)
- 用途: メンバーオマージュキャラのターンアラウンド画像生成（front/side/back T-pose）
- モデル: nano_banana_2 (Google Nano Banana Pro)
- 採用日: 2026-05-15
- ライセンス: Higgsfield 利用規約に従う（plus プラン契約）
- 出力ファイル: `assets/characters/_source/{k2,hyouga,shuto,daichi,katsuya}/turnaround_v2.png`
- 残4体 (tsuchiga, hide, yugo, iru) は Day1夜〜Day2午前に追加生成予定
- 参考画像 `reference_01.webp` を facial reference として使用、プロンプトで T-pose stylized 3D character を指定
- 補足: soul_2 モデルは `enhance_prompt: true` が強制されプロンプトを上書きするためターンアラウンド用途に不適合。nano_banana_2 で代替

### Meshy（予定、ユーザー手動運用）
- 用途: ターンアラウンド画像 → 3D モデル (GLB) 変換
- 運用: ユーザーが Meshy Web UI に手動アップロード → DL → `assets/characters/<id>.glb` 配置
- ライセンス: Meshy 商用利用範囲内で運用

## アニメーション

### Mixamo
- 用途: 自動リグ + 標準アニメーション (idle / walk / run / shoot / reload / death)
- ライセンス: Adobe Mixamo 利用規約（個人/商用利用可）
- 出力ファイル: `assets/characters/_shared/animations.glb`

## マップ・プリミティブ素材

### Kenney.nl（予定）
- 用途: マップ要素（コンテナ・瓦礫・足場）
- ライセンス: CC0 (Public Domain)
- URL: https://kenney.nl/

## 音声

### キル音
- 出典: 未定
- ライセンス: 未定

### BGM
- 出典: 未定（生成 or フリー素材）
- ライセンス: 未定

## 注意

- 本リポジトリは社内利用前提
- 採用した素材は **必ず本ファイルにライセンス・出典を追記**
- 商用配布する場合は再確認が必要
- メンバーオマージュキャラは本人の承諾を得たうえで使用
