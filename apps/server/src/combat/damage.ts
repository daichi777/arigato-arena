import {
  BODY_DAMAGE_MULTIPLIER,
  type BodyPart,
  WEAPONS,
  type WeaponType,
} from '@arigato/shared';

/**
 * 距離による減衰倍率を計算する（純粋関数）。
 *
 * - dist <= rangeDropoffStart なら 1.0
 * - dist >= maxRange なら rangeDropoffMin
 * - 間は線形補間
 *
 * maxRange を超える距離は呼び出し側でレイ採用判定に使うので、ここでは min に張り付くだけ。
 */
export function distanceMultiplier(weapon: WeaponType, dist: number): number {
  const cfg = WEAPONS[weapon];
  if (dist <= cfg.rangeDropoffStart) return 1.0;
  if (dist >= cfg.maxRange) return cfg.rangeDropoffMin;
  const span = cfg.maxRange - cfg.rangeDropoffStart;
  if (span <= 0) return cfg.rangeDropoffMin;
  const t = (dist - cfg.rangeDropoffStart) / span;
  return 1.0 + (cfg.rangeDropoffMin - 1.0) * t;
}

/**
 * 武器 × 部位 × 距離からダメージを計算する（純粋関数）。
 * 部位 'none' は 0 ダメージ。
 * 結果は四捨五入した整数を返す（HP は整数管理）。
 */
export function computeDamage(weapon: WeaponType, bodyPart: BodyPart, dist: number): number {
  if (bodyPart === 'none') return 0;
  const cfg = WEAPONS[weapon];
  const partMul = BODY_DAMAGE_MULTIPLIER[bodyPart];
  const distMul = distanceMultiplier(weapon, dist);
  const dmg = cfg.damage * partMul * distMul;
  return Math.max(0, Math.round(dmg));
}
