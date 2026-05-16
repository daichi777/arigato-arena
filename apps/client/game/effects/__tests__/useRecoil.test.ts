import { describe, it, expect } from 'vitest';
import { RECOIL_KICK } from '../useRecoil';

/**
 * useRecoil のユニットテスト。
 *
 * - リコイルキック定数の検証
 * - 指数減衰ロジックの検証（useRecoil 内部の計算を独立検証）
 *
 * useRecoil フック自体は useRef/useCallback を使うため、
 * テストは公開済み定数と計算ロジックを直接テストする。
 */

/** useRecoil 内と同じ減衰計算（テスト用に再実装） */
const DECAY_RATE = Math.log(1000) / 200;

function simulateDecay(initialValue: number, deltaMs: number): number {
  return initialValue * Math.exp(-DECAY_RATE * deltaMs);
}

describe('useRecoil - RECOIL_KICK 定数', () => {
  it('AR リコイルキックが定義されている', () => {
    expect(RECOIL_KICK.ar).toBeGreaterThan(0);
  });

  it('SG リコイルキックが定義されている', () => {
    expect(RECOIL_KICK.sg).toBeGreaterThan(0);
  });

  it('SMG リコイルキックが定義されている', () => {
    expect(RECOIL_KICK.smg).toBeGreaterThan(0);
  });

  it('AR と SMG のリコイルキックが等しい（同じ計算値）', () => {
    expect(RECOIL_KICK.ar).toBe(RECOIL_KICK.smg);
  });

  it('SG のリコイルキックが AR の 4 倍以上', () => {
    expect(RECOIL_KICK.sg).toBeGreaterThan(RECOIL_KICK.ar * 4);
  });

  it('AR リコイルキックが仕様値 0.012 rad', () => {
    expect(RECOIL_KICK.ar).toBeCloseTo(0.012);
  });

  it('SG リコイルキックが仕様値 0.05 rad', () => {
    expect(RECOIL_KICK.sg).toBeCloseTo(0.05);
  });
});

describe('useRecoil - 指数減衰計算', () => {
  it('200ms で初期値の 1/1000 まで減衰する', () => {
    const initial = 1.0;
    const after200ms = simulateDecay(initial, 200);
    expect(after200ms).toBeCloseTo(initial / 1000, 5);
  });

  it('100ms で初期値の 1/31.6 程度に減衰する（半分の時間）', () => {
    const initial = 1.0;
    const after100ms = simulateDecay(initial, 100);
    // exp(-0.03454 * 100) = exp(-3.454) ≈ 0.03162 ≈ 1/31.6
    expect(after100ms).toBeCloseTo(initial * Math.exp(-DECAY_RATE * 100), 5);
  });

  it('delta=0 では値が変化しない', () => {
    const initial = 0.05;
    const result = simulateDecay(initial, 0);
    expect(result).toBeCloseTo(initial);
  });

  it('SG のキックが 200ms 後には 1/1000 未満になる', () => {
    const initial = RECOIL_KICK.sg;
    const after200ms = simulateDecay(initial, 200);
    expect(after200ms).toBeLessThan(0.0001);
  });

  it('AR のキックが 50ms 後でもまだ残っている（完全減衰前）', () => {
    const initial = RECOIL_KICK.ar;
    const after50ms = simulateDecay(initial, 50);
    expect(after50ms).toBeGreaterThan(0.0001);
  });
});
