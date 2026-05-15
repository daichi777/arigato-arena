import { describe, it, expect } from 'vitest';
import { buildPlayerInput, normalizeYaw } from '../input/buildPlayerInput';
import type { KeyState, LookRef } from '../types';

function makeKeys(overrides: Partial<KeyState> = {}): KeyState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    fire: false,
    reload: false,
    jumpEdge: false,
    reloadEdge: false,
    weaponSwitch: null,
    ...overrides,
  };
}

function makeLook(overrides: Partial<LookRef> = {}): LookRef {
  return { yaw: 0, pitch: 0, ...overrides };
}

describe('buildPlayerInput', () => {
  it('forward+right で moveZ=+1, moveX=+1', () => {
    const input = buildPlayerInput(7, makeKeys({ forward: true, right: true }), makeLook());
    expect(input.tick).toBe(7);
    expect(input.moveZ).toBe(1);
    expect(input.moveX).toBe(1);
  });

  it('back+left で moveZ=-1, moveX=-1', () => {
    const input = buildPlayerInput(0, makeKeys({ backward: true, left: true }), makeLook());
    expect(input.moveZ).toBe(-1);
    expect(input.moveX).toBe(-1);
  });

  it('forward と backward が同時押しなら 0', () => {
    const input = buildPlayerInput(0, makeKeys({ forward: true, backward: true }), makeLook());
    expect(input.moveZ).toBe(0);
  });

  it('jumpEdge は立ち上がりとして PlayerInput.jump に反映', () => {
    const input = buildPlayerInput(0, makeKeys({ jumpEdge: true }), makeLook());
    expect(input.jump).toBe(true);
  });

  it('fire はそのまま転送', () => {
    expect(buildPlayerInput(0, makeKeys({ fire: true }), makeLook()).fire).toBe(true);
  });

  it('weaponSwitch は KeyState の値をそのまま採用', () => {
    const input = buildPlayerInput(0, makeKeys({ weaponSwitch: 'sg' }), makeLook());
    expect(input.weaponSwitch).toBe('sg');
  });

  it('pitch は -π/2..+π/2 にクランプ', () => {
    expect(buildPlayerInput(0, makeKeys(), makeLook({ pitch: 99 })).pitch).toBeCloseTo(Math.PI / 2);
    expect(buildPlayerInput(0, makeKeys(), makeLook({ pitch: -99 })).pitch).toBeCloseTo(-Math.PI / 2);
  });

  it('yaw は -π..+π に正規化', () => {
    const y = buildPlayerInput(0, makeKeys(), makeLook({ yaw: 4 * Math.PI + 0.1 })).yaw;
    expect(y).toBeGreaterThan(-Math.PI);
    expect(y).toBeLessThan(Math.PI);
    expect(y).toBeCloseTo(0.1, 5);
  });
});

describe('normalizeYaw', () => {
  it('0 はそのまま', () => {
    expect(normalizeYaw(0)).toBe(0);
  });
  it('π+ε は -π+ε に', () => {
    expect(normalizeYaw(Math.PI + 0.1)).toBeCloseTo(-Math.PI + 0.1, 5);
  });
  it('-π-ε は +π-ε に', () => {
    expect(normalizeYaw(-Math.PI - 0.1)).toBeCloseTo(Math.PI - 0.1, 5);
  });
});
