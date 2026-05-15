import { describe, it, expect } from 'vitest';
import {
  clamp,
  computeProgress,
  interpolatePlayer,
  lerp,
  lerpVec3,
  makePair,
  shortAngleLerp,
} from '../net/interpolate';
import type { BufferedSnapshot } from '../types';
import type { PlayerSnapshot } from '@arigato/shared';

describe('lerp / clamp', () => {
  it('lerp は線形補間', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
  });

  it('clamp は範囲外を端に', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('lerpVec3 は各成分を補間', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 10, y: -2, z: 4 };
    const m = lerpVec3(a, b, 0.5);
    expect(m).toEqual({ x: 5, y: -1, z: 2 });
  });
});

describe('shortAngleLerp', () => {
  it('-π + small と +π - small は最短経路で ±π を経由する', () => {
    const a = -Math.PI + 0.1;
    const b = Math.PI - 0.1;
    const m = shortAngleLerp(a, b, 0.5);
    // 最短経路: 差分は -0.2（2π を越えるので短い方）。中点は a + (-0.2)/2 = -π。
    expect(m).toBeCloseTo(-Math.PI, 5);
  });

  it('同値なら同値', () => {
    expect(shortAngleLerp(1, 1, 0.5)).toBe(1);
  });
});

describe('computeProgress', () => {
  it('範囲内は [0, 1]', () => {
    expect(computeProgress(100, 200, 150)).toBe(0.5);
    expect(computeProgress(100, 200, 100)).toBe(0);
    expect(computeProgress(100, 200, 200)).toBe(1);
  });
  it('範囲外はクランプ', () => {
    expect(computeProgress(100, 200, 50)).toBe(0);
    expect(computeProgress(100, 200, 250)).toBe(1);
  });
  it('span = 0 なら 0', () => {
    expect(computeProgress(100, 100, 100)).toBe(0);
  });
});

function mkP(id: string, x: number, yaw: number): PlayerSnapshot {
  return {
    id,
    position: { x, y: 0, z: 0 },
    yaw,
    pitch: 0,
    hp: 100,
    isAlive: true,
    currentWeapon: 'ar',
    isReloading: false,
    velocity: { x: 0, y: 0, z: 0 },
    ammoInMag: 30,
    isInvincible: false,
    reloadEndMs: 0,
  };
}

function mkSnap(serverTimeMs: number, players: PlayerSnapshot[]): BufferedSnapshot {
  return {
    clientReceivedAtMs: serverTimeMs,
    serverTimeMs,
    players: new Map(players.map((p) => [p.id, p])),
  };
}

describe('interpolatePlayer', () => {
  it('両方にいるなら位置を線形補間', () => {
    const prev = mkSnap(100, [mkP('a', 0, 0)]);
    const next = mkSnap(200, [mkP('a', 10, 1)]);
    const pair = makePair(prev, next, 150);
    const r = interpolatePlayer(pair, 'a');
    expect(r?.position.x).toBeCloseTo(5);
    expect(r?.yaw).toBeCloseTo(0.5);
  });

  it('prev のみなら prev を返す', () => {
    const prev = mkSnap(100, [mkP('a', 0, 0)]);
    const next = mkSnap(200, []);
    const pair = makePair(prev, next, 150);
    const r = interpolatePlayer(pair, 'a');
    expect(r?.position.x).toBe(0);
  });

  it('next のみなら next を返す', () => {
    const prev = mkSnap(100, []);
    const next = mkSnap(200, [mkP('a', 7, 0)]);
    const pair = makePair(prev, next, 150);
    const r = interpolatePlayer(pair, 'a');
    expect(r?.position.x).toBe(7);
  });

  it('どちらにも居ないと null', () => {
    const prev = mkSnap(100, []);
    const next = mkSnap(200, []);
    const pair = makePair(prev, next, 150);
    expect(interpolatePlayer(pair, 'a')).toBeNull();
  });
});
