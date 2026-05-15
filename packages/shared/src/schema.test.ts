import { describe, expect, it } from 'vitest';
import { tryParseClientMessage, tryParseClientMessageJson } from './schema.js';

describe('tryParseClientMessage', () => {
  it('正常なjoinメッセージをパース', () => {
    const msg = tryParseClientMessage({ type: 'join', name: 'k2', asHost: true });
    expect(msg).not.toBeNull();
    expect(msg?.type).toBe('join');
  });

  it('正常なinputメッセージをパース', () => {
    const msg = tryParseClientMessage({
      type: 'input',
      input: {
        tick: 0,
        moveX: 0,
        moveZ: 1,
        yaw: 0,
        pitch: 0,
        sprint: false,
        jump: false,
        fire: false,
        reload: false,
        weaponSwitch: null,
      },
    });
    expect(msg).not.toBeNull();
  });

  it('未知のtypeはnull', () => {
    expect(tryParseClientMessage({ type: 'unknown' })).toBeNull();
  });

  it('moveXの範囲外はnull', () => {
    expect(
      tryParseClientMessage({
        type: 'input',
        input: {
          tick: 0,
          moveX: 2, // 範囲外
          moveZ: 0,
          yaw: 0,
          pitch: 0,
          sprint: false,
          jump: false,
          fire: false,
          reload: false,
          weaponSwitch: null,
        },
      }),
    ).toBeNull();
  });

  it('未知のキャラクターIDはnull', () => {
    expect(
      tryParseClientMessage({ type: 'select_character', characterId: 'unknown' }),
    ).toBeNull();
  });

  it('名前が長すぎる場合はnull', () => {
    expect(
      tryParseClientMessage({ type: 'join', name: 'a'.repeat(50), asHost: false }),
    ).toBeNull();
  });
});

describe('tryParseClientMessageJson', () => {
  it('不正なJSONはnull', () => {
    expect(tryParseClientMessageJson('{invalid')).toBeNull();
  });

  it('JSON経由でパース成功', () => {
    const msg = tryParseClientMessageJson(
      JSON.stringify({ type: 'host_start_match' }),
    );
    expect(msg?.type).toBe('host_start_match');
  });
});

import { tryParseServerMessage, tryParseServerMessageJson } from './schema.js';

describe('tryParseServerMessage', () => {
  it('正常なwelcomeメッセージ', () => {
    const msg = tryParseServerMessage({
      type: 'welcome',
      yourPlayerId: 'pid_1',
      roomCode: 'ABCDEF',
    });
    expect(msg?.type).toBe('welcome');
  });

  it('不正なroomCode（小文字）はnull', () => {
    expect(
      tryParseServerMessage({ type: 'welcome', yourPlayerId: 'pid_1', roomCode: 'abcdef' }),
    ).toBeNull();
  });

  it('未知のerror codeはnull', () => {
    expect(
      tryParseServerMessage({ type: 'error', code: 'unknown', message: 'x' }),
    ).toBeNull();
  });

  it('countdownメッセージ', () => {
    const msg = tryParseServerMessage({ type: 'countdown', secondsLeft: 3 });
    expect(msg?.type).toBe('countdown');
  });

  it('snapshot に ammoInMag/isInvincible/reloadEndMs が必須', () => {
    const valid = tryParseServerMessage({
      type: 'snapshot',
      tick: 1,
      serverTimeMs: 1000,
      players: [
        {
          id: 'pid_1',
          position: { x: 0, y: 0, z: 0 },
          yaw: 0,
          pitch: 0,
          hp: 100,
          isAlive: true,
          currentWeapon: 'ar',
          isReloading: false,
          velocity: { x: 0, y: 0, z: 0 },
          ammoInMag: 30,
          isInvincible: false,
          reloadEndMs: 0,
        },
      ],
      matchTimeRemainingMs: 180_000,
      teamKills: { red: 0, blue: 0 },
    });
    expect(valid?.type).toBe('snapshot');

    // ammoInMag が無いと parse 失敗
    const missing = tryParseServerMessage({
      type: 'snapshot',
      tick: 1,
      serverTimeMs: 1000,
      players: [
        {
          id: 'pid_1',
          position: { x: 0, y: 0, z: 0 },
          yaw: 0,
          pitch: 0,
          hp: 100,
          isAlive: true,
          currentWeapon: 'ar',
          isReloading: false,
          velocity: { x: 0, y: 0, z: 0 },
        },
      ],
      matchTimeRemainingMs: 180_000,
      teamKills: { red: 0, blue: 0 },
    });
    expect(missing).toBeNull();
  });
});

describe('tryParseServerMessageJson', () => {
  it('不正JSONはnull', () => {
    expect(tryParseServerMessageJson('{invalid')).toBeNull();
  });

  it('正常JSON', () => {
    const msg = tryParseServerMessageJson(
      JSON.stringify({ type: 'countdown', secondsLeft: 2 }),
    );
    expect(msg?.type).toBe('countdown');
  });
});
