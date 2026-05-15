import {
  COUNTDOWN_SECONDS,
  MATCH_DURATION_MS,
  PLAYER_INITIAL_HP,
  type RoomPhase,
  type RoomState,
  SPAWN_INVINCIBLE_MS,
  TICK_INTERVAL_MS,
} from '@arigato/shared';

import { buildMatchResult } from '../combat/match-result.js';
import { assignSpawn, listPlayers, teamSpawnOccupancy } from './room-state.js';
import { createInitialWeaponState, respawnPlayer } from './player.js';

/**
 * ホストが「試合開始」を押せる条件。
 * Day1 午後ではゆるい条件にしておく:
 *  - phase が lobby
 *  - 1 人以上参加（ソロ動作確認のため 1 でもOK）
 *  - 全員がチーム所属（必ず red/blue のいずれかなので true 固定）
 * Day2 でキャラ重複・準備完了チェックを足す前提。
 */
export function canStartMatch(state: RoomState): boolean {
  if (state.phase !== 'lobby' && state.phase !== 'finished') return false;
  const players = listPlayers(state);
  if (players.length < 1) return false;
  return players.every((p) => p.team === 'red' || p.team === 'blue');
}

/**
 * countdown フェーズに入る。matchStartMs は「playing に入る予定時刻」をセットしておく。
 */
export function transitionToCountdown(state: RoomState, nowMs: number): void {
  state.phase = 'countdown';
  state.matchStartMs = nowMs + COUNTDOWN_SECONDS * 1000;
}

/**
 * playing フェーズに入る。全プレイヤーを自チームのスポーンに配置し、無敵を付ける。
 */
export function transitionToPlaying(state: RoomState, nowMs: number): void {
  state.phase = 'playing';
  state.matchStartMs = nowMs;
  state.matchDurationMs = MATCH_DURATION_MS;
  state.teamKills = { red: 0, blue: 0 };

  for (const team of ['red', 'blue'] as const) {
    const occupied: ReturnType<typeof teamSpawnOccupancy> = [];
    for (const p of listPlayers(state)) {
      if (p.team !== team) continue;
      const spawn = assignSpawn(team, occupied);
      respawnPlayer(p, spawn, nowMs, SPAWN_INVINCIBLE_MS);
      occupied.push(spawn);
      // 統計はリセット。試合内通算なので。
      p.kills = 0;
      p.deaths = 0;
      p.assists = 0;
      p.headshots = 0;
      p.damageDealt = 0;
    }
  }
}

/**
 * countdown 中の残り秒数を算出（切り上げ）。0 になったら playing に遷移可能。
 */
export function countdownSecondsLeft(state: RoomState, nowMs: number): number {
  if (state.phase !== 'countdown') return 0;
  const remainMs = state.matchStartMs - nowMs;
  if (remainMs <= 0) return 0;
  return Math.ceil(remainMs / 1000);
}

/**
 * playing 中、試合残り時間 (ms)。負にはならない。
 */
export function matchTimeRemainingMs(state: RoomState, nowMs: number): number {
  if (state.phase !== 'playing') return state.matchDurationMs;
  const elapsed = nowMs - state.matchStartMs;
  return Math.max(0, state.matchDurationMs - elapsed);
}

/**
 * 試合が時間切れか？（playing → finished の遷移判定）
 * Day1 午後ではキル数による早期終了は実装しない。
 */
export function shouldFinishMatch(state: RoomState, nowMs: number): boolean {
  if (state.phase !== 'playing') return false;
  return matchTimeRemainingMs(state, nowMs) <= 0;
}

/**
 * finished フェーズへの遷移。
 * - phase を 'finished' に変更
 * - 試合結果 (finalResult) を構築して state に格納
 */
export function transitionToFinished(state: RoomState, _nowMs: number): void {
  state.phase = 'finished';
  state.finalResult = buildMatchResult(state);
}

/**
 * finished → lobby への遷移（再戦開始のため）。
 * - 全プレイヤーの戦績統計をリセット
 * - HP / 生存 / 無敵 / 弾薬 / リロードをリセット
 * - characterId と team は維持（再戦で同じキャラ/チームのまま）
 * - チームキルと finalResult もリセット
 */
export function transitionToLobby(state: RoomState): void {
  state.phase = 'lobby';
  state.teamKills = { red: 0, blue: 0 };
  state.finalResult = null;
  state.matchStartMs = 0;

  for (const p of listPlayers(state)) {
    p.kills = 0;
    p.deaths = 0;
    p.assists = 0;
    p.headshots = 0;
    p.damageDealt = 0;
    p.hp = PLAYER_INITIAL_HP;
    p.isAlive = true;
    p.isInvincible = false;
    p.invincibleUntilMs = 0;
    p.isReloading = false;
    p.reloadEndMs = 0;
    p.velocity = { x: 0, y: 0, z: 0 };
    p.weaponState = createInitialWeaponState();
  }
}

/**
 * 汎用フェーズ遷移ロガー用。tick ループ内で呼ぶ。
 */
export function transitionPhase(state: RoomState, next: RoomPhase, nowMs: number): void {
  switch (next) {
    case 'lobby':
      state.phase = 'lobby';
      break;
    case 'countdown':
      transitionToCountdown(state, nowMs);
      break;
    case 'playing':
      transitionToPlaying(state, nowMs);
      break;
    case 'finished':
      transitionToFinished(state, nowMs);
      break;
  }
}

/** tick 間隔 ms を返すヘルパ。constants.ts 由来。 */
export function tickIntervalMs(): number {
  return TICK_INTERVAL_MS;
}
