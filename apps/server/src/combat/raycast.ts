import type { Vec3 } from '@arigato/shared';

/**
 * レイ vs 球の交差判定（純粋関数）。
 *
 * - レイ: origin + t * direction （direction は正規化済み前提）
 * - 球: center, radius
 * - 戻り値:
 *    - hit=false なら未交差
 *    - hit=true なら最近接交差点までの距離 t（>=0）と交差点
 *
 * 数学:
 *   d = origin - center
 *   |d + t*dir|^2 = r^2
 *   t^2 + 2(d·dir) t + (|d|^2 - r^2) = 0
 *   判別式 = (d·dir)^2 - (|d|^2 - r^2)
 *
 * t < 0 は背面ヒットなので除外（プレイヤーが球の内側にいる場合は近い側の正の t を採用）。
 */
export interface RaySphereHit {
  /** 交差したか */
  hit: boolean;
  /** origin からの距離（hit=true のときのみ意味を持つ） */
  t: number;
  /** 交差点座標（hit=true のときのみ意味を持つ） */
  point: Vec3;
}

const NO_HIT: RaySphereHit = {
  hit: false,
  t: Infinity,
  point: { x: 0, y: 0, z: 0 },
};

/**
 * レイ vs 球の交差判定。
 *
 * @param origin     レイの始点
 * @param direction  レイ方向（正規化済み）
 * @param center     球の中心
 * @param radius     球の半径
 * @param maxT       許容する最大距離（これを超える t は不採用）
 */
export function intersectRaySphere(
  origin: Vec3,
  direction: Vec3,
  center: Vec3,
  radius: number,
  maxT: number,
): RaySphereHit {
  const dx = origin.x - center.x;
  const dy = origin.y - center.y;
  const dz = origin.z - center.z;

  const b = dx * direction.x + dy * direction.y + dz * direction.z;
  const c = dx * dx + dy * dy + dz * dz - radius * radius;

  // 球の外側 (c > 0) かつ後ろ向き (b > 0) なら絶対に当たらない
  if (c > 0 && b > 0) return NO_HIT;

  const disc = b * b - c;
  if (disc < 0) return NO_HIT;

  const sqrtDisc = Math.sqrt(disc);
  // 近い解
  let t = -b - sqrtDisc;
  if (t < 0) {
    // 球の内側にいる場合は遠い解を採用
    t = -b + sqrtDisc;
  }
  if (t < 0 || t > maxT) return NO_HIT;

  return {
    hit: true,
    t,
    point: {
      x: origin.x + direction.x * t,
      y: origin.y + direction.y * t,
      z: origin.z + direction.z * t,
    },
  };
}

/** ベクトル長 */
export function vec3Length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

/** 正規化（長さ 0 のときは {0,0,0} 維持） */
export function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * yaw/pitch から方向ベクトルを作る（Three.js 慣例: yaw=0/pitch=0 のとき -Z 向き）。
 *
 *   dir = (-sin(yaw)*cos(pitch), sin(pitch), -cos(yaw)*cos(pitch))
 *
 * これは movement.ts の forward = (-sin(yaw), 0, -cos(yaw)) と整合する。
 */
export function sphericalToDirection(yaw: number, pitch: number): Vec3 {
  const cosP = Math.cos(pitch);
  return {
    x: -Math.sin(yaw) * cosP,
    y: Math.sin(pitch),
    z: -Math.cos(yaw) * cosP,
  };
}
