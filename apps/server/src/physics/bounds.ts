import { MAP_BOUNDS, type Vec3 } from '@arigato/shared';

/**
 * マップ範囲に座標をクランプする純粋関数。
 * Y軸は地面（0）より下に行かないようにのみクランプ（天井は重力で支配）。
 * Day1午後の簡易物理: マップ外周は壁、Y=0が地面。
 */
export function clampToBounds(p: Vec3): Vec3 {
  return {
    x: Math.min(MAP_BOUNDS.maxX, Math.max(MAP_BOUNDS.minX, p.x)),
    y: Math.min(MAP_BOUNDS.maxY, Math.max(MAP_BOUNDS.minY, p.y)),
    z: Math.min(MAP_BOUNDS.maxZ, Math.max(MAP_BOUNDS.minZ, p.z)),
  };
}

/** 座標が地面以下にあるか */
export function isOnGround(p: Vec3, velocityY: number): boolean {
  // 地面 + 速度が下向き（または0）なら接地と判定。
  return p.y <= MAP_BOUNDS.minY + 1e-4 && velocityY <= 0;
}
