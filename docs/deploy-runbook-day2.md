# ArigatoArena デプロイ ランブック（Day2 披露日前）

実行順序通りに進めること。コマンドは PowerShell または bash いずれでも可。

---

## ユーザーが手動で実行するコマンド

### 1. PartyKit

- [ ] PartyKit アカウント新規作成: https://www.partykit.io （サイトアップ → GitHub 連携で OK）

- [ ] ログイン
  ```bash
  pnpm dlx partykit login
  ```
  ブラウザが開き OAuth 認証が完了すれば OK。

- [ ] Supabase URL を Secret として登録
  ```bash
  pnpm --filter @arigato/server exec partykit env add SUPABASE_URL
  # プロンプトに Supabase プロジェクト URL を貼り付け（例: https://xxxxxxxxxxxx.supabase.co）
  ```

- [ ] Supabase Service Role Key を Secret として登録
  ```bash
  pnpm --filter @arigato/server exec partykit env add SUPABASE_SERVICE_ROLE_KEY
  # プロンプトに Service Role Key を貼り付け（Supabase ダッシュボード → Project Settings → API）
  ```

- [ ] Secret が登録されたか確認
  ```bash
  pnpm --filter @arigato/server exec partykit env ls
  # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が表示されれば OK
  ```

- [ ] デプロイ実行
  ```bash
  pnpm deploy:server
  # または
  pnpm --filter @arigato/server deploy
  ```
  出力例:
  ```
  Deployed arigato-arena to https://arigato-arena.<account>.partykit.dev
  ```

- [ ] デプロイ後にホスト名をメモ: `arigato-arena.<account>.partykit.dev`

---

### 2. Supabase

- [ ] Supabase ダッシュボードにログイン: https://app.supabase.com

- [ ] 新規プロジェクト作成（既存プロジェクトを使う場合はスキップ）
  - Organization 選択 → New Project
  - Name: `arigato-arena`（任意）
  - Database Password を設定してメモ
  - Region: 社内LAN に近いリージョンを選択（Northeast Asia 推奨）

- [ ] SQL Editor でスキーマ投入
  - ダッシュボード → SQL Editor → New query
  - `supabase/migrations/0001_init.sql` の内容を全コピーして貼り付け → Run
  - `matches` テーブルと `player_match_stats` テーブルが作成されれば OK

- [ ] API キーを確認・コピー
  - ダッシュボード → Project Settings → API
  - `Project URL` → PartyKit の SUPABASE_URL として使用
  - `service_role` キー → PartyKit の SUPABASE_SERVICE_ROLE_KEY として使用
  - `anon` キー → Vercel の NEXT_PUBLIC_SUPABASE_ANON_KEY として使用（現状不要）

---

### 3. Vercel

- [ ] Vercel ダッシュボードにログイン: https://vercel.com

- [ ] Import Project
  - New Project → GitHub リポジトリを選択
  - Configure Project:
    - **Framework Preset**: Next.js
    - **Root Directory**: `apps/client`（重要: `apps/client` と入力）
    - **Install Command**: `cd ../.. && pnpm install --frozen-lockfile`
    - **Build Command**: `cd ../.. && pnpm --filter @arigato/client build`
    - **Output Directory**: `.next`（デフォルトのまま）

- [ ] Environment Variables を追加
  - `NEXT_PUBLIC_PARTYKIT_HOST` = `arigato-arena.<account>.partykit.dev`
    （手順1でメモしたホスト名。`wss://` は不要、ホストのみ）

- [ ] Deploy ボタンを押してデプロイ
  - ビルドログを確認し、エラーがないことを確かめる
  - デプロイ後 URL（例: `https://arigato-arena.vercel.app`）をメモ

---

### 4. 社内NW WebSocket 疎通チェック

- [ ] Chrome で本番 URL を開く（Vercel のデプロイ URL）

- [ ] DevTools (F12) → Network → WS フィルタ で接続確認
  - `arigato-arena.<account>.partykit.dev` へのコネクションが `101 Switching Protocols` になること

- [ ] curl で直接確認（PowerShell は非対応のため bash / Git Bash で実行）
  ```bash
  curl -i -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "https://arigato-arena.<your-account>.partykit.dev/parties/main/TESTRM"
  # 期待レスポンス: HTTP/1.1 101 Switching Protocols
  ```

- [ ] 疎通 OK → 披露日の参加者に URL を共有

---

### 5. 最終確認チェックリスト

- [ ] `pnpm typecheck` がワークスペース全体でグリーン
- [ ] `pnpm build` が成功
- [ ] `pnpm test` がグリーン
- [ ] Vercel 本番 URL でロビー画面が表示される
- [ ] ルーム作成 → 別タブで参加 → 試合開始 が通る
- [ ] 試合終了後、Supabase `matches` テーブルにレコードが挿入される

---

## トラブルシューティング

### Vercel ビルドが失敗するパターン

| 症状 | 原因 | 対処 |
|---|---|---|
| `pnpm: command not found` | Vercel がデフォルト npm を使っている | Root Directory と Install Command を再確認 |
| `Cannot find module '@arigato/shared'` | workspace パスが通っていない | Install Command に `cd ../..` が含まれているか確認 |
| `NEXT_PUBLIC_PARTYKIT_HOST` が undefined | Vercel 環境変数未設定 | ダッシュボードで追加後に Redeploy |
| GLB ファイルでビルドエラー | next.config.mjs の webpack asset/resource 設定が必要 | `apps/client/next.config.mjs` を確認 |

### PartyKit Secret 誤設定パターン

| 症状 | 原因 | 対処 |
|---|---|---|
| 試合終了後 DB に保存されない | SUPABASE_SERVICE_ROLE_KEY が間違い / 未設定 | `partykit env ls` で確認、再登録して `partykit deploy` |
| `Invalid JWT` エラー | anon key と service_role key を混同 | Supabase Project Settings → API で正しいキーを確認 |
| 接続時 503 | デプロイが失敗している | `partykit deploy` のログを確認 |

### WebSocket 疎通失敗パターン

| 症状 | 原因 | 対処 |
|---|---|---|
| `101` が返らず `200` / `400` | プロキシが Upgrade ヘッダーを除去 | NW 管理者に WebSocket 許可を依頼 |
| `ERR_SSL_PROTOCOL_ERROR` | 社内 MITSSL 証明書干渉 | 証明書インストール or HTTP 社内環境で確認 |
| 接続後すぐ切断 | 社内プロキシのタイムアウト（60秒等） | PartyKit は ping/pong あり、プロキシのタイムアウト延長を検討 |
