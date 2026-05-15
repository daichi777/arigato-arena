# @arigato/client

ArigatoArena のクライアントアプリ。

## 担当エージェント

- `apps/client/app/` — **lobby agent**
- `apps/client/game/` — **renderer agent**
- `apps/client/lib/lobby/` — **lobby agent**
- `apps/client/lib/hud/` — **renderer agent**

## セットアップ

```bash
pnpm install        # ルートで実行
pnpm --filter @arigato/client dev
```

## 構成（予定）

```
apps/client/
├── app/                      ← Next.js App Router（lobby agent）
│   ├── layout.tsx
│   ├── page.tsx              ← トップ（ホスト作成 / 参加）
│   └── room/
│       └── [code]/
│           ├── page.tsx      ← 待機画面
│           ├── play/page.tsx ← 試合画面
│           └── result/page.tsx
├── game/                     ← React Three Fiber（renderer agent）
│   ├── GameView.tsx
│   ├── PlayerController.tsx
│   ├── MapScene.tsx
│   └── __dev__/
│       └── StubScene.tsx
└── lib/
    ├── lobby/                ← Zustand store / PartyKit client wrapper
    └── hud/                  ← HP/弾薬/タイマー
```

## 重要原則

- `@arigato/shared` の型を **直接 import** すること。独自定義の型を作らない。
- `apps/client/game/` と `apps/client/app/` の責務境界を遵守する。
- 詳細は `CLAUDE.md` および `docs/phase0-contract.md` を参照。
