# 朝向けハンドオフ（2026-05-19 披露日）

夜間に Claude が自律実行した成果と、ユーザー（あなた）が朝起きてからやるべき作業の一覧です。

---

## TL;DR（最短実行手順）

1. **PartyKit デプロイ**（10 分・必須）
   ```powershell
   cd C:\Users\OWNER\Desktop\Project\arigato_arena\apps\server
   pnpm dlx partykit login
   # （Supabase URL と service_role キーを手元に用意）
   pnpm dlx partykit env add SUPABASE_URL
   pnpm dlx partykit env add SUPABASE_SERVICE_ROLE_KEY
   cd ..\..
   pnpm deploy:server
   # → 出力されたホスト名（arigato-arena.<account>.partykit.dev）をメモ
   ```

2. **Vercel デプロイ**（5 分・必須）
   - Vercel ダッシュボード → New Project → リポジトリ import
   - Root Directory: `apps/client`
   - 環境変数 `NEXT_PUBLIC_PARTYKIT_HOST` に上のホスト名を設定
   - Deploy

3. **社内 NW で疎通確認**（5 分・必須）
   - 社内 PC の Chrome で Vercel URL を開く
   - DevTools → Network → WS で `101 Switching Protocols` を確認

4. **ローカルでの最終動作確認**（任意）
   ```powershell
   cd C:\Users\OWNER\Desktop\Project\arigato_arena
   pnpm dev
   # → localhost:3000 で `pnpm dev` がクライアント＋PartyKit dev を並列起動
   ```

詳細手順: `docs/deploy-runbook-day2.md`

---

## 夜間に Claude が自律実行した変更

### ✅ 1. 武器バランス「中庸案」を適用（コード変更済み）

`packages/shared/src/constants.ts` を以下に変更：

| 項目 | 旧 | 新 | 意図 |
|---|---|---|---|
| AR damage | 25 | **20** | 胴 5 発キル、TTK 0.3→0.4s |
| AR spread | 0.01 | 0.012 | わずかにブレ |
| SG damage | 15 | **18** | 1 ペレット HS 36 で近距離一撃ロマン |
| SG fireIntervalMs | 700 | 550 | 外しても 2 発目を撃てる救済 |
| SG spread | 0.12 | 0.10 | 命中率改善 |
| SG reloadTimeMs | 2800 | 2600 | テンポUP |
| SG maxRange | 20 | 18 | 中距離無力化 |
| SG rangeDropoffMin | 0.3 | 0.25 | 遠距離さらに弱体 |
| SMG damage | 18 | **22** | 胴 5 発キル、AR より速い |
| SMG fireIntervalMs | 67 | 70 | わずか落ち着き |
| SMG spread | 0.03 | 0.035 | 連射の代償 |
| SMG maxRange | 40 | 35 | 中距離弱体 |
| SMG rangeDropoffStart | 15 | 10 | AR との差別化 |
| SMG rangeDropoffMin | 0.5 | 0.4 | 遠距離無力 |
| RESPAWN_DELAY_MS | 3000 | **2000** | テンポUP |
| SPAWN_INVINCIBLE_MS | 2000 | 1500 | 無敵時間短縮 |
| PLAYER_PHYSICS.sprintSpeed | 8.0 | **9.0** | 爽快感UP |
| PLAYER_PHYSICS.headRadius | 0.15 | **0.18** | HS 演出増加 |

**TTK 比較（中庸案）**:
- AR 胴 0.4s（5 発）
- SG 近距離 0.55s（2 発）/ HS で即死可能
- SMG 胴 0.28s（5 発）/ AR より速い ← 室内特化

**テスト修正**: `apps/server/src/__test__/damage.test.ts` の 5 件の直書き値を `WEAPONS.ar.damage` 等の定数参照に書き換え。テスト 220 件全グリーン継続。

**ロールバック**:
```powershell
git revert <該当commit>
pnpm deploy:server   # PartyKit に再デプロイ
```

---

### ✅ 2. デプロイ設定ファイル一式（完備済み）

| ファイル | 内容 |
|---|---|
| `vercel.json` | Vercel 用最小設定（installCommand / buildCommand） |
| `.env.example`（ルート） | 環境変数テンプレ |
| `apps/client/.env.example` | クライアント側 |
| `apps/server/.env.example` | サーバー側（PartyKit Secrets 用） |
| `apps/server/partykit.json` | `compatibilityDate: 2025-03-01` に更新 |
| `package.json` | `deploy:server` スクリプト追加 |
| `README.md` | プロジェクト概要＋ローカル開発 |
| `docs/deploy-runbook-day2.md` | デプロイ手順詳細 |

---

### ✅ 3. キャラクター ターンアラウンド 9 体揃った

- 既存 5 体（k2/hyouga/shuto/daichi/katsuya）は元から OK
- **残り 4 体（tsuchiga/hide/yugo/iru）を Higgsfield `nano_banana_2` で生成・配置**
  - k2 スタイル統一: 3-view、T-pose、白背景、カートゥーン
  - `assets/characters/_source/<id>/turnaround_v2.png` に保存
  - 旧バージョンは `turnaround_v2_legacy.png` として保持（gitignore）
- **使い方**: `docs/glb-pipeline-day2.md` の手順に従って Tripo or Meshy Web UI に投入
- **完了条件**: `assets/characters/<id>.glb` に保存すれば、`apps/client/game/scene/CharacterModel.tsx` が自動で読み込む
- **間に合わない場合**: カプセル＋webp アバターで「誰が誰か」は Phase 4 で達成済み、必須ではない

**Higgsfield 残クレジット**: 約 1,510（Plus プラン）

---

### ✅ 4. GLB 配置ヘルパ
- `scripts/glb-audit.mjs` 新規追加
- 実行: `pnpm glb:audit` → 9 体の存在＆サイズチェック

---

## ⚠️ ユーザーが朝起きてからやる作業

### 必須（披露 3 時間前まで）

| # | 作業 | 所要 | 詳細 |
|---|---|---|---|
| 1 | PartyKit login → secrets → deploy | 10 分 | TL;DR 参照、`docs/deploy-runbook-day2.md` |
| 2 | Supabase 新規プロジェクト作成 + migration | 10 分 | SQL Editor で `supabase/migrations/0001_init.sql` を Run |
| 3 | Vercel Import → 環境変数 → Deploy | 5 分 | `NEXT_PUBLIC_PARTYKIT_HOST` を忘れずに |
| 4 | 社内 NW で WebSocket 疎通確認 | 5 分 | Chrome DevTools で 101 Switching Protocols |
| 5 | 2〜3 人で 5 分間プレイテスト | 15 分 | バランス確認、明確な不満があれば下記参照 |

### バランス調整したくなった場合（任意）

`packages/shared/src/constants.ts` の **値だけ** 変更 → 以下を順に実行：
```powershell
pnpm typecheck
pnpm test
pnpm deploy:server
```
クライアントは Vercel の自動再ビルド待ち（2〜4 分）。Vercel 不要なら `pnpm --filter @arigato/client dev` でローカル即時。

**ありがちな調整**:
- AR が強すぎる → `ar.damage: 20 → 18`
- SG が当たらない → `sg.spread: 0.10 → 0.08`
- リスポーン待ちが長い → `RESPAWN_DELAY_MS: 2000 → 1500`
- スプリントが速すぎる → `sprintSpeed: 9.0 → 8.5`

### GLB を入れたい場合（任意）

`docs/glb-pipeline-day2.md` の手順で Tripo / Meshy Web UI 経由で 9 体（推奨は 5 体先行）。配置先 `assets/characters/<id>.glb`。**入らなくてもカプセル fallback で動く**ので焦らない。

---

## 既知の問題・リスク

| # | 問題 | 影響 | 対処 |
|---|---|---|---|
| R1 | PartyKit 無料枠 100k req/日 | リハ＋当日で枯渇 | 出社後に有料プラン（$10/月）切り替え推奨 |
| R2 | アバター webp 9 体合計 6.5MB（500KB/個 超） | ロビー初期ロード 1〜2 秒遅延 | 社内 LAN なら許容範囲、気になれば cwebp で再圧縮 |
| R3 | 社内 NW WebSocket 遮断 | 接続不能で披露失敗 | curl で 101 確認、NG ならホスト PC で `pnpm dev` 起動して LAN IP 直配布 |
| R4 | キャラ顔の同一性が中程度 | 「似てない」と言われる | アバター webp（実写）の方が認識性高い、ラベルで補完 |
| R5 | Supabase 接続失敗時はサイレント warn | DB 保存されないが試合は遊べる | Secret 設定を `partykit env list` で必ず確認 |

---

## テスト結果（最新）

```
shared:  15 passed
server:  71 passed
client: 134 passed
合計:   220 passed
typecheck: 全パッケージ clean
```

---

## コードレビュー結果＆修正（reviewer agent + メイン Claude）

reviewer agent が **15 件** の指摘を出し、その場で **6 件を修正**、5 件は実害なしで見送り、残り 4 件はリスクとして記録。

### ✅ 修正済み（commit 済み）

| # | 内容 | 修正ファイル |
|---|---|---|
| P1-1 | KillFeed の TTL（5秒）が常に opacity=1 で実装されていなかった → 試合中ずっと蓄積するバグ。`receivedAt` を `KillFeedEntry` に追加し `feedOpacityFromAge` で実装＋表示時 filter | `apps/client/lib/hud/KillFeedList.tsx`, `apps/client/game/store/gameStore.ts` |
| P1-2 | `hostId: ''` でクライアント Zod が `room_snapshot` をパース失敗する可能性 → `RoomStateSchema.hostId` を `z.string()` に緩和 | `packages/shared/src/schema.ts` |
| P1-4 | タイマー点滅が「残り60秒以下」になっていた → 要件通り「残り10秒以下」に修正 | `apps/client/lib/hud/MatchTimer.tsx` |
| P1-6 | `RESPAWN_FALLBACK_MS = 3_000` がサーバー側 `RESPAWN_DELAY_MS = 2_000` とズレ → shared から import して `RESPAWN_DELAY_MS + 200` に統一 | `apps/client/game/store/gameStore.ts` |
| P2-5 | `TeamScoreBoard` が `HudOverlay` で未使用、デッドコード → ファイル削除（MatchTimer 内のスコア表示で代用） | `apps/client/lib/hud/TeamScoreBoard.tsx` 削除 |
| P2-13 | KillFeed の表示上限 5 件と store 上限 6 件の不整合 → `KILL_FEED_DISPLAY_MAX = 5` で統一 | `apps/client/game/store/gameStore.ts` |

### ❌ 誤指摘（対応不要）

| # | 内容 | 判断根拠 |
|---|---|---|
| P1-3 | `GameView.tsx:94` で `createGameConnection()` を内部生成して接続二重管理 | 実際は `connection` は **props で受け取っている**（`useMemo(() => createGameConnection(), [])` は GameView.tsx に存在しない）。実害なし |

### ⚠️ 見送り（リスクとして記録、披露中に問題が出たらメモ）

| # | 内容 | 影響度 | 当日トラブル時の対処 |
|---|---|---|---|
| P2-7 | 被弾インジケータが shooter の位置を最大 50ms 前で計算 | 微小 | 視覚演出の正確性のみ、ゲーム進行に影響なし |
| P2-8 | AudioContext init 失敗時に BGM が無音になる | クラッシュなし | ユーザーが気付けば「音が出ない」と分かる |
| P2-9 | キャラ未選択（デフォ k2 のまま）で試合開始可能 | 型上 `characterId` は enum で null 不可、「未選択」を区別する方法なし | UI で「キャラ選択してね」と書く運用回避 |
| P2-12 | 死亡時のメッシュ透明化が CharacterModel 側に伝わらない | 死亡演出の視覚効果のみ | キャラが消えるわけではない、戦況確認は名前ラベルで可能 |
| P3-10/11/14/15 | 軽微（コメント不足、no-op 残置、空マップガード） | なし | 触らない |

### コードレビュー後のテスト結果

```
shared:  15 passed
server:  71 passed
client: 134 passed
合計:   220 passed
typecheck: 全パッケージ clean
```

---

## ファイル変更サマリ

**変更（M）**:
- `.env.example`
- `.gitignore`
- `apps/server/partykit.json`
- `apps/server/src/__test__/damage.test.ts`
- `package.json`
- `packages/shared/src/constants.ts`

**新規（??）**:
- `README.md`
- `apps/client/.env.example`
- `apps/server/.env.example`
- `assets/characters/_source/{tsuchiga,hide,yugo,iru}/turnaround_v2.png`
- `docs/deploy-runbook-day2.md`
- `docs/glb-pipeline-day2.md`
- `docs/morning-handoff.md`（このファイル）
- `scripts/glb-audit.mjs`
- `vercel.json`

---

## トラブル時の連絡先（自分用）

- ローカルで全機能動作: `pnpm dev` で localhost:3000
- 退避プラン: 全機能ローカル動作なので、最悪 Vercel 不要でホスト PC を社内 LAN で公開する
- 緊急ロールバック: `git revert <commit>` → `pnpm deploy:server`

頑張ってください！🎯
