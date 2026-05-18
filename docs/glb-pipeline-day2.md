# GLB生成パイプライン Day2 マニュアル

キャラクター9体を Tripo3D または Meshy のWeb UIで3D化し、GLBとして
`assets/characters/<id>.glb` に配置するための手順書。

---

## 事前確認

- ターンアラウンド画像（正面・側面・背面）が `assets/characters/_source/<id>/` に保存済みであること
- `turnaround_v2.png`（または `generated_v1.png`）を使用する
- CharacterId（ファイル名）は以下9種のいずれか：
  `k2`, `hyouga`, `shuto`, `daichi`, `katsuya`, `tsuchiga`, `hide`, `yugo`, `iru`

---

## 9キャラクター チェックリスト

| ID | 表示名 | 画像準備済み | Tripo投入 | GLBダウンロード | 配置完了 |
|----|--------|:-----------:|:--------:|:--------------:|:-------:|
| k2 | k2 | [ ] | [ ] | [ ] | [ ] |
| hyouga | ひょうが | [ ] | [ ] | [ ] | [ ] |
| shuto | しゅーと | [ ] | [ ] | [ ] | [ ] |
| daichi | だいち | [ ] | [ ] | [ ] | [ ] |
| katsuya | かつや | [ ] | [ ] | [ ] | [ ] |
| tsuchiga | つちが | [ ] | [ ] | [ ] | [ ] |
| hide | ひで | [ ] | [ ] | [ ] | [ ] |
| yugo | ゆうご | [ ] | [ ] | [ ] | [ ] |
| iru | あいる | [ ] | [ ] | [ ] | [ ] |

---

## Tripo3D vs Meshy 比較

| 項目 | Tripo3D | Meshy |
|------|---------|-------|
| URL | https://www.tripo3d.ai/ | https://meshy.ai/ |
| 画像入力 | シングル画像 or マルチビュー | シングル画像 or テキスト |
| マルチビュー対応 | あり（正面・側面・背面を別々に指定可） | 制限あり |
| ポリゴン品質 | 高品質・クリーンメッシュ | 高速・ゲーム向け最適化 |
| GLBエクスポート | 標準対応 | 標準対応 |
| テクスチャ解像度 | 最大2048×2048 | 最大1024×1024 |
| 無料枠 | あり（クレジット制） | あり（クレジット制） |
| 推奨用途 | 高品質キャラクター | 量産・速度優先 |

推奨: **Tripo3D のマルチビューモード**を使用する。
ターンアラウンドシート（正面・側面・背面の3ビュー）をそのまま投入できる。

---

## Tripo3D 操作手順

### 1. プロジェクト作成

1. https://www.tripo3d.ai/ にアクセス、ログイン
2. 「Create」→「Image to 3D」を選択
3. 「Multi-view」モードを選択

### 2. 画像アップロード

- Front: ターンアラウンドシートから正面部分をトリミングしたもの
- Side: ターンアラウンドシートから側面部分をトリミングしたもの
- Back: ターンアラウンドシートから背面部分をトリミングしたもの
- または `turnaround_v2.png`（3ビュー1枚）をシングルモードで投入

### 3. 生成設定

- Style: Realistic or Anime（キャラクター風）
- Quality: High（時間がかかるが品質優先）
- T-Pose: 生成プロンプトで「T-pose, arms extended horizontally」を指定

### 4. GLBエクスポート

1. 生成完了後「Export」→「GLB」を選択
2. ダウンロードしたGLBを `assets/characters/<id>.glb` に保存

---

## キャラクター別 Tripo プロンプト

各キャラクターの生成時に追加するプロンプト（英語推奨）:

### k2 (Yoshikawa Ryo - 宇宙人)
```
stocky Japanese man, olive green jacket, dark pants, brown shoes,
round face, short black hair, mysterious alien-like expression,
T-pose, arms extended horizontally, full body, game character
```

### hyouga (Hiromori Hyouga - 知的・冷静)
```
slim Japanese man, black jacket, grey pants, black-rimmed glasses,
medium brown hair, calm intellectual expression,
T-pose, arms extended horizontally, full body, game character
```

### shuto (Nakamura Shuto - 温和な好青年)
```
young Japanese man, black double-breasted suit, black tie,
round face, gentle smile, short dark hair,
T-pose, arms extended horizontally, full body, game character
```

### daichi (Nakata Daichi - 兄貴肌)
```
sturdy Japanese man, casual athletic wear, reliable older brother vibe,
strong build, short dark hair, confident expression,
T-pose, arms extended horizontally, full body, game character
```

### katsuya (Takahashi Katsuya - クール)
```
slim Japanese man, dark stylish outfit, cool expressionless face,
neat dark hair, calm collected demeanor,
T-pose, arms extended horizontally, full body, game character
```

### tsuchiga (Tsuchiga Koushi - 思慮深い)
```
Japanese man, formal black suit, white dress shirt,
round broad face, short dark hair, thoughtful serious expression,
T-pose, arms extended horizontally, full body, game character
```

### hide (Mifuji Hideya - 元気・ノリよし)
```
energetic young Japanese man, black jacket over white T-shirt,
dark slightly wavy hair, small earring, big cheerful smile,
T-pose, arms extended horizontally, full body, game character
```

### yugo (Nishimoto Yugo - 爽やか・知的)
```
smart fresh-looking Japanese man, clean black outfit,
neat dark hair, bright intelligent expression,
T-pose, arms extended horizontally, full body, game character
```

### iru (Matsuo Iru - アーティスト)
```
artistic creative Japanese man, grey-green jacket,
medium dark hair, artistic expressive vibe, creative confident look,
T-pose, arms extended horizontally, full body, game character
```

---

## GLB 品質基準

| 項目 | 制約 |
|------|------|
| ファイルサイズ | 5 MB 以下 |
| ポリゴン数（三角形） | 20,000 以下 |
| テクスチャ解像度 | 1024×1024 以下推奨 |
| ポーズ | Tポーズ（Mixamoリグのため） |
| 足元座標 | y = 0 （地面基準） |
| キャラクター身長 | 1.7 〜 1.8 m 相当（1 unit = 1 m） |

---

## ファイル配置ルール

```
assets/
└── characters/
    ├── k2.glb          ← assets/characters/k2.glb
    ├── hyouga.glb
    ├── shuto.glb
    ├── daichi.glb
    ├── katsuya.glb
    ├── tsuchiga.glb
    ├── hide.glb
    ├── yugo.glb
    └── iru.glb
```

- ファイル名は CharacterId と完全一致させること（大文字禁止）
- `_shared/` ディレクトリはアニメーション共有用（Mixamo後）

---

## 監査スクリプト

全キャラクターのGLBが揃っているか、サイズ基準を満たしているかを確認:

```bash
pnpm glb:audit
```

または:

```bash
node scripts/glb-audit.mjs
```

---

## トラブルシューティング

| 問題 | 対処 |
|------|------|
| ポリゴン超過 | Tripo の「Optimize」機能 or Blenderの「デシメート」モディファイア |
| ファイルサイズ超過 | テクスチャを512×512に圧縮、gzip圧縮GLB（GLTFPack使用） |
| Tポーズにならない | プロンプトに「T-pose, rest pose, arms horizontal」を追加 |
| 足が地面にめり込む | Blenderでモデル全体をY軸方向に移動し足元をy=0に合わせる |
| 顔が潰れる | マルチビューモードで正面画像の品質を優先 |

---

## 代替: Mixamoキャラクターのフォールバック

時間が足りない場合は Mixamo の既製キャラクターを使用する:

1. https://www.mixamo.com/ にアクセス
2. 「Characters」タブから近いキャラを選択
3. 「Download」→ Format: FBX for Unity/Unreal → Pose: T-Pose
4. Blender で FBX → GLB に変換
5. `assets/characters/<id>.glb` に配置

この場合、`assets/CREDITS.md` に Mixamo のライセンス情報を記載すること。
