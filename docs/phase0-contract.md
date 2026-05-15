# Phase 0: 契約定義書

**目的**: 全subagentが並列着手するための「動かない約束事」を確定する
**配置**: `packages/shared/` として全agentが参照
**変更ポリシー**: Day1午前以降は原則凍結。変更時はIntegrator Agent経由で全agent通知

---

## 1. モノレポ構成

```
arigato-arena/
├── packages/
│   └── shared/              # ★全agentが参照する契約
│       ├── types.ts         # 型定義
│       ├── protocol.ts      # メッセージプロトコル
│       ├── constants.ts     # tick・武器・マップ定数
│       ├── schema.ts        # Zodスキーマ（実行時検証）
│       └── package.json
├── apps/
│   ├── client/              # Renderer Agent + Lobby Agent
│   │   ├── app/             # Next.js App Router
│   │   ├── game/            # R3F + Rapier
│   │   └── lib/             # PartyKit client SDK wrapper
│   └── server/              # Server Agent
│       ├── party/           # PartyKit Room実装
│       └── lib/             # tick loop, hit detection
├── assets/                  # Asset Agent
│   ├── characters/          # 9人分のGLB
│   ├── maps/                # マップGLB
│   └── audio/               # SE/BGM
├── supabase/                # DB migration
│   └── migrations/
├── tests/                   # Integrator Agent
│   └── e2e/                 # Playwright + bot対戦
├── docs/
│   ├── AGENTS.md            # subagent指示書
│   └── requirements.md
├── pnpm-workspace.yaml
└── package.json
```

**パッケージマネージャ**: pnpm workspace
**TypeScript**: strict mode、`@arigato/shared`で全agentが参照

---

## 2. 共有型定義 (`packages/shared/types.ts`)

### 2.1 基本型

```typescript
// ============ 基本型 ============

/** プレイヤー一意ID（PartyKitセッション単位） */
export type PlayerId = string;

/** ルームコード（6桁英数大文字） */
export type RoomCode = string;

/** チーム識別 */
export type Team = 'red' | 'blue';

/** 武器種別 */
export type WeaponType = 'ar' | 'sg' | 'smg';

/** キャラクター識別（メンバー9種） */
export type CharacterId =
  | 'k2' | 'hyouga' | 'shuto' | 'daichi' | 'katsuya'
  | 'tsuchiga' | 'hide' | 'yugo' | 'iru';

/** 3次元ベクトル（位置・速度・方向） */
export interface Vec3 {
  x: number;
  y: number;  // Y-up
  z: number;
}

/** クォータニオン（回転） */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

// ============ プレイヤー状態 ============

/** 試合中のプレイヤー状態（サーバー権威） */
export interface PlayerState {
  id: PlayerId;
  name: string;              // 表示名（最大16文字）
  characterId: CharacterId;
  team: Team;

  // 物理状態
  position: Vec3;
  velocity: Vec3;
  yaw: number;               // 水平回転 [-π, π]
  pitch: number;             // 垂直回転 [-π/2, π/2]

  // 戦闘状態
  hp: number;                // 0-100
  isAlive: boolean;
  isInvincible: boolean;     // リスポーン直後の無敵
  invincibleUntilMs: number; // tick基準ミリ秒

  // 武器
  currentWeapon: WeaponType;
  weaponState: Record<WeaponType, WeaponInstanceState>;

  // 入力フラグ（直近tickでの状態）
  isSprinting: boolean;
  isReloading: boolean;
  reloadEndMs: number;

  // 統計
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;

  // 切断検知
  lastInputTick: number;
}

/** 武器インスタンスの状態 */
export interface WeaponInstanceState {
  ammoInMag: number;
  nextFireMs: number;        // 次に撃てるtick基準ミリ秒
}

// ============ 弾道・ヒット ============

/**
 * 射撃イベント（hitscan方式：弾は瞬時に飛ぶ）
 * 飛翔体は使わずレイキャストで判定
 */
export interface ShotEvent {
  id: string;                // UUID
  shooterId: PlayerId;
  weapon: WeaponType;
  origin: Vec3;              // 銃口位置
  direction: Vec3;           // 正規化済み方向ベクトル
  tickMs: number;
}

/** ヒット結果（サーバー側で算出、クライアントにbroadcast） */
export interface HitResult {
  shotId: string;
  shooterId: PlayerId;
  victimId: PlayerId | null; // null = 壁に当たった
  hitPoint: Vec3;
  bodyPart: 'head' | 'body' | 'leg' | 'none';
  damage: number;
  isKill: boolean;
  isHeadshot: boolean;
}

// ============ ルーム・試合 ============

/** ルームのライフサイクル状態 */
export type RoomPhase =
  | 'lobby'        // 参加者待機・キャラ選択・チーム振り分け
  | 'countdown'    // 試合開始3秒前カウントダウン
  | 'playing'      // 試合中
  | 'finished';    // 試合終了・結果表示

/** ルーム全体の状態（サーバー権威） */
export interface RoomState {
  code: RoomCode;
  hostId: PlayerId;
  phase: RoomPhase;

  // 参加者（最大10）
  players: Record<PlayerId, PlayerState>;

  // 試合進行
  matchStartMs: number;      // playingに遷移したtickMs
  matchDurationMs: number;   // 3分=180000
  serverTick: number;        // 現在tick番号

  // スコア
  teamKills: Record<Team, number>;

  // 試合終了時の集計
  finalResult: MatchResult | null;
}

/** 試合結果（finishedフェーズで確定） */
export interface MatchResult {
  winnerTeam: Team | 'draw';
  teamKills: Record<Team, number>;
  mvpPlayerId: PlayerId;
  playerStats: PlayerMatchStat[];
}

/** プレイヤー単位の試合統計（Supabase保存対象） */
export interface PlayerMatchStat {
  playerId: PlayerId;
  name: string;
  characterId: CharacterId;
  team: Team;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  damageDealt: number;
}
```

### 2.2 入力型（クライアント→サーバー）

```typescript
/** クライアントから送る毎tick入力（20Hz） */
export interface PlayerInput {
  tick: number;              // クライアントtick番号
  // 移動入力（-1/0/1）
  moveX: number;             // A=-1, D=+1
  moveZ: number;             // W=+1, S=-1
  // 視点（差分でなく絶対値）
  yaw: number;
  pitch: number;
  // アクションフラグ
  sprint: boolean;
  jump: boolean;             // 立ち上がりエッジで判定
  fire: boolean;             // 押下中
  reload: boolean;           // 立ち上がりエッジ
  weaponSwitch: WeaponType | null;
}
```

---

## 3. メッセージプロトコル (`packages/shared/protocol.ts`)

WebSocketで流すメッセージの型を定義。全てJSON、`type`でdiscriminate。

### 3.1 Client → Server

```typescript
export type ClientMessage =
  | ClientJoinRoom
  | ClientSelectCharacter
  | ClientReadyToggle
  | ClientHostShuffleTeams
  | ClientHostStartMatch
  | ClientInput
  | ClientShoot;

/** ルーム参加 */
export interface ClientJoinRoom {
  type: 'join';
  name: string;
  asHost: boolean;           // ルーム作成者か参加者か
}

/** キャラクター選択 */
export interface ClientSelectCharacter {
  type: 'select_character';
  characterId: CharacterId;
}

/** 準備完了トグル */
export interface ClientReadyToggle {
  type: 'ready_toggle';
  ready: boolean;
}

/** ホストのみ：チームシャッフル */
export interface ClientHostShuffleTeams {
  type: 'host_shuffle_teams';
  // 手動指定する場合
  assignments?: Record<PlayerId, Team>;
}

/** ホストのみ：試合開始 */
export interface ClientHostStartMatch {
  type: 'host_start_match';
}

/** 入力（試合中、20Hzで送信） */
export interface ClientInput {
  type: 'input';
  input: PlayerInput;
}

/** 発砲（fire押下時、入力とは別チャネルで送る） */
export interface ClientShoot {
  type: 'shoot';
  shotId: string;
  origin: Vec3;
  direction: Vec3;
  clientTickMs: number;      // ラグ補正の検討余地（MVPでは未使用）
}
```

### 3.2 Server → Client

```typescript
export type ServerMessage =
  | ServerWelcome
  | ServerRoomSnapshot
  | ServerCountdown
  | ServerSnapshot
  | ServerHitEvent
  | ServerKillFeed
  | ServerMatchEnd
  | ServerError;

/** 接続直後 */
export interface ServerWelcome {
  type: 'welcome';
  yourPlayerId: PlayerId;
  roomCode: RoomCode;
}

/**
 * ロビーフェーズ用：ルーム全体スナップショット
 * lobby/countdown/finishedで送る
 */
export interface ServerRoomSnapshot {
  type: 'room_snapshot';
  state: RoomState;
}

/** カウントダウン (3,2,1) */
export interface ServerCountdown {
  type: 'countdown';
  secondsLeft: number;
}

/**
 * 試合中スナップショット（20Hz broadcast）
 * 差分なし、フルステート送信（10人規模ならOK）
 */
export interface ServerSnapshot {
  type: 'snapshot';
  tick: number;
  serverTimeMs: number;
  players: PlayerSnapshot[];
  matchTimeRemainingMs: number;
  teamKills: Record<Team, number>;
}

/** snapshotで送る軽量プレイヤー情報 */
export interface PlayerSnapshot {
  id: PlayerId;
  position: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  isAlive: boolean;
  currentWeapon: WeaponType;
  isReloading: boolean;
  velocity: Vec3;            // クライアント補間に使用
}

/** ヒット発生時：エフェクト用に個別通知 */
export interface ServerHitEvent {
  type: 'hit';
  result: HitResult;
}

/** キルフィード表示用 */
export interface ServerKillFeed {
  type: 'kill_feed';
  killerId: PlayerId;
  victimId: PlayerId;
  weapon: WeaponType;
  isHeadshot: boolean;
  tickMs: number;
}

/** 試合終了通知 */
export interface ServerMatchEnd {
  type: 'match_end';
  result: MatchResult;
}

/** エラー通知 */
export interface ServerError {
  type: 'error';
  code: 'room_full' | 'invalid_action' | 'not_host' | 'name_taken';
  message: string;
}
```

### 3.3 通信方針

| 項目 | 値 |
|---|---|
| エンコード | JSON（MVPはMessagePack見送り） |
| 圧縮 | なし（10人規模で十分） |
| 入力送信レート | クライアント側20Hz |
| snapshot送信レート | サーバー側20Hz |
| 切断検知 | 5秒間input未受信でタイムアウト |
| 再接続 | MVP対象外（切断=試合離脱） |

---

## 4. tick・同期仕様 (`packages/shared/constants.ts`)

### 4.1 タイミング定数

```typescript
export const TICK_RATE_HZ = 20;
export const TICK_INTERVAL_MS = 50;        // 1000 / 20

export const SNAPSHOT_RATE_HZ = 20;        // 毎tick送信
export const CLIENT_INTERPOLATION_MS = 100; // 補間バッファ

export const PLAYER_TIMEOUT_MS = 5000;     // 入力途絶でタイムアウト

export const COUNTDOWN_SECONDS = 3;
export const MATCH_DURATION_MS = 180_000;  // 3分
export const RESPAWN_DELAY_MS = 3_000;
export const SPAWN_INVINCIBLE_MS = 2_000;
```

### 4.2 同期モデル

**サーバー権威 + クライアント補間（予測なし）**

```
[クライアント]
  毎フレーム入力収集
  20Hzで input をサーバー送信
  サーバーsnapshotを100ms遅延バッファに蓄積
  描画時刻は「サーバー時刻 - 100ms」で過去スナップショット間を線形補間
  自分のキャラもサーバー応答ベースで描画（rubber bandの可能性あり）

[サーバー]
  20Hzでtick実行
    1. 全クライアントから受け取った最新inputをapply
    2. 物理シミュレーション（移動・重力・衝突）
    3. 発砲メッセージを処理（hitscanレイキャスト）
    4. HP/キル/リスポーン更新
    5. snapshot broadcast
```

**MVP簡略化方針**
- クライアント側予測（client prediction）は実装しない
- ラグ補正（lag compensation）も実装しない
- 社内LAN前提でping <20ms想定、体感問題なしと判断
- pingが大きい参加者には「Vercel近接リージョン経由」を案内

---

## 5. マップ座標系・スポーン定義

### 5.1 座標系

- Y-up（Three.js標準）
- 1unit = 1m
- マップ原点は中央
- マップ範囲: X[-30, +30], Z[-20, +20] = 60m × 40m

### 5.2 マップレイアウト

```
                  Z軸
                   ↑
        Blue陣地 (Z: +15〜+20)
   ┌───────────────────────────────┐
   │ 上レーン (Y=3、高所)          │
   │─────────────────────────────  │
   │ 中レーン (Y=0、開放)          │ → X軸
   │─────────────────────────────  │
   │ 下レーン (Y=0、屋内通路)      │
   └───────────────────────────────┘
        Red陣地 (Z: -20〜-15)
```

### 5.3 スポーン地点（座標）

```typescript
export const SPAWN_POINTS: Record<Team, Vec3[]> = {
  red: [
    { x: -20, y: 0, z: -18 },
    { x:   0, y: 0, z: -18 },
    { x: +20, y: 0, z: -18 },
    { x: -10, y: 3, z: -16 },  // 上レーン側
    { x: +10, y: 3, z: -16 },
  ],
  blue: [
    { x: -20, y: 0, z: +18 },
    { x:   0, y: 0, z: +18 },
    { x: +20, y: 0, z: +18 },
    { x: -10, y: 3, z: +16 },
    { x: +10, y: 3, z: +16 },
  ],
};
```

死亡時は自チームのスポーン地点からランダム選択。

---

## 6. 武器パラメータ初期値

```typescript
export interface WeaponConfig {
  // 射撃
  damage: number;              // 胴ダメージ基準
  pellets: number;             // SG用、通常1
  fireIntervalMs: number;      // 連射間隔
  spread: number;              // ラジアン、SG用
  // マガジン
  magSize: number;
  reloadTimeMs: number;
  // 射程・減衰
  maxRange: number;            // 有効射程（m）
  rangeDropoffStart: number;   // ダメージ減衰開始距離
  rangeDropoffMin: number;     // 最小ダメージ倍率
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  ar: {
    damage: 25,
    pellets: 1,
    fireIntervalMs: 100,       // 600rpm
    spread: 0.01,
    magSize: 30,
    reloadTimeMs: 2200,
    maxRange: 60,
    rangeDropoffStart: 25,
    rangeDropoffMin: 0.7,
  },
  sg: {
    damage: 15,                // ペレット1発あたり
    pellets: 8,
    fireIntervalMs: 700,       // ~85rpm
    spread: 0.12,
    magSize: 6,
    reloadTimeMs: 2800,
    maxRange: 20,
    rangeDropoffStart: 6,
    rangeDropoffMin: 0.3,
  },
  smg: {
    damage: 18,
    pellets: 1,
    fireIntervalMs: 67,        // ~900rpm
    spread: 0.03,
    magSize: 25,
    reloadTimeMs: 1800,
    maxRange: 40,
    rangeDropoffStart: 15,
    rangeDropoffMin: 0.5,
  },
};

export const BODY_DAMAGE_MULTIPLIER = {
  head: 2.0,
  body: 1.0,
  leg: 0.7,
} as const;
```

**バランス調整のメモ**
- ARはヘッド2発キル、胴4発キル想定
- SGは近距離フル命中で即死、距離あると弱い
- SMGは胴6発キルだが連射で安定

Day2午後のテストで調整。`constants.ts`の値だけ変更すれば反映される設計。

---

## 7. プレイヤー物理・移動定数

```typescript
export const PLAYER_PHYSICS = {
  walkSpeed: 5.0,            // m/s
  sprintSpeed: 8.0,          // m/s
  jumpVelocity: 6.0,         // m/s
  gravity: -20.0,            // m/s²
  airControlFactor: 0.4,     // 空中での加速減衰
  // ヒットボックス
  capsuleRadius: 0.4,
  capsuleHeight: 1.8,
  headHeight: 1.65,          // 立位の頭中心
  headRadius: 0.15,
  bodyHeight: 1.0,           // 胴体中心
  bodyRadius: 0.4,
  legHeight: 0.4,            // 脚中心
} as const;
```

---

## 8. Zodスキーマ（実行時検証）

`packages/shared/schema.ts` で全Client→Serverメッセージを実行時検証。Server側で必ず通す（不正値防止）。

```typescript
import { z } from 'zod';

export const Vec3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

export const PlayerInputSchema = z.object({
  tick: z.number().int().nonnegative(),
  moveX: z.number().min(-1).max(1),
  moveZ: z.number().min(-1).max(1),
  yaw: z.number().min(-Math.PI).max(Math.PI),
  pitch: z.number().min(-Math.PI / 2).max(Math.PI / 2),
  sprint: z.boolean(),
  jump: z.boolean(),
  fire: z.boolean(),
  reload: z.boolean(),
  weaponSwitch: z.enum(['ar', 'sg', 'smg']).nullable(),
});

// ... 各ClientMessageに対応するスキーマを定義
```

サーバー側で：
```typescript
const parsed = ClientMessageSchema.safeParse(rawMessage);
if (!parsed.success) {
  // エラー応答 or 無視
  return;
}
```

---

## 9. Supabase スキーマ

```sql
-- 試合記録
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  winner_team TEXT NOT NULL CHECK (winner_team IN ('red', 'blue', 'draw')),
  team_kills_red INT NOT NULL,
  team_kills_blue INT NOT NULL,
  mvp_player_id TEXT
);

-- プレイヤー単位の試合統計
CREATE TABLE player_match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,    -- PartyKitセッションID
  player_name TEXT NOT NULL,
  character_id TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('red', 'blue')),
  kills INT NOT NULL DEFAULT 0,
  deaths INT NOT NULL DEFAULT 0,
  assists INT NOT NULL DEFAULT 0,
  headshots INT NOT NULL DEFAULT 0,
  damage_dealt INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_pms_player_name ON player_match_stats(player_name);
CREATE INDEX idx_pms_match_id ON player_match_stats(match_id);

-- RLSは無効（社内ツール想定、PartyKitサーバーからservice_roleで書き込み）
```

書き込みは**PartyKitサーバーから試合終了時にのみ実行**。クライアントから直接Supabaseに書かせない。

---

## 10. 凍結項目

以下はDay1午前以降、原則変更しない：

- メッセージプロトコルの型構造（フィールド追加はOK、リネーム/削除はNG）
- 座標系（Y-up、1unit=1m）
- tickレート（20Hz）
- スポーン地点座標
- マップ範囲

変更が必要な場合は**Integrator Agentに通知 → 全agentブランチでpull → 再ビルド**。

---

## 11. 次のステップ

この契約定義を起点に、各subagentが並列着手できる状態になりました。

次は `AGENTS.md`（各subagentの指示書）を作成し、Claude Code起動時に渡せる状態を作ります。
