import { beforeEach, describe, expect, it } from 'vitest';
import type {
  MatchResult,
  ParsedServerMessage,
  PlayerState,
  RoomState,
} from '@arigato/shared';

import { useLobbyStore } from '../store';

function freshStore(): void {
  useLobbyStore.setState({
    myPlayerId: null,
    myName: '',
    roomCode: null,
    isHost: false,
    connectionStatus: 'idle',
    lastError: null,
    roomState: null,
    countdownSecondsLeft: null,
  });
}

function mkPlayer(id: string, hostId: string): PlayerState {
  return {
    id,
    name: id,
    characterId: 'k2',
    team: id === hostId ? 'red' : 'blue',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    hp: 100,
    isAlive: true,
    isInvincible: false,
    invincibleUntilMs: 0,
    currentWeapon: 'ar',
    weaponState: {
      ar: { ammoInMag: 30, nextFireMs: 0 },
      sg: { ammoInMag: 6, nextFireMs: 0 },
      smg: { ammoInMag: 25, nextFireMs: 0 },
    },
    isSprinting: false,
    isReloading: false,
    reloadEndMs: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    headshots: 0,
    damageDealt: 0,
    lastInputTick: 0,
  };
}

function mkRoomState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    code: 'ABCD23',
    hostId: 'p1',
    phase: 'lobby',
    players: { p1: mkPlayer('p1', 'p1'), p2: mkPlayer('p2', 'p1') },
    matchStartMs: 0,
    matchDurationMs: 180_000,
    serverTick: 0,
    teamKills: { red: 0, blue: 0 },
    finalResult: null,
    ...overrides,
  };
}

describe('applyServerMessage', () => {
  beforeEach(() => {
    freshStore();
  });

  it('welcome で myPlayerId / roomCode をセット', () => {
    const msg: ParsedServerMessage = {
      type: 'welcome',
      yourPlayerId: 'p1',
      roomCode: 'ABCD23',
    };
    useLobbyStore.getState().applyServerMessage(msg);
    const s = useLobbyStore.getState();
    expect(s.myPlayerId).toBe('p1');
    expect(s.roomCode).toBe('ABCD23');
    expect(s.lastError).toBeNull();
  });

  it('room_snapshot で roomState を反映', () => {
    const state = mkRoomState();
    useLobbyStore.getState().applyServerMessage({ type: 'room_snapshot', state });
    expect(useLobbyStore.getState().roomState).toEqual(state);
  });

  it('countdown 中の room_snapshot は countdownSecondsLeft を保持', () => {
    useLobbyStore.setState({ countdownSecondsLeft: 3 });
    useLobbyStore.getState().applyServerMessage({
      type: 'room_snapshot',
      state: mkRoomState({ phase: 'countdown' }),
    });
    expect(useLobbyStore.getState().countdownSecondsLeft).toBe(3);
  });

  it('phase が countdown 以外に戻ったら countdownSecondsLeft をクリア', () => {
    useLobbyStore.setState({ countdownSecondsLeft: 1 });
    useLobbyStore.getState().applyServerMessage({
      type: 'room_snapshot',
      state: mkRoomState({ phase: 'playing' }),
    });
    expect(useLobbyStore.getState().countdownSecondsLeft).toBeNull();
  });

  it('countdown メッセージで残秒数を更新', () => {
    useLobbyStore.getState().applyServerMessage({ type: 'countdown', secondsLeft: 2 });
    expect(useLobbyStore.getState().countdownSecondsLeft).toBe(2);
  });

  it('error メッセージで lastError をセット', () => {
    useLobbyStore.getState().applyServerMessage({
      type: 'error',
      code: 'room_full',
      message: 'ルームが満員です',
    });
    expect(useLobbyStore.getState().lastError).toEqual({
      code: 'room_full',
      message: 'ルームが満員です',
    });
  });

  it('match_end で finalResult を反映 & phase=finished', () => {
    useLobbyStore.getState().applyServerMessage({
      type: 'room_snapshot',
      state: mkRoomState(),
    });
    const result: MatchResult = {
      winnerTeam: 'red',
      teamKills: { red: 10, blue: 5 },
      mvpPlayerId: 'p1',
      playerStats: [],
    };
    useLobbyStore.getState().applyServerMessage({ type: 'match_end', result });
    const s = useLobbyStore.getState();
    expect(s.roomState?.phase).toBe('finished');
    expect(s.roomState?.finalResult).toEqual(result);
  });

  it('snapshot/hit/kill_feed は store を変更しない', () => {
    useLobbyStore.setState({ countdownSecondsLeft: 1 });
    useLobbyStore.getState().applyServerMessage({
      type: 'snapshot',
      tick: 1,
      serverTimeMs: 1,
      players: [],
      matchTimeRemainingMs: 180_000,
      teamKills: { red: 0, blue: 0 },
    });
    // 既存の値が保たれている
    expect(useLobbyStore.getState().countdownSecondsLeft).toBe(1);
  });
});

describe('resetForNewRoom', () => {
  it('セッションを初期化', () => {
    useLobbyStore.setState({
      myPlayerId: 'p1',
      roomCode: 'ABCD23',
      isHost: true,
      connectionStatus: 'connected',
      lastError: { code: 'room_full', message: 'x' },
      roomState: mkRoomState(),
      countdownSecondsLeft: 2,
    });
    useLobbyStore.getState().resetForNewRoom();
    const s = useLobbyStore.getState();
    expect(s.myPlayerId).toBeNull();
    expect(s.roomCode).toBeNull();
    expect(s.isHost).toBe(false);
    expect(s.connectionStatus).toBe('idle');
    expect(s.lastError).toBeNull();
    expect(s.roomState).toBeNull();
    expect(s.countdownSecondsLeft).toBeNull();
  });
});
