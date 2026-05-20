# ローカル LAN 配布プラン（退避プラン → 本番プラン）

PartyKit クラウドのデプロイが障害でできない場合、または社内 NW で wss が遮断される場合に、**ホスト PC を社内 LAN サーバー**にして全員を直接接続させる方法。

これが今回（2026-05-20）の **本番運用プラン** です（PartyKit クラウドは諦めた）。

---

## 構成

```
[ホストPC（あなた）]              [参加者PC × 9 台]
  ┌─────────────────────┐
  │ Next.js  :3000  ←──────── http://<host-ip>:3000  
  │ PartyKit :1999  ←──────── ws://<host-ip>:1999
  └─────────────────────┘
       同じ社内 LAN 内
```

`apps/client/lib/lobby/env.ts` で **`window.location.hostname` 自動追従**になっているので、参加者 PC が `http://<host-ip>:3000` を踏めば、WebSocket は自動的に `ws://<host-ip>:1999` に張られます（環境変数設定不要）。

---

## ホスト PC の準備（5 分）

### 1. ファイアウォール許可（管理者 PowerShell で 1 回だけ）

スタートメニュー → 「PowerShell」 → 右クリック → 「管理者として実行」

```powershell
New-NetFirewallRule -DisplayName "ArigatoArena Next.js" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
New-NetFirewallRule -DisplayName "ArigatoArena PartyKit" -Direction Inbound -Protocol TCP -LocalPort 1999 -Action Allow
```

成功すると `Status: OK` が表示される。一度許可すれば次回以降は不要。

### 2. dev サーバー起動

普通の（管理者でない）PowerShell で：

```powershell
cd C:\Users\OWNER\Desktop\Project\arigato_arena
pnpm dev
```

起動完了の目印：
- `▲ Next.js 15.x.x ready` が表示される
- `🎈 PartyKit dev server` のログが表示される

### 3. 社内 LAN IP を確認

別のターミナルで：

```powershell
ipconfig
```

「**IPv4 アドレス**」を探す。社内 NW 内の値（例: `192.168.1.42`、`10.0.5.130`）をメモ。

> 💡 複数 NIC（Wi-Fi + 有線）が出る場合、社内 LAN で実際に使われている方を選ぶ。Wi-Fi なら「Wireless LAN adapter Wi-Fi」配下、有線なら「Ethernet adapter」配下。

### 4. 動作確認（自分の PC で）

ブラウザで `http://localhost:3000` を開く → ロビー画面が出れば OK。

別 PC からホスト PC への接続テスト（任意）：
- もう 1 台の PC のブラウザで `http://<host-ip>:3000` を開く
- ロビー画面 → 「参加」 → ルームコードに自分（ホスト）が作ったコードを入れる
- 接続できれば LAN 配布が成立している

---

## 参加者への配布

Slack やメールで以下を共有：

```
ArigatoArena アクセス URL:
http://<host-ip>:3000

例: http://192.168.1.42:3000

【注意】
- 必ず Chrome で開く
- ホスト PC（k2 さん）と同じ社内 LAN（Wi-Fi or 有線）に接続必須
- ホスト PC を落とさないでください
```

---

## 試合の進行

通常通り：

1. ホストが「ルーム作成」→ 6 桁コードが発行される
2. ホストがコードを Slack/口頭で参加者に共有
3. 参加者が「ルームコード入力」→「参加」
4. ホストの待機画面で全員が揃ったら「シャッフル」→「試合開始」
5. 3 カウントダウン → 試合開始

---

## トラブル時の対処

| 症状 | 原因 | 対処 |
|---|---|---|
| 参加者から「ページが開けない」 | ファイアウォール未許可 / ホスト IP 間違い | 上記 Step 1 を再実行、`ipconfig` で IP 再確認 |
| 「Connecting...」のまま動かない | WebSocket がブロックされている | 同上、port 1999 のファイアウォール許可を再確認 |
| 急に切れた・全員 disconnect | ホスト PC のスリープ / Wi-Fi 切断 | ホスト PC のスリープ設定を OFF、有線推奨 |
| ホスト PC が重くなる | 同時 10 人で 20Hz tick の負荷 | 他アプリを閉じる、ブラウザの他タブを閉じる |
| 参加者の Chrome で警告 | HTTP（HTTPS でない）警告 | 「詳細設定」→「アクセスする」、または無視 |

---

## ホスト PC のスリープ抑制（必須）

試合中にホスト PC がスリープすると全員切断するので：

```powershell
# 電源とスリープを切る（管理者でなくてもOK）
powercfg /change standby-timeout-ac 0
powercfg /change monitor-timeout-ac 0
```

試合終了後に戻したければ：

```powershell
powercfg /change standby-timeout-ac 30  # 30 分でスリープ
powercfg /change monitor-timeout-ac 15
```

---

## Supabase（戦績保存）について

LAN 配布プランでも Supabase 連携は **任意**：

- **設定する場合**: `apps/server/.env.local` を作成して以下を記入
  ```
  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
  ```
  → `pnpm dev` を再起動すれば、試合終了時に Supabase へ INSERT される

- **設定しない場合**: 何もしなくて OK。`persistMatchResult` が warn ログを吐くだけで、試合は通常通り進行・終了する

---

## メリット・デメリット振り返り

### ✅ メリット
- PartyKit クラウド障害の影響を受けない
- Vercel デプロイ不要
- 環境変数設定不要（`window.location.hostname` 自動追従）
- レイテンシ最小（同 LAN 内なので 1〜2ms）
- インターネット遮断されても動く

### ⚠️ デメリット
- ホスト PC が単一障害点（落ちる/スリープ/切断で全員死亡）
- ホスト PC のスペック依存（10 人接続で CPU/メモリを使う）
- 社内 LAN 外（VPN 経由など）から参加できない

---

## 推奨機材

- ホスト PC: 有線 LAN 接続、メモリ 16GB 以上、CPU 4 コア以上
- 参加者 PC: 通常スペックで OK（Chrome さえ動けば）
- ルーター: 100Mbps 以上（社内 LAN なら通常 OK）

---

実行は `docs/morning-handoff.md` の TL;DR を参照。
