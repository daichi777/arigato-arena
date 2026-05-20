# 朝向けハンドオフ（2026-05-20 披露日）

## 🔥 方針変更（重要）

**PartyKit クラウドのダッシュボードが障害中**（500 INTERNAL_SERVER_ERROR / MIDDLEWARE_INVOCATION_FAILED）でログインできず、デプロイ不可と判明。

→ **ローカル LAN 配布プランに切り替え**（コード調整済み）

| 項目 | 旧計画 | 新計画 |
|---|---|---|
| サーバー | PartyKit Cloud にデプロイ | **ホスト PC で `pnpm dev` 起動 → 社内 LAN 配布** |
| クライアント | Vercel デプロイ | 同上（同じ `pnpm dev` で Next.js も起動） |
| 環境変数 | `NEXT_PUBLIC_PARTYKIT_HOST` を Vercel に設定 | **設定不要**（`window.location.hostname` 自動追従に改修済み） |
| 参加者の URL | `https://arigato-arena.vercel.app` | `http://<ホストPC の社内 IP>:3000` |

詳細手順: **`docs/local-lan-fallback.md`** を必読。

---

## TL;DR（最短実行手順・全 10 分）

### 1. ファイアウォール許可（1 回だけ、管理者 PowerShell）

```powershell
New-NetFirewallRule -DisplayName "ArigatoArena Next.js" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "ArigatoArena PartyKit" -Direction Inbound -Protocol TCP -LocalPort 1999 -Action Allow
```

### 2. dev サーバー起動

```powershell
cd C:\Users\OWNER\Desktop\Project\arigato_arena
pnpm dev
```

→ `▲ Next.js ready` と `🎈 PartyKit dev server` が出れば成功。

### 3. ホスト PC の社内 IP を確認

```powershell
ipconfig
```

「IPv4 アドレス」（例: `192.168.1.42`）をメモ。

### 4. スリープ抑制

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
```

### 5. 参加者に URL 配布

Slack で:
```
ArigatoArena: http://192.168.1.42:3000
※ Chrome で開いてください、社内 Wi-Fi に接続必須
```

### 6. 動作確認（自分の PC）

ブラウザで `http://localhost:3000` → ロビー画面が出れば OK。

---

## 夜間に Claude が完了した変更（commit 済み）

### Phase 5 (556ce83)
- 武器バランス「中庸案」適用（AR 25→20、SG 15→18、SMG 18→22 等）
- Phase 4 動作確認バグ 6 件修正（KillFeed TTL・タイマー閾値・hostId Zod・RESPAWN ズレ・TeamScoreBoard 削除・上限統一）
- 残り 4 体ターンアラウンド画像（nano_banana_2 で k2 スタイル統一）
- デプロイ設定一式（vercel.json / .env.example / partykit.json / README / runbook）
- 220 テスト全グリーン

### Phase 6（このコミット）
- ローカル LAN 配布プラン整備
  - `apps/client/lib/lobby/env.ts`: `window.location.hostname` 自動追従
  - `apps/client/package.json`: `next dev -H 0.0.0.0 -p 3000` で全 IF バインド
  - `apps/server/package.json`: `partykit dev --port 1999` 明示
- `docs/local-lan-fallback.md`: 手順書（必読）
- このハンドオフ更新

---

## 武器バランス（変更済み）

| 項目 | 旧 | 新 | 意図 |
|---|---|---|---|
| AR damage | 25 | **20** | 胴 5 発キル、TTK 0.3→0.4s |
| SG damage | 15 | **18** | 1 ペレ HS 36 で近距離一撃ロマン |
| SG fireIntervalMs | 700 | 550 | 外しても 2 発目を撃てる救済 |
| SMG damage | 18 | **22** | 胴 5 発キル、AR より速い |
| RESPAWN_DELAY_MS | 3000 | **2000** | テンポUP |
| sprintSpeed | 8.0 | **9.0** | 爽快感UP |
| headRadius | 0.15 | **0.18** | HS 演出増加 |

**披露中に「強すぎ/弱すぎ」を感じたら**: `packages/shared/src/constants.ts` の値だけ変更 → `pnpm typecheck` → dev サーバーを Ctrl+C → `pnpm dev` で再起動（30 秒で反映）

---

## 既知のリスク

| # | 問題 | 対処 |
|---|---|---|
| R1 | ホスト PC が単一障害点 | スリープ抑制（上記 Step 4）必須、有線 LAN 推奨 |
| R2 | アバター webp が 9 体 500KB 超 | 社内 LAN なので初期ロード OK |
| R3 | キャラ未選択（デフォ k2 のまま）で試合開始可能 | UI で「キャラ選択してね」と口頭呼びかけ |
| R4 | PartyKit クラウド障害が続く可能性 | LAN 配布なので影響なし ✅ |

---

## 動作確認チェックリスト（最終）

ロビー画面で：
- [ ] 名前入力 → ルーム作成 → 6 桁コード生成
- [ ] 別タブで参加（同じコードで join）
- [ ] キャラ選択（9 体アバター webp 表示）
- [ ] チームシャッフル
- [ ] 試合開始 → 3 カウントダウン → playing 遷移

試合中：
- [ ] WASD 移動、Space ジャンプ、マウス視点
- [ ] 左クリック発砲、武器音再生（AR/SG/SMG で違う音）
- [ ] R キーでリロード
- [ ] 1/2/3 キーで武器切替
- [ ] 名前ラベル＋アバター画像表示（距離 30m でフェード）
- [ ] HP バー、弾薬カウンター、左下 SelfAvatar 表示
- [ ] KillFeed 右上に流れる（5 秒でフェード消失 ← 修正済み）
- [ ] 被弾時に画面端に方向矢印
- [ ] HS でキルしたら黄色光彩
- [ ] 残り 10 秒でタイマー赤点滅（← 修正済み、60 秒ではない）
- [ ] 死亡 → 2 秒待機 → リスポーン無敵 1.5 秒（← 修正済み、3 秒ではない）

試合終了：
- [ ] match_end で結果画面遷移
- [ ] スコアテーブル / MVP 表示
- [ ] 「もう一度」ボタンでロビーへ戻れる

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

## ファイル位置（ブックマーク用）

- **今すぐ読む**: このファイル（`docs/morning-handoff.md`）
- **LAN 配布の詳細**: `docs/local-lan-fallback.md`
- **PartyKit クラウドが復活した場合**（参考）: `docs/deploy-runbook-day2.md`
- **GLB 化（任意）**: `docs/glb-pipeline-day2.md`

---

## 緊急時の連絡先（自分用）

- ロールバック: `git revert <commit>` → dev 再起動
- 全消し再起動: `git reset --hard HEAD~1`（直前 1 commit 戻し、注意）
- ホスト PC を切り替えたい: 別 PC で `git clone` → `pnpm install` → 同手順

頑張ってください！🎯
