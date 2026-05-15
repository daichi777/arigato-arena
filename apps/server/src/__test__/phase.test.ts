import { describe, expect, it } from 'vitest';
import { COUNTDOWN_SECONDS, MATCH_DURATION_MS } from '@arigato/shared';

import {
  canStartMatch,
  countdownSecondsLeft,
  matchTimeRemainingMs,
  shouldFinishMatch,
  transitionToCountdown,
  transitionToFinished,
  transitionToPlaying,
} from '../room/phase.js';
import { createInitialRoomState } from '../room/room-state.js';
import { createPlayerState } from '../room/player.js';

function makeRoom() {
  const r = createInitialRoomState('TEST01');
  for (let i = 0; i < 2; i += 1) {
    const id = `p${i}`;
    r.players[id] = createPlayerState({
      id,
      name: `n${i}`,
      team: i % 2 === 0 ? 'red' : 'blue',
      characterId: 'k2',
      spawn: { x: 0, y: 0, z: 0 },
      nowMs: 0,
      currentTick: 0,
    });
  }
  r.hostId = 'p0';
  return r;
}

describe('phase transitions', () => {
  it('lobby で 2 人いれば canStartMatch=true', () => {
    const r = makeRoom();
    expect(canStartMatch(r)).toBe(true);
  });

  it('1 人でも canStartMatch=true（ソロ動作確認用）', () => {
    const r = makeRoom();
    delete r.players['p1'];
    expect(canStartMatch(r)).toBe(true);
  });

  it('0 人だと canStartMatch=false', () => {
    const r = makeRoom();
    delete r.players['p0'];
    delete r.players['p1'];
    expect(canStartMatch(r)).toBe(false);
  });

  it('transitionToCountdown で phase=countdown, matchStartMs は now+3s', () => {
    const r = makeRoom();
    transitionToCountdown(r, 1000);
    expect(r.phase).toBe('countdown');
    expect(r.matchStartMs).toBe(1000 + COUNTDOWN_SECONDS * 1000);
  });

  it('countdownSecondsLeft は時間に応じて減る', () => {
    const r = makeRoom();
    transitionToCountdown(r, 0);
    expect(countdownSecondsLeft(r, 0)).toBe(COUNTDOWN_SECONDS);
    expect(countdownSecondsLeft(r, 2500)).toBe(1);
    expect(countdownSecondsLeft(r, COUNTDOWN_SECONDS * 1000)).toBe(0);
  });

  it('transitionToPlaying でプレイヤーがスポーンに移動・無敵が付与される', () => {
    const r = makeRoom();
    transitionToPlaying(r, 10_000);
    expect(r.phase).toBe('playing');
    expect(r.matchStartMs).toBe(10_000);
    for (const p of Object.values(r.players)) {
      expect(p.hp).toBe(100);
      expect(p.isAlive).toBe(true);
      expect(p.isInvincible).toBe(true);
      expect(p.invincibleUntilMs).toBeGreaterThan(10_000);
    }
  });

  it('shouldFinishMatch は試合時間経過後に true', () => {
    const r = makeRoom();
    transitionToPlaying(r, 0);
    expect(shouldFinishMatch(r, MATCH_DURATION_MS - 1)).toBe(false);
    expect(shouldFinishMatch(r, MATCH_DURATION_MS)).toBe(true);
  });

  it('matchTimeRemainingMs は経過に応じて減る', () => {
    const r = makeRoom();
    transitionToPlaying(r, 0);
    expect(matchTimeRemainingMs(r, 0)).toBe(MATCH_DURATION_MS);
    expect(matchTimeRemainingMs(r, MATCH_DURATION_MS / 2)).toBe(MATCH_DURATION_MS / 2);
    expect(matchTimeRemainingMs(r, MATCH_DURATION_MS + 1000)).toBe(0);
  });

  it('transitionToFinished で phase=finished', () => {
    const r = makeRoom();
    transitionToFinished(r, 100);
    expect(r.phase).toBe('finished');
  });
});
