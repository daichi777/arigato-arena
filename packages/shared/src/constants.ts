import type { BodyPart, Team, Vec3, WeaponType } from './types.js';

// ============================================================================
// タイミング・同期
// ============================================================================

export const TICK_RATE_HZ = 20;
export const TICK_INTERVAL_MS = 50; // 1000 / 20

export const SNAPSHOT_RATE_HZ = 20; // 毎tick送信
export const CLIENT_INTERPOLATION_MS = 100; // 補間バッファ

export const PLAYER_TIMEOUT_MS = 5_000; // 入力途絶でタイムアウト
export const INPUT_RATE_LIMIT_HZ = 30; // これを超える受信頻度は破棄

export const COUNTDOWN_SECONDS = 3;
export const MATCH_DURATION_MS = 180_000; // 3分
export const RESPAWN_DELAY_MS = 3_000;
export const SPAWN_INVINCIBLE_MS = 2_000;

export const ROOM_MAX_PLAYERS = 10;
export const ROOM_TEAM_SIZE = 5;
export const NAME_MAX_LENGTH = 16;
export const ROOM_CODE_LENGTH = 6;

// ============================================================================
// マップ
// ============================================================================

/** マップ範囲（X[-30,+30], Z[-20,+20] = 60m × 40m） */
export const MAP_BOUNDS = {
  minX: -30,
  maxX: 30,
  minY: 0,
  maxY: 20,
  minZ: -20,
  maxZ: 20,
} as const;

/** スポーン地点（チーム別） */
export const SPAWN_POINTS: Record<Team, readonly Vec3[]> = {
  red: [
    { x: -20, y: 0, z: -18 },
    { x: 0, y: 0, z: -18 },
    { x: 20, y: 0, z: -18 },
    { x: -10, y: 3, z: -16 }, // 上レーン側
    { x: 10, y: 3, z: -16 },
  ],
  blue: [
    { x: -20, y: 0, z: 18 },
    { x: 0, y: 0, z: 18 },
    { x: 20, y: 0, z: 18 },
    { x: -10, y: 3, z: 16 },
    { x: 10, y: 3, z: 16 },
  ],
} as const;

// ============================================================================
// 物理・移動
// ============================================================================

export const PLAYER_PHYSICS = {
  walkSpeed: 5.0, // m/s
  sprintSpeed: 8.0, // m/s
  jumpVelocity: 6.0, // m/s
  gravity: -20.0, // m/s²
  airControlFactor: 0.4, // 空中での加速減衰
  // ヒットボックス（立ち姿勢固定）
  capsuleRadius: 0.4,
  capsuleHeight: 1.8,
  /** 立位の頭中心 */
  headHeight: 1.65,
  headRadius: 0.15,
  /** 胴体中心 */
  bodyHeight: 1.0,
  bodyRadius: 0.4,
  /** 脚中心 */
  legHeight: 0.4,
} as const;

// ============================================================================
// 武器
// ============================================================================

export interface WeaponConfig {
  /** 胴ダメージ基準 */
  damage: number;
  /** SG用、通常1 */
  pellets: number;
  /** 連射間隔（ms） */
  fireIntervalMs: number;
  /** ラジアン、SG用 */
  spread: number;
  // マガジン
  magSize: number;
  reloadTimeMs: number;
  // 射程・減衰
  /** 有効射程（m） */
  maxRange: number;
  /** ダメージ減衰開始距離 */
  rangeDropoffStart: number;
  /** 最小ダメージ倍率 */
  rangeDropoffMin: number;
}

export const WEAPONS: Record<WeaponType, WeaponConfig> = {
  ar: {
    damage: 25,
    pellets: 1,
    fireIntervalMs: 100, // 600rpm
    spread: 0.01,
    magSize: 30,
    reloadTimeMs: 2200,
    maxRange: 60,
    rangeDropoffStart: 25,
    rangeDropoffMin: 0.7,
  },
  sg: {
    damage: 15, // ペレット1発あたり
    pellets: 8,
    fireIntervalMs: 700, // ~85rpm
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
    fireIntervalMs: 67, // ~900rpm
    spread: 0.03,
    magSize: 25,
    reloadTimeMs: 1800,
    maxRange: 40,
    rangeDropoffStart: 15,
    rangeDropoffMin: 0.5,
  },
};

/** 武器切替クールダウン（バースト切替防止） */
export const WEAPON_SWITCH_COOLDOWN_MS = 100;

export const BODY_DAMAGE_MULTIPLIER: Record<Exclude<BodyPart, 'none'>, number> = {
  head: 2.0,
  body: 1.0,
  leg: 0.7,
} as const;

// ============================================================================
// プレイヤー初期値
// ============================================================================

export const PLAYER_INITIAL_HP = 100;
export const PLAYER_INITIAL_WEAPON: WeaponType = 'ar';
