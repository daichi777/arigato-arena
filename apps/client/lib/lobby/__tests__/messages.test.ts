import { describe, expect, it } from 'vitest';
import {
  buildHostShuffleTeamsMessage,
  buildHostStartMatchMessage,
  buildJoinMessage,
  buildReadyToggleMessage,
  buildSelectCharacterMessage,
  encodeClientMessage,
  isGameOnlyMessage,
  parseServerMessageFromEvent,
} from '../messages';
import type { ParsedServerMessage } from '@arigato/shared';

describe('builders', () => {
  it('join', () => {
    expect(buildJoinMessage('k2', true)).toEqual({ type: 'join', name: 'k2', asHost: true });
  });

  it('select_character', () => {
    expect(buildSelectCharacterMessage('shuto')).toEqual({
      type: 'select_character',
      characterId: 'shuto',
    });
  });

  it('ready_toggle', () => {
    expect(buildReadyToggleMessage(true)).toEqual({ type: 'ready_toggle', ready: true });
  });

  it('host_shuffle_teams 引数なし', () => {
    expect(buildHostShuffleTeamsMessage()).toEqual({ type: 'host_shuffle_teams' });
  });

  it('host_shuffle_teams 引数あり', () => {
    expect(buildHostShuffleTeamsMessage({ p1: 'red', p2: 'blue' })).toEqual({
      type: 'host_shuffle_teams',
      assignments: { p1: 'red', p2: 'blue' },
    });
  });

  it('host_start_match', () => {
    expect(buildHostStartMatchMessage()).toEqual({ type: 'host_start_match' });
  });
});

describe('encodeClientMessage', () => {
  it('JSON 文字列にする', () => {
    const json = encodeClientMessage(buildJoinMessage('k2', false));
    expect(JSON.parse(json)).toEqual({ type: 'join', name: 'k2', asHost: false });
  });
});

describe('parseServerMessageFromEvent', () => {
  it('正常 JSON 文字列をパース', () => {
    const data = JSON.stringify({
      type: 'welcome',
      yourPlayerId: 'p1',
      roomCode: 'ABCD23',
    });
    const parsed = parseServerMessageFromEvent(data);
    expect(parsed?.type).toBe('welcome');
  });

  it('壊れた JSON は null', () => {
    expect(parseServerMessageFromEvent('not json')).toBeNull();
  });

  it('未知の type は null', () => {
    expect(parseServerMessageFromEvent(JSON.stringify({ type: 'foo' }))).toBeNull();
  });

  it('ArrayBuffer など非文字列は null', () => {
    expect(parseServerMessageFromEvent(new ArrayBuffer(4))).toBeNull();
  });
});

describe('isGameOnlyMessage', () => {
  const mk = (type: string): ParsedServerMessage =>
    ({ type } as unknown as ParsedServerMessage);

  it('snapshot/hit/kill_feed は true', () => {
    expect(isGameOnlyMessage(mk('snapshot'))).toBe(true);
    expect(isGameOnlyMessage(mk('hit'))).toBe(true);
    expect(isGameOnlyMessage(mk('kill_feed'))).toBe(true);
  });

  it('welcome/room_snapshot/countdown は false', () => {
    expect(isGameOnlyMessage(mk('welcome'))).toBe(false);
    expect(isGameOnlyMessage(mk('room_snapshot'))).toBe(false);
    expect(isGameOnlyMessage(mk('countdown'))).toBe(false);
  });
});
