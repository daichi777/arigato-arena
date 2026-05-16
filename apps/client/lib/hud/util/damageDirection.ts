/**
 * 被弾方向インジケータ用の角度計算ユーティリティ。
 *
 * 純粋関数として実装（副作用なし、テスト容易）。
 */

/** 2D ベクトル（XZ 平面） */
export interface Vec2D {
  x: number;
  z: number;
}

/**
 * ワールド座標の shooter - victim ベクトルと、自分の yaw から
 * 画面上の相対角度（ラジアン）を計算する。
 *
 * - selfYaw=0 は -Z 方向（Three.js カメラ前方）
 * - 返値: 0 が前方、正が右、負が左（時計回り正）
 *
 * @param victimPos 被弾者の XZ 位置
 * @param shooterPos 攻撃者の XZ 位置
 * @param selfYaw 自分の yaw（ラジアン）
 * @returns 相対角度（ラジアン）。未定義時は null
 */
export function calcDamageAngle(
  victimPos: Vec2D,
  shooterPos: Vec2D,
  selfYaw: number,
): number | null {
  const dx = shooterPos.x - victimPos.x;
  const dz = shooterPos.z - victimPos.z;

  // ゼロ割り防止（同位置）
  if (dx === 0 && dz === 0) return null;

  // ワールド上での shooter 方向角（atan2 の基準は +X 軸 = 0、反時計周り）
  // Three.js の yaw は -Z 前方、時計周りなので:
  //   世界角 = atan2(dx, dz)（Z 前方基準の時計周り）
  const worldAngle = Math.atan2(dx, dz);

  // 自分の向き（yaw）との差分が相対角度
  // selfYaw=0 の場合、worldAngle=0（-Z 方向）が前方 = 0
  const relAngle = worldAngle - selfYaw;

  // [-π, π] に正規化
  return normalizeAngle(relAngle);
}

/**
 * 角度を [-π, π] に正規化する。
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
