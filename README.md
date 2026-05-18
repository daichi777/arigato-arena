# ArigatoArena

社内イベント用ブラウザFPS（チームデスマッチ 5v5）。  
Next.js + React Three Fiber + PartyKit (Cloudflare Durable Objects) + Supabase 構成。

---

## ローカル開発手順

### 前提

- Node.js 20+、pnpm 9+
- PartyKit アカウント（本番デプロイ時のみ）

### セットアップ

```bash
# リポジトリルートで実行
pnpm install

# 環境変数ファイルを作成
cp .env.example .env.local
# .env.local の NEXT_PUBLIC_PARTYKIT_HOST はデフォルト（127.0.0.1:1999）のままでOK

# ターミナル A: PartyKit ローカルサーバー起動
pnpm --filter @arigato/server dev

# ターミナル B: Next.js クライアント起動
pnpm --filter @arigato/client dev
```

ブラウザで http://localhost:3000 を開く。

### 一括起動

```bash
pnpm dev   # クライアントとサーバーを並列起動（concurrently）
```

---

## 利用可能なスクリプト（リポジトリルート）

| コマンド | 内容 |
|---|---|
| `pnpm dev` | クライアント・サーバー並列起動 |
| `pnpm build` | 全パッケージビルド |
| `pnpm typecheck` | 全パッケージ型チェック |
| `pnpm test` | 全パッケージテスト |
| `pnpm lint` | 全パッケージ lint |
| `pnpm asset:audit` | アセットサイズ・ポリゴン数チェック |
| `pnpm deploy:server` | PartyKit へデプロイ（要ログイン済み） |

---

## 本番デプロイ手順

詳細な手順と手動コマンド一覧は `docs/deploy-runbook-day2.md` を参照。

### 前提アカウント

- PartyKit アカウント（新規作成: https://partykit.io）
- Vercel アカウント（既存）
- Supabase アカウント（既存）

### 1. PartyKit デプロイ

```bash
# ログイン（初回のみ）
pnpm dlx partykit login

# Supabase Secrets を登録
pnpm dlx partykit env add SUPABASE_URL
pnpm dlx partykit env add SUPABASE_SERVICE_ROLE_KEY

# デプロイ
pnpm deploy:server
# または
pnpm --filter @arigato/server deploy
```

デプロイ後、`arigato-arena.<your-account>.partykit.dev` が発行される。

### 2. Vercel 設定

Vercel ダッシュボードで以下を設定する:

| 項目 | 値 |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `apps/client` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` |
| Build Command | `cd ../.. && pnpm --filter @arigato/client build` |
| Output Directory | `.next`（デフォルト） |

Environment Variables（Vercel ダッシュボード）:

| キー | 値 |
|---|---|
| `NEXT_PUBLIC_PARTYKIT_HOST` | `arigato-arena.<your-account>.partykit.dev` |

### 3. Supabase 初期化

Supabase ダッシュボード → SQL Editor で以下を実行:

```sql
-- supabase/migrations/0001_init.sql の内容をコピー&ペーストして実行
```

または Supabase CLI を使う場合:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## 社内NW WebSocket 疎通チェック

### Chrome DevTools での確認

1. Chrome で本番 URL を開く
2. DevTools (F12) → Network タブ → WS フィルタ
3. `arigato-arena.<account>.partykit.dev` への接続が `101 Switching Protocols` で確立されることを確認
4. フレームタブでメッセージが双方向に流れることを確認

### curl での確認

```bash
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://arigato-arena.<your-account>.partykit.dev/party/test-room"
# HTTP/1.1 101 Switching Protocols が返ればOK
```

### 疎通失敗時の確認ポイント

- 社内プロキシが `Upgrade: websocket` ヘッダーを剥がしていないか
- `wss://` (TLS) であれば 443 ポートが許可されているか
- PartyKit のデプロイが完了しているか（`partykit deploy` ログ確認）

---

## リポジトリ構成

```
arigato-arena/
├── apps/
│   ├── client/          Next.js + React Three Fiber
│   └── server/          PartyKit Room（Cloudflare DO）
├── packages/
│   └── shared/          共通型・プロトコル・定数（凍結）
├── assets/              GLB・音声アセット
├── supabase/
│   └── migrations/      DB スキーマ
├── tests/               E2E・負荷テスト
└── docs/                仕様書・契約定義
```

---

## 技術スタック

| レイヤ | 技術 |
|---|---|
| クライアント | Next.js 15 / React Three Fiber / @react-three/rapier / Zustand |
| ゲームサーバー | PartyKit（Cloudflare Durable Objects）、20Hz tick |
| 永続化 | Supabase（Postgres） |
| ホスティング | Vercel（フロント）、PartyKit（サーバー）、Supabase（DB） |
| 型システム | TypeScript strict / Zod |
