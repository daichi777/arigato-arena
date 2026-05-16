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

### Kenney Sci-Fi Sounds
- 用途: 武器発砲音 (AR / SG / SMG) / ヒットマーカー音
- 出典: https://kenney.nl/assets/sci-fi-sounds
- ライセンス: CC0 (Public Domain)
- 作者: Kenney Vleugels (kenney.nl)
- 採用日: 2026-05-16
- 素材→配置対応:
  - laserLarge_000.ogg → assets/audio/sfx/ar_fire.mp3
  - explosionCrunch_000.ogg → assets/audio/sfx/sg_fire.mp3
  - laserSmall_000.ogg → assets/audio/sfx/smg_fire.mp3
  - impactMetal_000.ogg → assets/audio/sfx/hitmark.mp3
- 変換: ogg→mp3 (libmp3lame -q:a 4), loudnorm=I=-16:LRA=11:TP=-1.5

### Kenney Impact Sounds
- 用途: 被弾音 / リロード音
- 出典: https://kenney.nl/assets/impact-sounds
- ライセンス: CC0 (Public Domain)
- 作者: Kenney Vleugels (kenney.nl)
- 採用日: 2026-05-16
- 素材→配置対応:
  - impactPunch_heavy_000.ogg → assets/audio/sfx/hurt.mp3
  - impactMetal_heavy_000.ogg → assets/audio/sfx/reload.mp3
- 変換: ogg→mp3 (libmp3lame -q:a 4), loudnorm=I=-16:LRA=11:TP=-1.5

### Kenney Interface Sounds
- 用途: キル音 / カウントダウン音
- 出典: https://kenney.nl/assets/interface-sounds
- ライセンス: CC0 (Public Domain)
- 作者: Kenney Vleugels (kenney.nl)
- 採用日: 2026-05-16
- 素材→配置対応:
  - confirmation_001.ogg → assets/audio/sfx/kill.mp3
  - tick_001.ogg → assets/audio/sfx/countdown_tick.mp3
  - confirmation_004.ogg → assets/audio/sfx/countdown_go.mp3
- 変換: ogg→mp3 (libmp3lame -q:a 4), loudnorm=I=-16:LRA=11:TP=-1.5

### BGM プレースホルダ
- 用途: BGMループ (SFX placeholder)
- 出典: ローカル生成（ffmpeg anullsrc, 0.1秒無音 44.1kHz stereo）
- ライセンス: -
- 配置: assets/audio/bgm/bgm_loop.mp3
- 採用日: 2026-05-16
- 注記: 後日 CC0 BGM（Pixabay Music 等）に差し替え予定

## 注意

- 本リポジトリは社内利用前提
- 採用した素材は **必ず本ファイルにライセンス・出典を追記**
- 商用配布する場合は再確認が必要
- メンバーオマージュキャラは本人の承諾を得たうえで使用
