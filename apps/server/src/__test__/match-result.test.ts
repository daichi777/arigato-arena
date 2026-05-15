import { describe, expect, it } from 'vitest';

import { buildMatchResult } from '../combat/match-result.js';
import { createInitialRoomState } from '../room/room-state.js';
import { createPlayerState } from '../room/player.js';

function makeRoom(): ReturnType<typeof createInitialRoomState> {
  const r = createInitialRoomState('TESTMR');
  const setup = [
    { id: 'a', team: 'red' as const },
    { id: 'b', team: 'red' as const },
    { id: 'c', team: 'blue' as const },
    { id: 'd', team: 'blue' as const },
  ];
  for (const s of setup) {
    r.players[s.id] = createPlayerState({
      id: s.id,
      name: s.id,
      team: s.team,
      characterId: 'k2',
      spawn: { x: 0, y: 0, z: 0 },
      nowMs: 0,
      currentTick: 0,
    });
  }
  r.hostId = 'a';
  return r;
}

describe('buildMatchResult', () => {
  it('teamKills.red > blue で winnerTeam=red', () => {
    const r = makeRoom();
    r.teamKills = { red: 10, blue: 5 };
    const res = buildMatchResult(r);
    expect(res.winnerTeam).toBe('red');
    expect(res.teamKills.red).toBe(10);
    expect(res.teamKills.blue).toBe(5);
  });

  it('teamKills.blue > red で winnerTeam=blue', () => {
    const r = makeRoom();
    r.teamKills = { red: 3, blue: 7 };
    expect(buildMatchResult(r).winnerTeam).toBe('blue');
  });

  it('同点で winnerTeam=draw', () => {
    const r = makeRoom();
    r.teamKills = { red: 4, blue: 4 };
    expect(buildMatchResult(r).winnerTeam).toBe('draw');
  });

  it('playerStats に全員分が入る（id ASC）', () => {
    const r = makeRoom();
    const res = buildMatchResult(r);
    expect(res.playerStats.map((s) => s.playerId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('MVP: kills 最大が勝つ', () => {
    const r = makeRoom();
    r.players['a']!.kills = 3;
    r.players['b']!.kills = 5;
    r.players['c']!.kills = 1;
    r.players['d']!.kills = 4;
    expect(buildMatchResult(r).mvpPlayerId).toBe('b');
  });

  it('MVP タイブレーク: kills 同点なら headshots 多い方', () => {
    const r = makeRoom();
    r.players['a']!.kills = 3;
    r.players['a']!.headshots = 1;
    r.players['b']!.kills = 3;
    r.players['b']!.headshots = 2;
    expect(buildMatchResult(r).mvpPlayerId).toBe('b');
  });

  it('MVP タイブレーク: kills/headshots 同点なら damageDealt 多い方', () => {
    const r = makeRoom();
    r.players['a']!.kills = 3;
    r.players['a']!.headshots = 1;
    r.players['a']!.damageDealt = 200;
    r.players['b']!.kills = 3;
    r.players['b']!.headshots = 1;
    r.players['b']!.damageDealt = 300;
    expect(buildMatchResult(r).mvpPlayerId).toBe('b');
  });

  it('MVP タイブレーク: 全部同じなら id ASC', () => {
    const r = makeRoom();
    // 全員 kills=1
    for (const id of ['a', 'b', 'c', 'd']) {
      r.players[id]!.kills = 1;
    }
    expect(buildMatchResult(r).mvpPlayerId).toBe('a');
  });

  it('参加者 0 で mvpPlayerId は空文字', () => {
    const r = createInitialRoomState('EMPTY1');
    const res = buildMatchResult(r);
    expect(res.mvpPlayerId).toBe('');
    expect(res.playerStats).toEqual([]);
  });
});
