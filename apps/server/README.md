# @arigato/server

ArigatoArena の権威ゲームサーバー（PartyKit / Cloudflare Durable Objects）。

## 担当エージェント

- `apps/server/party/` — **server agent**
- `apps/server/src/` — **server agent**

## セットアップ

```bash
pnpm install                              # ルートで実行
pnpm --filter @arigato/server dev         # ローカル PartyKit 起動
```

## 構成（予定）

```
apps/server/
├── partykit.json
├── party/
│   └── index.ts              ← PartyServer エントリーポイント
└── src/
    ├── room.ts               ← Room 状態管理
    ├── tick.ts               ← 20Hz tick loop
    ├── physics.ts            ← 移動・重力・衝突
    ├── hitscan.ts            ← レイキャストヒット判定
    ├── damage.ts             ← ダメージ計算
    ├── handlers/             ← ClientMessage handlers
    └── supabase.ts           ← 試合終了時の永続化
```

## 重要原則

- **サーバー権威**：クライアント値は Zod 検証してから採用
- **レート制限**：`input` は 30Hz 超で破棄、`shoot` は武器 `fireIntervalMs` 未満で破棄
- **ホスト権限**：`host_*` メッセージは `roomState.hostId` と一致確認
- 詳細は `CLAUDE.md` および `docs/phase0-contract.md` を参照

## 環境変数

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

PartyKit Secrets に登録すること。`.env` はコミットしない。
