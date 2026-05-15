import {
  MAP_BOUNDS,
  PLAYER_PHYSICS,
  type PlayerInput,
  type PlayerState,
  type Vec3,
} from '@arigato/shared';

import { clampToBounds, isOnGround } from './bounds.js';

export interface MovementContext {
  /** 直近 input（無ければ無入力扱い） */
  input: PlayerInput | null;
  /** 1tick の delta time 秒 */
  dt: number;
  /** ジャンプ立ち上がりエッジ判定用に、前 tick の jump 状態 */
  prevJump: boolean;
}

/**
 * 1tick 分のプレイヤー移動を計算する純粋関数。
 * - サーバー権威。位置/速度はクライアントから受け取らず、ここで計算する。
 * - yaw/pitch は描画用にクライアント値をそのまま採用（要件通り）。
 *
 * 戻り値は「次のジャンプ立ち上がり判定用に保持しておくべき今 tick の jump 状態」。
 */
export function stepPlayerMovement(player: PlayerState, ctx: MovementContext): { prevJump: boolean } {
  const input = ctx.input;
  const dt = ctx.dt;

  if (!player.isAlive) {
    // 死亡中は動かない。velocity は 0 に張り付け、yaw/pitch は最後の値のまま。
    player.velocity = { x: 0, y: 0, z: 0 };
    return { prevJump: ctx.prevJump };
  }

  // 視点はクライアント値を採用（描画遅延を避ける用途。Hitscan は Day2 で別途検証）。
  if (input) {
    player.yaw = input.yaw;
    player.pitch = input.pitch;
    player.isSprinting = input.sprint;
  } else {
    player.isSprinting = false;
  }

  // 水平方向の入力ベクトル（ローカル: moveX 右, moveZ 前）
  const localX = input?.moveX ?? 0;
  const localZ = input?.moveZ ?? 0;
  // yaw 回転で world 座標へ変換。
  // Three.js 慣例: yaw=0 のとき forward は -Z。今回は moveZ=+1 を「前進」とするため、
  //   world.forward = (-sin(yaw), 0, -cos(yaw))  (= -Z をyaw回転)
  //   world.right   = ( cos(yaw), 0, -sin(yaw))
  const cosY = Math.cos(player.yaw);
  const sinY = Math.sin(player.yaw);
  // 入力強度のクランプ（斜め移動でも速度上限を超えないよう正規化）。
  const inputLen = Math.hypot(localX, localZ);
  const normX = inputLen > 1 ? localX / inputLen : localX;
  const normZ = inputLen > 1 ? localZ / inputLen : localZ;

  const forwardX = -sinY;
  const forwardZ = -cosY;
  const rightX = cosY;
  const rightZ = -sinY;

  const dirX = rightX * normX + forwardX * normZ;
  const dirZ = rightZ * normX + forwardZ * normZ;

  const grounded = isOnGround(player.position, player.velocity.y);
  const baseSpeed = player.isSprinting ? PLAYER_PHYSICS.sprintSpeed : PLAYER_PHYSICS.walkSpeed;
  const speed = grounded ? baseSpeed : baseSpeed * PLAYER_PHYSICS.airControlFactor;

  // 水平速度: 接地中は即時、空中は加速減衰を効かせるが MVP では速度差を直接張り付け
  player.velocity.x = dirX * speed;
  player.velocity.z = dirZ * speed;

  // ジャンプ: 立ち上がりエッジ + 接地必須
  const jumpEdge = (input?.jump ?? false) && !ctx.prevJump;
  if (jumpEdge && grounded) {
    player.velocity.y = PLAYER_PHYSICS.jumpVelocity;
  } else if (grounded && player.velocity.y < 0) {
    // 接地中で下向き速度は 0 に張り付け（地面にめり込まない）
    player.velocity.y = 0;
  } else {
    // 重力適用
    player.velocity.y += PLAYER_PHYSICS.gravity * dt;
  }

  // 位置更新
  const nextPos: Vec3 = {
    x: player.position.x + player.velocity.x * dt,
    y: player.position.y + player.velocity.y * dt,
    z: player.position.z + player.velocity.z * dt,
  };

  // 床面クランプ
  if (nextPos.y < MAP_BOUNDS.minY) {
    nextPos.y = MAP_BOUNDS.minY;
    if (player.velocity.y < 0) player.velocity.y = 0;
  }

  player.position = clampToBounds(nextPos);

  return { prevJump: input?.jump ?? false };
}
