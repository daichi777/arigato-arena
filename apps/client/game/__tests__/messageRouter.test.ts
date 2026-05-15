import { describe, it, expect } from 'vitest';
import { isGameMessage, routeServerMessage } from '../net/messageRouter';
import type { ServerSnapshot, ServerKillFeed, ServerWelcome } from '@arigato/shared';

describe('isGameMessage', () => {
  it('snapshot は true', () => {
    const m: ServerSnapshot = {
      type: 'snapshot',
      tick: 0,
      serverTimeMs: 0,
      players: [],
      matchTimeRemainingMs: 0,
      teamKills: { red: 0, blue: 0 },
    };
    expect(isGameMessage(m)).toBe(true);
  });

  it('kill_feed は true', () => {
    const m: ServerKillFeed = {
      type: 'kill_feed',
      killerId: 'a',
      victimId: 'b',
      weapon: 'ar',
      isHeadshot: false,
      tickMs: 0,
    };
    expect(isGameMessage(m)).toBe(true);
  });

  it('welcome は false（lobby 担当）', () => {
    const m: ServerWelcome = {
      type: 'welcome',
      yourPlayerId: 'p1',
      roomCode: 'ABC123',
    };
    expect(isGameMessage(m)).toBe(false);
  });
});

describe('routeServerMessage', () => {
  it('JSON 文字列の snapshot をパース', () => {
    const json = JSON.stringify({
      type: 'snapshot',
      tick: 1,
      serverTimeMs: 100,
      players: [],
      matchTimeRemainingMs: 180000,
      teamKills: { red: 0, blue: 0 },
    });
    const result = routeServerMessage(json);
    expect(result?.type).toBe('snapshot');
  });

  it('lobby メッセージ（welcome）は null', () => {
    const json = JSON.stringify({
      type: 'welcome',
      yourPlayerId: 'p1',
      roomCode: 'ABC123',
    });
    expect(routeServerMessage(json)).toBeNull();
  });

  it('JSON parse 失敗で null', () => {
    expect(routeServerMessage('not-json')).toBeNull();
  });

  it('オブジェクト直渡しでも動く', () => {
    const obj = {
      type: 'kill_feed' as const,
      killerId: 'a',
      victimId: 'b',
      weapon: 'sg' as const,
      isHeadshot: true,
      tickMs: 1234,
    };
    const r = routeServerMessage(obj);
    expect(r?.type).toBe('kill_feed');
  });

  it('スキーマ違反は null', () => {
    expect(routeServerMessage({ type: 'snapshot' })).toBeNull();
  });
});
