import { describe, expect, it } from 'vitest';
import type { PlayerMatchStat } from '@arigato/shared';

import { findMvp } from '../result-mvp';

/** デフォルト統計でテスト用 PlayerMatchStat を生成する。 */
function mk(
  playerId: string,
  overrides: Partial<PlayerMatchStat> = {},
): PlayerMatchStat {
  return {
    playerId,
    name: playerId,
    characterId: 'k2',
    team: 'red',
    kills: 0,
    deaths: 0,
    assists: 0,
    headshots: 0,
    damageDealt: 0,
    ...overrides,
  };
}

describe('findMvp', () => {
  it('stats 空配列なら null', () => {
    expect(findMvp([])).toBeNull();
  });

  it('kills 最多のプレイヤーが MVP', () => {
    const stats = [
      mk('p1', { kills: 3, damageDealt: 100 }),
      mk('p2', { kills: 7, damageDealt: 50 }),
      mk('p3', { kills: 1, damageDealt: 999 }),
    ];
    expect(findMvp(stats)?.playerId).toBe('p2');
  });

  it('kills 同数 → headshots で決定', () => {
    const stats = [
      mk('p1', { kills: 5, headshots: 1 }),
      mk('p2', { kills: 5, headshots: 4 }),
      mk('p3', { kills: 5, headshots: 2 }),
    ];
    expect(findMvp(stats)?.playerId).toBe('p2');
  });

  it('kills / headshots 同数 → damageDealt で決定', () => {
    const stats = [
      mk('p1', { kills: 4, headshots: 2, damageDealt: 800 }),
      mk('p2', { kills: 4, headshots: 2, damageDealt: 1200 }),
      mk('p3', { kills: 4, headshots: 2, damageDealt: 600 }),
    ];
    expect(findMvp(stats)?.playerId).toBe('p2');
  });

  it('kills / headshots / damageDealt 同数 → playerId 辞書順 ASC', () => {
    const stats = [
      mk('charlie', { kills: 3, headshots: 1, damageDealt: 500 }),
      mk('alpha', { kills: 3, headshots: 1, damageDealt: 500 }),
      mk('bravo', { kills: 3, headshots: 1, damageDealt: 500 }),
    ];
    expect(findMvp(stats)?.playerId).toBe('alpha');
  });

  it('入力配列を破壊しない', () => {
    const stats = [
      mk('p1', { kills: 1 }),
      mk('p2', { kills: 9 }),
    ];
    const snapshot = stats.map((s) => s.playerId);
    findMvp(stats);
    expect(stats.map((s) => s.playerId)).toEqual(snapshot);
  });

  it('1人だけのときは必ずその1人', () => {
    const stats = [mk('solo', { kills: 0 })];
    expect(findMvp(stats)?.playerId).toBe('solo');
  });
});
