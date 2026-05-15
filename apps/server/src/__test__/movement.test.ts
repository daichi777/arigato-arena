import { describe, expect, it } from 'vitest';
import { MAP_BOUNDS, PLAYER_PHYSICS, TICK_INTERVAL_MS, type PlayerInput, type PlayerState } from '@arigato/shared';

import { stepPlayerMovement } from '../physics/movement.js';
import { createPlayerState } from '../room/player.js';

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const p = createPlayerState({
    id: 'p1',
    name: 'tester',
    team: 'red',
    characterId: 'k2',
    spawn: { x: 0, y: 0, z: 0 },
    nowMs: 0,
    currentTick: 0,
  });
  return { ...p, ...overrides };
}

function makeInput(overrides: Partial<PlayerInput> = {}): PlayerInput {
  return {
    tick: 1,
    moveX: 0,
    moveZ: 0,
    yaw: 0,
    pitch: 0,
    sprint: false,
    jump: false,
    fire: false,
    reload: false,
    weaponSwitch: null,
    ...overrides,
  };
}

describe('stepPlayerMovement', () => {
  const dt = TICK_INTERVAL_MS / 1000;

  it('入力なしなら水平速度は 0 に張り付く', () => {
    const player = makePlayer();
    stepPlayerMovement(player, { input: null, dt, prevJump: false });
    // -0 でも 0 でも等価扱いにするため abs で比較。
    expect(Math.abs(player.velocity.x)).toBe(0);
    expect(Math.abs(player.velocity.z)).toBe(0);
  });

  it('moveZ=+1 で yaw=0 のとき -Z 方向（前）に進む', () => {
    const player = makePlayer();
    stepPlayerMovement(player, {
      input: makeInput({ moveZ: 1 }),
      dt,
      prevJump: false,
    });
    expect(player.position.z).toBeLessThan(0);
    expect(player.position.x).toBeCloseTo(0, 6);
    // walk speed * dt
    expect(player.position.z).toBeCloseTo(-PLAYER_PHYSICS.walkSpeed * dt, 6);
  });

  it('sprint=true なら walkSpeed より速い', () => {
    const player = makePlayer();
    stepPlayerMovement(player, {
      input: makeInput({ moveZ: 1, sprint: true }),
      dt,
      prevJump: false,
    });
    expect(player.position.z).toBeCloseTo(-PLAYER_PHYSICS.sprintSpeed * dt, 6);
  });

  it('地面で jump 立ち上がりエッジを踏むと Y 方向に jumpVelocity が乗る', () => {
    const player = makePlayer();
    stepPlayerMovement(player, {
      input: makeInput({ jump: true }),
      dt,
      prevJump: false,
    });
    expect(player.velocity.y).toBeGreaterThan(0);
    // 1tick 経過後の位置: v*dt
    expect(player.position.y).toBeCloseTo(PLAYER_PHYSICS.jumpVelocity * dt, 6);
  });

  it('空中ではジャンプ入力で再上昇しない', () => {
    const player = makePlayer({ position: { x: 0, y: 2, z: 0 }, velocity: { x: 0, y: 1, z: 0 } });
    stepPlayerMovement(player, {
      input: makeInput({ jump: true }),
      dt,
      prevJump: false,
    });
    // 重力で y速度は下がるはず
    expect(player.velocity.y).toBeLessThan(1);
  });

  it('マップ境界でクランプされる', () => {
    const player = makePlayer({ position: { x: MAP_BOUNDS.maxX - 0.1, y: 0, z: 0 } });
    stepPlayerMovement(player, {
      input: makeInput({ moveX: 1 }),
      dt,
      prevJump: false,
    });
    expect(player.position.x).toBeLessThanOrEqual(MAP_BOUNDS.maxX);
  });

  it('死亡中は動かない', () => {
    const player = makePlayer({ isAlive: false, position: { x: 5, y: 0, z: 0 } });
    stepPlayerMovement(player, {
      input: makeInput({ moveZ: 1, jump: true }),
      dt,
      prevJump: false,
    });
    expect(player.position).toEqual({ x: 5, y: 0, z: 0 });
    expect(player.velocity).toEqual({ x: 0, y: 0, z: 0 });
  });
});
