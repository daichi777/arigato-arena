import { describe, expect, it } from 'vitest';
import { COUNTDOWN_SECONDS, MATCH_DURATION_MS } from '@arigato/shared';

import { InputBuffer } from '../input/input-buffer.js';
import { createInitialRoomState } from '../room/room-state.js';
import { createPlayerState } from '../room/player.js';
import { transitionToCountdown, transitionToPlaying } from '../room/phase.js';
import { tickStep } from '../tick/tick-step.js';

function setupRoom() {
  const r = createInitialRoomState('TEST02');
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
  return r;
}

describe('tickStep', () => {
  it('serverTick がインクリメントされる', () => {
    const state = setupRoom();
    const inputs = new InputBuffer();
    tickStep({ state, inputs, nowMs: 0 });
    expect(state.serverTick).toBe(1);
    tickStep({ state, inputs, nowMs: 50 });
    expect(state.serverTick).toBe(2);
  });

  it('countdown が 0 になると playing に遷移する', () => {
    const state = setupRoom();
    transitionToCountdown(state, 0);
    const inputs = new InputBuffer();
    // 3秒経過後の tick で playing 遷移
    const result = tickStep({ state, inputs, nowMs: COUNTDOWN_SECONDS * 1000 });
    expect(state.phase).toBe('playing');
    expect(result.phaseChanged).toBe('playing');
  });

  it('playing 中に試合時間切れで finished に遷移する', () => {
    const state = setupRoom();
    transitionToPlaying(state, 0);
    const inputs = new InputBuffer();
    const result = tickStep({ state, inputs, nowMs: MATCH_DURATION_MS + 100 });
    expect(state.phase).toBe('finished');
    expect(result.phaseChanged).toBe('finished');
  });

  it('input が無いと lobby では position が動かない', () => {
    const state = setupRoom();
    const inputs = new InputBuffer();
    const before = { ...state.players['a']!.position };
    tickStep({ state, inputs, nowMs: 50 });
    expect(state.players['a']!.position).toEqual(before);
  });

  it('playing 中に input を積むと位置が変わる', () => {
    const state = setupRoom();
    transitionToPlaying(state, 0);
    const before = { ...state.players['a']!.position };
    const inputs = new InputBuffer();
    inputs.push('a', {
      tick: 1,
      moveX: 0,
      moveZ: 1,
      yaw: 0,
      pitch: 0,
      sprint: false,
      jump: false,
      fire: false,
      reload: false,
      weaponSwitch: null,
    });
    tickStep({ state, inputs, nowMs: 50 });
    // moveZ=+1 のとき yaw=0 で -Z 方向に動く（地面なので Y は 0 のまま）。
    // 無敵中なので位置は普通に変わる（無敵は被ダメだけ）。
    expect(state.players['a']!.position.z).not.toBe(before.z);
  });
});
