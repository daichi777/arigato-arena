# ArigatoArena — プロジェクトメモリ

社内イベント用FPS「ArigatoArena」を **2日間** で開発する。
Claude Code の subagent 並列開発を前提に設計されている。

> このファイルは全セッション・全subagentが自動で読み込む。
> 詳細仕様は `docs/requirements.md` と `docs/phase0-contract.md` を参照。

---

## 1. ゴールとスコープ

| 項目 | 内容 |
|---|---|
| 種別 | ブラウザFPS（チームデスマッチ） |
| 規模 | 5v5、最大10人同時接続 |
| 試合時間 | 3分 |
| 想定環境 | デスクトップChromeのみ、社内LAN |
| 完成定義 | 10人が同時参加して3分撃ち合い、結果が出る |

**MVP対象外**（=実装しない）: しゃがみ・チャット・足音・複数マップ・ランクマッチ・スマホ対応・チート対策・client prediction・観戦・スキン。

---

## 2. 技術スタック（凍結）

| レイヤ | 採用技術 |
|---|---|
| クライアント | Next.js 15 (App Router) + React Three Fiber + @react-three/rapier + Zustand |
| ゲームサーバー | PartyKit（Cloudflare Durable Objects）、20Hz tick、サーバー権威 |
| 永続化 | Supabase（Postgres） |
| ホスティング | Vercel（フロント）、PartyKit（サーバー）、Supabase（DB） |
| パッケージマネージャ | pnpm workspace |
| 型 | TypeScript strict mode、Zodで実行時検証 |
| アセット生成 | Higgsfield（画像） → Tripo/Meshy MCP（3D化） → Mixamo（リグ） |

---

## 3. リポジトリ構成

```
arigato-arena/
├── CLAUDE.md                  ← このファイル
├── docs/
│   ├── requirements.md        ← 要件定義
│   ├── phase0-contract.md     ← 契約定義（型・プロトコル・定数）
│   └── member-profiles-template.md  ← メンバー特徴メモ
├── .claude/agents/            ← subagent定義（6体）
├── packages/
│   └── shared/                ← ★全agentが参照する契約。凍結対象
│       ├── types.ts
│       ├── protocol.ts
│       ├── constants.ts
│       └── schema.ts          ← Zod
├── apps/
│   ├── client/                ← Next.js + R3F
│   └── server/                ← PartyKit Room
├── assets/                    ← GLB / 音声
├── supabase/migrations/
└── tests/e2e/
```

---

## 4. 重要原則（全agent共通）

### 契約の取り扱い
- `packages/shared/` は **Day1午前以降は原則凍結**。
- フィールド **追加** は可。**リネーム/削除** は Integrator Agent 経由で全体周知。
- 型変更時は必ずユーザーに宣言してから着手。

### 担当範囲の遵守
- 各subagentは自分の担当ディレクトリのみ変更する。
- 他agentの領域に踏み込まない（衝突防止）。
- 実装前に `docs/phase0-contract.md` を必ず参照。

### コード品質
- TypeScript strict、`any` 禁止。`unknown` から narrow する。
- サーバー側は **必ず** Zodスキーマで入力検証。
- 副作用のあるI/Oは境界に集約（純粋関数を優先）。
- コメントは「なぜ」だけ書く。「何を」はコードで表現する。

### Git運用
- mainブランチで作業（単独開発想定、`~/.claude/rules/git-workflow.md` 準拠）。
- コミットメッセージは日本語、`Phase X: 実装内容` 形式。
- `.env` は絶対にコミットしない。
- `git push --force` 禁止。

### ログ・出力
- ユーザーへの説明は **日本語**（`~/.claude/CLAUDE.md` 準拠）。
- 簡潔・箇条書き優先。
- 各セッション・subagent終了時に何を変更したか短く報告。

---

## 5. 通信・同期の合意事項（変更厳禁）

| 項目 | 値 |
|---|---|
| tickレート | 20Hz（50ms） |
| snapshot送信 | 20Hz、差分なしフルステート |
| 補間バッファ | 100ms |
| クライアント予測 | なし |
| ラグ補正 | なし |
| エンコード | JSON |
| 切断検知 | 入力途絶5秒 |
| 座標系 | Y-up、1unit=1m、マップ原点中央 |
| マップ範囲 | X[-30,+30] × Z[-20,+20] |

詳細は `docs/phase0-contract.md` セクション4-5を参照。

---

## 6. subagent並列構成

| Agent | 担当 | 主ディレクトリ |
|---|---|---|
| renderer | R3F・Rapier・カメラ・入力・HUD | `apps/client/game/` |
| server | PartyKit Room・tick・hitscan判定 | `apps/server/` |
| lobby | Next.js画面・Supabase・参加フロー | `apps/client/app/`, `supabase/` |
| asset | キャラ9体・マップ・音声生成 | `assets/` |
| integrator | 結合・型整合・E2E | `tests/`, ルート |
| reviewer | コードレビュー・rate limit確認 | レビュー出力のみ |

各agentの詳細指示は `.claude/agents/*.md` を参照。

**起動例**:
```
Agent({ subagent_type: "renderer", prompt: "Day1午前タスクを実行" })
Agent({ subagent_type: "server",   prompt: "Day1午前タスクを実行" })
```

---

## 7. 開発スケジュール

### Day 1
- **午前**: モノレポ骨格 + `packages/shared/` 実装（直列、契約凍結）
- **午後**: 各agent並列で骨組み実装
  - renderer: マップ表示・WASD移動・マウスルック・物理
  - server: Room・tick loop・位置同期broadcast
  - lobby: ロビー/待機画面・ルームコード参加
  - asset: キャラ5体先行生成
- **終了時**: bot10体で同時接続負荷テスト

### Day 2
- **午前**: 戦闘システム
  - renderer: 発砲・ヒットエフェクト・HUD
  - server: hitscan判定・HP・キル・リスポーン
  - asset: 残4体 + マップ仕上げ
- **午後**: 統合・調整・テスト
  - integrator: E2E結合テスト
  - 武器バランス調整（`constants.ts` の数値のみ）
  - 本番疎通確認

**バッファ**: Day2午後に4時間確保。必ず何かが壊れる前提。

---

## 8. 凍結項目（変更には全体合意が必要）

- メッセージプロトコルの型構造（フィールド追加はOK、リネーム/削除NG）
- 座標系（Y-up、1unit=1m）
- tickレート（20Hz）
- スポーン地点座標
- マップ範囲
- 武器3種の `WeaponType` 識別子（パラメータ値は調整OK）

---

## 9. 既知のリスク

| # | リスク | 対策 |
|---|---|---|
| R1 | 9体アセット生成パイプライン詰まり | asset agent 2並列、5体先行 |
| R2 | キャラの「似てない」問題 | `docs/member-profiles-template.md` を先に埋める |
| R3 | 武器バランス時間不足 | Day2午後にテスト枠確保 |
| R4 | サーバー権威ヒット判定の難度 | `phase0-contract.md` で仕様確定済み |
| R5 | PartyKit 10人接続未検証 | Day1終了時にbot負荷テスト |
| R6 | 社内NWのWebSocket遮断 | Day2朝に本番疎通確認 |

---

## 10. レート制限・運用上の注意

- Claude Code Maxプラン契約済（API実費なし）。
- ただし5時間ウィンドウのメッセージ上限あり。**6エージェント同時長時間運用は止まりやすい**。
- 対策:
  - reviewer agent は即応性不要 → 別タイミングで回す
  - asset agent は外部MCP叩く時間が長く Claude負荷は軽い → 並列に強い
  - 重い実装系（renderer / server）は時間ずらすか交代制

---

## 11. ユーザーとの対話ルール

- 仕様変更・契約変更が必要な場合は **必ずユーザーに確認してから着手**。
- アセット品質（「似てる/似てない」）はユーザー判断を仰ぐ。
- バランス調整値は提案ベースでユーザーレビューを受ける。
- Day1終了時・Day2終了時にステータスサマリを報告する。
