import { describe, expect, it } from 'vitest';
import { BODY_DAMAGE_MULTIPLIER, WEAPONS } from '@arigato/shared';

import { computeDamage, distanceMultiplier } from '../combat/damage.js';

describe('distanceMultiplier', () => {
  it('rangeDropoffStart 以下なら 1.0', () => {
    expect(distanceMultiplier('ar', 0)).toBe(1.0);
    expect(distanceMultiplier('ar', WEAPONS.ar.rangeDropoffStart)).toBe(1.0);
  });

  it('maxRange 以上なら rangeDropoffMin', () => {
    expect(distanceMultiplier('ar', WEAPONS.ar.maxRange)).toBe(WEAPONS.ar.rangeDropoffMin);
    expect(distanceMultiplier('ar', WEAPONS.ar.maxRange + 5)).toBe(WEAPONS.ar.rangeDropoffMin);
  });

  it('中間は線形補間', () => {
    const cfg = WEAPONS.ar;
    const mid = (cfg.rangeDropoffStart + cfg.maxRange) / 2;
    const expected = 1.0 + (cfg.rangeDropoffMin - 1.0) * 0.5;
    expect(distanceMultiplier('ar', mid)).toBeCloseTo(expected, 6);
  });
});

describe('computeDamage', () => {
  it('AR の胴撃ち（近距離）は damage = 25 × 1.0', () => {
    expect(computeDamage('ar', 'body', 0)).toBe(25);
  });

  it('AR のヘッド（近距離）は 25 × 2.0 = 50', () => {
    expect(computeDamage('ar', 'head', 0)).toBe(50);
  });

  it('AR の脚（近距離）は 25 × 0.7 = 17.5 → 18（四捨五入）', () => {
    expect(computeDamage('ar', 'leg', 0)).toBe(Math.round(25 * BODY_DAMAGE_MULTIPLIER.leg));
  });

  it('AR maxRange 距離での胴撃ちは 25 × 0.7 = 17.5 → 18', () => {
    const d = computeDamage('ar', 'body', WEAPONS.ar.maxRange);
    expect(d).toBe(Math.round(25 * WEAPONS.ar.rangeDropoffMin));
  });

  it('SG ペレット 1 発分の胴撃ち（近距離）は 15', () => {
    expect(computeDamage('sg', 'body', 0)).toBe(15);
  });

  it('SMG 遠距離ヘッドは下限張り付き', () => {
    const d = computeDamage('smg', 'head', WEAPONS.smg.maxRange + 10);
    // 18 * 2.0 * 0.5 = 18
    expect(d).toBe(Math.round(WEAPONS.smg.damage * BODY_DAMAGE_MULTIPLIER.head * WEAPONS.smg.rangeDropoffMin));
  });

  it('bodyPart=none なら 0', () => {
    expect(computeDamage('ar', 'none', 0)).toBe(0);
  });

  it('整数を返す', () => {
    for (const w of ['ar', 'sg', 'smg'] as const) {
      for (const part of ['head', 'body', 'leg'] as const) {
        for (const d of [0, 5, 15, 30, 60]) {
          const dmg = computeDamage(w, part, d);
          expect(Number.isInteger(dmg)).toBe(true);
        }
      }
    }
  });
});
