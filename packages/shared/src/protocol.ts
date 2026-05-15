import type {
  CharacterId,
  HitResult,
  MatchResult,
  PlayerId,
  PlayerInput,
  RoomCode,
  RoomState,
  Team,
  Vec3,
  WeaponType,
} from './types.js';

// ============================================================================
// Client → Server
// ============================================================================

/** ルーム参加 */
export interface ClientJoinRoom {
  type: 'join';
  name: string;
  /** ルーム作成者か参加者か */
  asHost: boolean;
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
  /** 手動指定する場合 */
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
  /** ラグ補正の検討余地（MVPでは未使用） */
  clientTickMs: number;
}

export type ClientMessage =
  | ClientJoinRoom
  | ClientSelectCharacter
  | ClientReadyToggle
  | ClientHostShuffleTeams
  | ClientHostStartMatch
  | ClientInput
  | ClientShoot;

export type ClientMessageType = ClientMessage['type'];

// ============================================================================
// Server → Client
// ============================================================================

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

/** snapshot で送る軽量プレイヤー情報 */
export interface PlayerSnapshot {
  id: PlayerId;
  position: Vec3;
  yaw: number;
  pitch: number;
  hp: number;
  isAlive: boolean;
  currentWeapon: WeaponType;
  isReloading: boolean;
  /** クライアント補間に使用 */
  velocity: Vec3;
  /** 現在武器の残弾。自分の HUD 表示用（他人にも見えるが MVP では許容） */
  ammoInMag: number;
  /** 無敵中か（被弾フラッシュ・SE 抑制に使用） */
  isInvincible: boolean;
  /** リロード終了予定時刻（ms, server時間）。0 ならリロードしていない */
  reloadEndMs: number;
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

/** サーバーエラーコード */
export type ServerErrorCode =
  | 'room_full'
  | 'invalid_action'
  | 'not_host'
  | 'name_taken'
  | 'rate_limited'
  | 'invalid_message';

/** エラー通知 */
export interface ServerError {
  type: 'error';
  code: ServerErrorCode;
  message: string;
}

export type ServerMessage =
  | ServerWelcome
  | ServerRoomSnapshot
  | ServerCountdown
  | ServerSnapshot
  | ServerHitEvent
  | ServerKillFeed
  | ServerMatchEnd
  | ServerError;

export type ServerMessageType = ServerMessage['type'];
