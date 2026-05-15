import type { PlayerInput, WeaponType } from '@arigato/shared';
import type { KeyState, LookRef } from '../types';
import { clamp } from '../net/interpolate';

/**
 * KeyState + LookRef から PlayerInput を構築する純粋関数。
 *
 * - moveX / moveZ は -1..+1 にクランプ
 * - yaw は -π..+π に正規化
 * - pitch は -π/2..+π/2 にクランプ
 * - jump / reload はエッジ値を採用（呼び出し側で消費後リセット）
 */
export function buildPlayerInput(
  tick: number,
  keys: KeyState,
  look: LookRef,
): PlayerInput {
  const moveX = clamp((keys.right ? 1 : 0) - (keys.left ? 1 : 0), -1, 1);
  const moveZ = clamp((keys.forward ? 1 : 0) - (keys.backward ? 1 : 0), -1, 1);

  const yaw = normalizeYaw(look.yaw);
  const pitch = clamp(look.pitch, -Math.PI / 2, Math.PI / 2);

  const weaponSwitch: WeaponType | null = keys.weaponSwitch;

  return {
    tick,
    moveX,
    moveZ,
    yaw,
    pitch,
    sprint: keys.sprint,
    jump: keys.jumpEdge,
    fire: keys.fire,
    reload: keys.reloadEdge,
    weaponSwitch,
  };
}

/** yaw を -π..+π に正規化 */
export function normalizeYaw(yaw: number): number {
  const TWO_PI = Math.PI * 2;
  let y = yaw % TWO_PI;
  if (y > Math.PI) y -= TWO_PI;
  else if (y < -Math.PI) y += TWO_PI;
  return y;
}
