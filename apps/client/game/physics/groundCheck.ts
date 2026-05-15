import type { Vector3 } from 'three';

/**
 * 接地判定の入力パラメータ。
 *
 * Rapier の World.castRay 等を渡せるように依存注入する。
 * 実体は LocalPlayerController で `useRapier()` から取得した world を渡す。
 */
export interface GroundCastDeps {
  /**
   * (origin, direction, maxToi) → 衝突までの距離 ratio（無ければ null）。
   * 自分自身のカプセル collider を除外する責務は呼び出し側が持つ。
   */
  castRay: (origin: Vector3, direction: Vector3, maxToi: number) => number | null;
}

/**
 * 接地判定。
 *
 * カプセル底（中心 - halfHeight - radius - skin）から下方向にレイを飛ばし、
 * 衝突があれば true を返す純粋ロジック寄せ。
 */
export function checkGrounded(
  centerY: number,
  capsuleHalfHeight: number,
  capsuleRadius: number,
  rayLength: number,
  centerXZ: { x: number; z: number },
  deps: GroundCastDeps,
  three: { Vector3Ctor: new () => Vector3 },
): boolean {
  const bottomY = centerY - capsuleHalfHeight - capsuleRadius;
  const origin = new three.Vector3Ctor();
  origin.set(centerXZ.x, bottomY + 0.01, centerXZ.z);
  const direction = new three.Vector3Ctor();
  direction.set(0, -1, 0);
  const hit = deps.castRay(origin, direction, rayLength);
  return hit !== null;
}
