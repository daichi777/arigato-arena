import { describe, expect, it } from 'vitest';
import { PLAYER_INITIAL_HP, RESPAWN_DELAY_MS, SPAWN_INVINCIBLE_MS } from '@arigato/shared';

import { processRespawns, RespawnQueue } from '../combat/respawn.js';
import { createInitialRoomState } from '../room/room-state.js';
import { createPlayerState } from '../room/player.js';
import { transitionToPlaying } from '../room/phase.js';

describe('RespawnQueue', () => {
  it('schedule した予定は drainDue で時刻到達時に取り出せる', () => {
    const q = new RespawnQueue();
    q.schedule('p1', 1000);
    expect(q.drainDue(999)).toEqual([]);
    expect(q.drainDue(1000)).toEqual(['p1']);
    // 1 回 drain したらキューから消える
    expect(q.drainDue(2000)).toEqual([]);
  });

  it('複数 schedule は時刻昇順で返る', () => {
    const q = new RespawnQueue();
    q.schedule('p2', 2000);
    q.schedule('p1', 1000);
    q.schedule('p3', 1500);
    expect(q.drainDue(3000)).toEqual(['p1', 'p3', 'p2']);
  });

  it('cancel で予定を消せる', () => {
    const q = new RespawnQueue();
    q.schedule('p1', 1000);
    q.cancel('p1');
    expect(q.drainDue(2000)).toEqual([]);
  });

  it('同じ ID を再 schedule すると最新が有効', () => {
    const q = new RespawnQueue();
    q.schedule('p1', 1000);
    q.schedule('p1', 5000);
    expect(q.drainDue(2000)).toEqual([]);
    expect(q.drainDue(5000)).toEqual(['p1']);
  });

  it('clear で全消去', () => {
    const q = new RespawnQueue();
    q.schedule('p1', 100);
    q.schedule('p2', 200);
    q.clear();
    expect(q.size()).toBe(0);
  });
});

describe('processRespawns', () => {
  function makeState() {
    const r = createInitialRoomState('TESTRP');
    const ids = ['a', 'b'];
    ids.forEach((id, i) => {
      r.players[id] = createPlayerState({
        id,
        name: id,
        team: i === 0 ? 'red' : 'blue',
        characterId: 'k2',
        spawn: { x: 0, y: 0, z: 0 },
        nowMs: 0,
        currentTick: 0,
      });
    });
    r.hostId = 'a';
    transitionToPlaying(r, 0);
    return r;
  }

  it('死亡プレイヤーを RESPAWN_DELAY_MS 後に復活させる', () => {
    const state = makeState();
    const q = new RespawnQueue();
    const dead = state.players['a']!;
    dead.isAlive = false;
    dead.hp = 0;
    dead.position = { x: 0, y: 0, z: 0 };
    q.schedule('a', RESPAWN_DELAY_MS);

    // 時刻到達前: 何も起きない
    processRespawns(state, q, RESPAWN_DELAY_MS - 1);
    expect(state.players['a']!.isAlive).toBe(false);

    // 時刻到達: HP 満タン、無敵付与
    processRespawns(state, q, RESPAWN_DELAY_MS);
    const reborn = state.players['a']!;
    expect(reborn.isAlive).toBe(true);
    expect(reborn.hp).toBe(PLAYER_INITIAL_HP);
    expect(reborn.isInvincible).toBe(true);
    expect(reborn.invincibleUntilMs).toBe(RESPAWN_DELAY_MS + SPAWN_INVINCIBLE_MS);
  });

  it('既に存在しないプレイヤーは無視される', () => {
    const state = makeState();
    const q = new RespawnQueue();
    q.schedule('ghost', 100);
    expect(() => processRespawns(state, q, 200)).not.toThrow();
  });
});
