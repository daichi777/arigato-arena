// ============================================================================
// 基本型
// ============================================================================

/** プレイヤー一意ID（PartyKitセッション単位） */
export type PlayerId = string;

/** ルームコード（6桁英数大文字） */
export type RoomCode = string;

/** チーム識別 */
export type Team = 'red' | 'blue';

/** 武器種別 */
export type WeaponType = 'ar' | 'sg' | 'smg';

/** キャラクター識別（メンバーオマージュ9種） */
export type CharacterId =
  | 'k2'
  | 'hyouga'
  | 'shuto'
  | 'daichi'
  | 'katsuya'
  | 'tsuchiga'
  | 'hide'
  | 'yugo'
  | 'iru';

/** ヒット部位 */
export type BodyPart = 'head' | 'body' | 'leg' | 'none';

/** 3次元ベクトル（位置・速度・方向） Y-up */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** クォータニオン（回転） */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

// ============================================================================
// プレイヤー状態
// ============================================================================

/** 武器インスタンスの状態 */
export interface WeaponInstanceState {
  ammoInMag: number;
  /** 次に撃てる tick 基準ミリ秒 */
  nextFireMs: number;
}

/** 試合中のプレイヤー状態（サーバー権威） */
export interface PlayerState {
  id: PlayerId;
  /** 表示名（最大16文字） */
  name: string;
  characterId: CharacterId;
  team: Team;

  // 物理状態
  position: Vec3;
  velocity: Vec3;
  /** 水平回転 [-π, π] */
  yaw: number;
  /** 垂直回転 [-π/2, π/2] */
  pitch: number;

  // 戦闘状態
  /** 0-100 */
  hp: number;
  isAlive: boolean;
  /** リスポーン直後の無敵 */
  isInvincible: boolean;
  invincibleUntilMs: number;

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
  damageDealt: number;

  // 切断検知
  lastInputTick: number;
}

// ============================================================================
// 弾道・ヒット
// ============================================================================

/**
 * 射撃イベント（hitscan方式：弾は瞬時に飛ぶ）
 * 飛翔体は使わずレイキャストで判定
 */
export interface ShotEvent {
  /** UUID */
  id: string;
  shooterId: PlayerId;
  weapon: WeaponType;
  /** 銃口位置 */
  origin: Vec3;
  /** 正規化済み方向ベクトル */
  direction: Vec3;
  tickMs: number;
}

/** ヒット結果（サーバー側で算出、クライアントにbroadcast） */
export interface HitResult {
  shotId: string;
  shooterId: PlayerId;
  /** null = 壁に当たった */
  victimId: PlayerId | null;
  hitPoint: Vec3;
  bodyPart: BodyPart;
  damage: number;
  isKill: boolean;
  isHeadshot: boolean;
}

// ============================================================================
// ルーム・試合
// ============================================================================

/** ルームのライフサイクル状態 */
export type RoomPhase =
  /** 参加者待機・キャラ選択・チーム振り分け */
  | 'lobby'
  /** 試合開始3秒前カウントダウン */
  | 'countdown'
  /** 試合中 */
  | 'playing'
  /** 試合終了・結果表示 */
  | 'finished';

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

/** 試合結果（finishedフェーズで確定） */
export interface MatchResult {
  winnerTeam: Team | 'draw';
  teamKills: Record<Team, number>;
  mvpPlayerId: PlayerId;
  playerStats: PlayerMatchStat[];
}

/** ルーム全体の状態（サーバー権威） */
export interface RoomState {
  code: RoomCode;
  hostId: PlayerId;
  phase: RoomPhase;

  /** 参加者（最大10） */
  players: Record<PlayerId, PlayerState>;

  /** playing に遷移した tickMs */
  matchStartMs: number;
  /** 3分=180000 */
  matchDurationMs: number;
  /** 現在 tick 番号 */
  serverTick: number;

  /** チーム別キル数 */
  teamKills: Record<Team, number>;

  /** 試合終了時の集計 */
  finalResult: MatchResult | null;
}

// ============================================================================
// 入力（クライアント→サーバー）
// ============================================================================

/** クライアントから送る毎tick入力（20Hz） */
export interface PlayerInput {
  /** クライアント tick 番号 */
  tick: number;
  /** A=-1, D=+1 */
  moveX: number;
  /** W=+1, S=-1 */
  moveZ: number;
  /** 視点（差分でなく絶対値） */
  yaw: number;
  pitch: number;
  // アクションフラグ
  sprint: boolean;
  /** 立ち上がりエッジで判定 */
  jump: boolean;
  /** 押下中 */
  fire: boolean;
  /** 立ち上がりエッジ */
  reload: boolean;
  weaponSwitch: WeaponType | null;
}
