import type { PlayerSnapshot, Vec3, WeaponType } from '@arigato/shared';

/**
 * キーボード入力状態（毎フレーム ref 更新、React state には乗せない）。
 * 立ち上がりエッジ判定は別途 useKeyboard 内で扱う。
 */
export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  fire: boolean;
  reload: boolean;
  /** 押されたら一度だけ true になり、消費後に false に戻すフラグ */
  jumpEdge: boolean;
  reloadEdge: boolean;
  weaponSwitch: WeaponType | null;
}

/** マウスルックの累積角度（pointer lock 中だけ更新） */
export interface LookRef {
  yaw: number;
  pitch: number;
}

/**
 * 補間描画用の中間結果。
 * Three.js Object3D を直接 mutate するためのフレーム単位の値。
 */
export interface InterpolatedFrame {
  position: Vec3;
  yaw: number;
  pitch: number;
  velocity: Vec3;
}

/** 描画対象の他プレイヤーレンダリングメタデータ */
export interface RemotePlayerVisual {
  id: string;
  name?: string;
  team?: 'red' | 'blue';
  characterId?: string;
}

/** スナップショットバッファに保持するエントリ */
export interface BufferedSnapshot {
  /** クライアント受信時刻（performance.now ベース ms） */
  clientReceivedAtMs: number;
  /** サーバー時刻（serverTimeMs） */
  serverTimeMs: number;
  /** PlayerSnapshot のマップ化（id でアクセス） */
  players: Map<string, PlayerSnapshot>;
}

/** 描画時に補間ターゲットとなる prev/next snapshot 対 */
export interface InterpolationPair {
  prev: BufferedSnapshot;
  next: BufferedSnapshot;
  /** prev → next の正規化進行度 [0, 1] */
  t: number;
}
