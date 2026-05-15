import { PLAYER_PHYSICS } from '@arigato/shared';
import type { Vec3 } from '@arigato/shared';

/**
 * クライアント側のキャラ移動計算（純粋関数）。
 *
 * - 本来サーバー権威なので、ここで計算した値はクライアント描画ヒントに過ぎない。
 * - ローカル即時操作感のため `LocalPlayerController` で水平速度として適用する。
 * - 縦速度（ジャンプ/重力）は Rapier 側に任せる。
 *
 * 入力:
 * - moveX/moveZ: -1..+1（クランプ済み）
 * - yaw: ラジアン（rad）。Three.js 標準（Y軸まわり、左ネジ）。
 * - sprint: true でスプリント速度
 * - grounded: 接地中かどうか（空中時は加速減衰）
 *
 * 戻り値: ワールド座標の水平速度（x/z のみ、y は 0 を返す）
 */
export function computeHorizontalVelocity(
  moveX: number,
  moveZ: number,
  yaw: number,
  sprint: boolean,
  grounded: boolean,
): Vec3 {
  // 入力は「カメラローカル」: +Z = 前、+X = 右
  // ローカル → ワールドへ yaw 回転を掛ける
  // FPS 慣例: yaw=0 のとき forward = -Z（Three.js デフォルト）。
  // ただし PlayerInput 仕様は moveZ=+1 が前進。
  // ここでは「カメラ前方ベクトル」を yaw から算出して合成する。
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  let vx = forwardX * moveZ + rightX * moveX;
  let vz = forwardZ * moveZ + rightZ * moveX;

  // 正規化（斜め移動で速度が √2 倍になるのを防ぐ）
  const len = Math.hypot(vx, vz);
  if (len > 1) {
    vx /= len;
    vz /= len;
  }

  const baseSpeed = sprint ? PLAYER_PHYSICS.sprintSpeed : PLAYER_PHYSICS.walkSpeed;
  const speed = grounded ? baseSpeed : baseSpeed * PLAYER_PHYSICS.airControlFactor;

  return { x: vx * speed, y: 0, z: vz * speed };
}

/**
 * ジャンプ初速を返す（接地時のみ jumpEdge を消費する想定）。
 * 縦方向だけを上書きするためのヘルパ。
 */
export function jumpImpulse(): number {
  return PLAYER_PHYSICS.jumpVelocity;
}
