import { describe, it, expect } from 'vitest';
import { computeHorizontalVelocity, jumpImpulse } from '../physics/movement';
import { PLAYER_PHYSICS } from '@arigato/shared';

describe('computeHorizontalVelocity', () => {
  it('入力 0 なら速度 0', () => {
    const v = computeHorizontalVelocity(0, 0, 0, false, true);
    // sin/cos 経由で -0 が混ざりうるので toBeCloseTo を使う
    expect(v.x).toBeCloseTo(0, 10);
    expect(v.z).toBeCloseTo(0, 10);
    expect(v.y).toBe(0);
  });

  it('yaw=0, moveZ=1 で前進方向（-Z）に walkSpeed', () => {
    const v = computeHorizontalVelocity(0, 1, 0, false, true);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(-PLAYER_PHYSICS.walkSpeed, 5);
  });

  it('yaw=0, moveX=1 で右方向（+X）に walkSpeed', () => {
    const v = computeHorizontalVelocity(1, 0, 0, false, true);
    expect(v.x).toBeCloseTo(PLAYER_PHYSICS.walkSpeed, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('斜め移動でも速度の大きさは walkSpeed を超えない（正規化）', () => {
    const v = computeHorizontalVelocity(1, 1, 0, false, true);
    const speed = Math.hypot(v.x, v.z);
    expect(speed).toBeLessThanOrEqual(PLAYER_PHYSICS.walkSpeed + 1e-9);
    expect(speed).toBeCloseTo(PLAYER_PHYSICS.walkSpeed, 4);
  });

  it('sprint=true で sprintSpeed', () => {
    const v = computeHorizontalVelocity(0, 1, 0, true, true);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(PLAYER_PHYSICS.sprintSpeed, 4);
  });

  it('grounded=false で airControlFactor が掛かる', () => {
    const grounded = computeHorizontalVelocity(0, 1, 0, false, true);
    const air = computeHorizontalVelocity(0, 1, 0, false, false);
    expect(Math.hypot(air.x, air.z)).toBeCloseTo(
      Math.hypot(grounded.x, grounded.z) * PLAYER_PHYSICS.airControlFactor,
      5,
    );
  });

  it('yaw=π/2, moveZ=1 で前進は +X 方向（左回転後の forward）', () => {
    const v = computeHorizontalVelocity(0, 1, Math.PI / 2, false, true);
    // forwardX = -sin(π/2) = -1 → moveZ=+1 で v.x = -walkSpeed
    expect(v.x).toBeCloseTo(-PLAYER_PHYSICS.walkSpeed, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });
});

describe('jumpImpulse', () => {
  it('PLAYER_PHYSICS.jumpVelocity を返す', () => {
    expect(jumpImpulse()).toBe(PLAYER_PHYSICS.jumpVelocity);
  });
});
