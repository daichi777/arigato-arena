import { describe, expect, it } from 'vitest';

import {
  intersectRaySphere,
  sphericalToDirection,
  vec3Length,
  vec3Normalize,
} from '../combat/raycast.js';

describe('intersectRaySphere', () => {
  it('中心を直接通るレイは hit=true、t は origin から表面までの距離', () => {
    const r = intersectRaySphere(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      1,
      100,
    );
    expect(r.hit).toBe(true);
    expect(r.t).toBeCloseTo(9, 6);
    expect(r.point.x).toBeCloseTo(9, 6);
  });

  it('球から外れたレイは hit=false', () => {
    const r = intersectRaySphere(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 10, y: 5, z: 0 },
      1,
      100,
    );
    expect(r.hit).toBe(false);
  });

  it('接線（distance == radius）は hit=true', () => {
    const r = intersectRaySphere(
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      1,
      100,
    );
    expect(r.hit).toBe(true);
    expect(r.t).toBeCloseTo(10, 4);
  });

  it('背後の球は hit=false', () => {
    const r = intersectRaySphere(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: -10, y: 0, z: 0 },
      1,
      100,
    );
    expect(r.hit).toBe(false);
  });

  it('maxT を超える t は hit=false', () => {
    const r = intersectRaySphere(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 50, y: 0, z: 0 },
      1,
      40,
    );
    expect(r.hit).toBe(false);
  });

  it('球の内側にいる場合も hit=true（遠い解 t>0 を採用）', () => {
    const r = intersectRaySphere(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      2,
      100,
    );
    expect(r.hit).toBe(true);
    expect(r.t).toBeGreaterThan(0);
  });
});

describe('vec3Length / vec3Normalize', () => {
  it('長さと正規化', () => {
    expect(vec3Length({ x: 3, y: 0, z: 4 })).toBe(5);
    const n = vec3Normalize({ x: 3, y: 0, z: 4 });
    expect(n.x).toBeCloseTo(0.6, 6);
    expect(n.z).toBeCloseTo(0.8, 6);
    const z = vec3Normalize({ x: 0, y: 0, z: 0 });
    expect(z).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('sphericalToDirection', () => {
  it('yaw=0/pitch=0 で -Z 向き', () => {
    const d = sphericalToDirection(0, 0);
    expect(d.x).toBeCloseTo(0, 6);
    expect(d.y).toBeCloseTo(0, 6);
    expect(d.z).toBeCloseTo(-1, 6);
  });

  it('yaw=PI/2 のとき -X 向き', () => {
    const d = sphericalToDirection(Math.PI / 2, 0);
    expect(d.x).toBeCloseTo(-1, 6);
    expect(d.z).toBeCloseTo(0, 6);
  });

  it('pitch=PI/2 で真上', () => {
    const d = sphericalToDirection(0, Math.PI / 2);
    expect(d.y).toBeCloseTo(1, 6);
  });
});
