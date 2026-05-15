import { describe, expect, it } from 'vitest';
import { INPUT_RATE_LIMIT_HZ, WEAPONS, WEAPON_SWITCH_COOLDOWN_MS } from '@arigato/shared';

import { RateLimiter } from '../input/rate-limiter.js';

describe('RateLimiter', () => {
  it('input は 30Hz を超える間隔だと破棄される', () => {
    const r = new RateLimiter();
    const minInterval = 1000 / INPUT_RATE_LIMIT_HZ; // ≒33.3ms
    expect(r.allowInput('p1', 0)).toBe(true);
    // 直後（1ms 経過）は破棄
    expect(r.allowInput('p1', 1)).toBe(false);
    // ±2ms ジッタ許容あり → 直前 + minInterval - 2 で通る
    expect(r.allowInput('p1', minInterval - 2)).toBe(true);
  });

  it('shoot は武器の fireIntervalMs を下回ると破棄', () => {
    const r = new RateLimiter();
    const ar = WEAPONS.ar;
    expect(r.allowShoot('p1', 'ar', 0)).toBe(true);
    expect(r.allowShoot('p1', 'ar', ar.fireIntervalMs - 1)).toBe(false);
    expect(r.allowShoot('p1', 'ar', ar.fireIntervalMs)).toBe(true);
  });

  it('weaponSwitch は 100ms クールダウン', () => {
    const r = new RateLimiter();
    expect(r.allowWeaponSwitch('p1', 0)).toBe(true);
    expect(r.allowWeaponSwitch('p1', WEAPON_SWITCH_COOLDOWN_MS - 1)).toBe(false);
    expect(r.allowWeaponSwitch('p1', WEAPON_SWITCH_COOLDOWN_MS)).toBe(true);
  });

  it('cleanup でプレイヤー毎の状態を忘れる', () => {
    const r = new RateLimiter();
    r.allowInput('p1', 0);
    r.cleanup('p1');
    // 直後でも cleanup 後は最初の許可と同等扱い
    expect(r.allowInput('p1', 1)).toBe(true);
  });

  it('プレイヤーごとに独立して制限する', () => {
    const r = new RateLimiter();
    expect(r.allowInput('p1', 0)).toBe(true);
    expect(r.allowInput('p2', 0)).toBe(true);
    // 違うプレイヤーは影響を受けない
  });
});
