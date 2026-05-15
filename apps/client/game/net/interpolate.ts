import type { PlayerSnapshot, Vec3 } from '@arigato/shared';
import type { BufferedSnapshot, InterpolationPair } from '../types';

/** 線形補間（純粋関数） */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Vec3 線形補間 */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

/**
 * 最短経路の角度補間。-π〜+π を循環する yaw 向け。
 * 戻り値は -π..+π に丸めず連続的に補間する（呼び出し側で必要なら正規化）。
 */
export function shortAngleLerp(a: number, b: number, t: number): number {
  const TWO_PI = Math.PI * 2;
  let diff = (b - a) % TWO_PI;
  if (diff > Math.PI) diff -= TWO_PI;
  else if (diff < -Math.PI) diff += TWO_PI;
  return a + diff * t;
}

/** クランプ */
export function clamp(v: number, lo: number, hi: number): number {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

/**
 * prev/next の間で時刻 t に対する進行度 [0, 1] を算出。
 * 同時刻（prev == next）の場合は 0 を返す（呼び出し側で prev を使う）。
 */
export function computeProgress(
  prevServerMs: number,
  nextServerMs: number,
  renderServerMs: number,
): number {
  const span = nextServerMs - prevServerMs;
  if (span <= 0) return 0;
  return clamp((renderServerMs - prevServerMs) / span, 0, 1);
}

/**
 * prev/next snapshot から特定 PlayerId の補間結果を取り出す純粋関数。
 *
 * - prev のみ存在 → prev をそのまま返す
 * - next のみ存在 → next をそのまま返す
 * - 両方存在     → position / yaw / pitch / velocity を線形補間
 * - どちらにも無い → null
 */
export function interpolatePlayer(
  pair: InterpolationPair,
  playerId: string,
): {
  position: Vec3;
  yaw: number;
  pitch: number;
  velocity: Vec3;
  hp: number;
  isAlive: boolean;
} | null {
  const prevP = pair.prev.players.get(playerId);
  const nextP = pair.next.players.get(playerId);

  if (!prevP && !nextP) return null;
  if (prevP && !nextP) return toPlayerView(prevP);
  if (!prevP && nextP) return toPlayerView(nextP);
  // 両方存在
  const a = prevP!;
  const b = nextP!;
  const t = pair.t;
  return {
    position: lerpVec3(a.position, b.position, t),
    yaw: shortAngleLerp(a.yaw, b.yaw, t),
    pitch: lerp(a.pitch, b.pitch, t),
    velocity: lerpVec3(a.velocity, b.velocity, t),
    // 戦闘状態は補間しない（次状態を採用）
    hp: b.hp,
    isAlive: b.isAlive,
  };
}

function toPlayerView(p: PlayerSnapshot): {
  position: Vec3;
  yaw: number;
  pitch: number;
  velocity: Vec3;
  hp: number;
  isAlive: boolean;
} {
  return {
    position: p.position,
    yaw: p.yaw,
    pitch: p.pitch,
    velocity: p.velocity,
    hp: p.hp,
    isAlive: p.isAlive,
  };
}

/** バッファペア + 進行度を構築するヘルパ（テスト用にも公開） */
export function makePair(
  prev: BufferedSnapshot,
  next: BufferedSnapshot,
  renderServerMs: number,
): InterpolationPair {
  return {
    prev,
    next,
    t: computeProgress(prev.serverTimeMs, next.serverTimeMs, renderServerMs),
  };
}
