import { TICK_INTERVAL_MS } from '@arigato/shared';

/**
 * tick 時刻管理ユーティリティ。
 *
 * - サーバー起動時刻を 0ms と見立てた「ゲーム内 ms」も提供できるが
 *   現状は Date.now() ベースで十分（tick数は state.serverTick で持つ）。
 * - alarm() 駆動の tick で次回起動時刻を決めるための補助。
 */

export interface Clock {
  now(): number;
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

/**
 * 次の tick 境界時刻を返す。
 *
 * 例) lastTickMs = 1000, intervalMs = 50 → 1050
 * lastTickMs が 0/未定義（初回）なら now を基準に次の境界を作る。
 */
export function nextTickDueMs(lastTickMs: number, nowMs: number, intervalMs: number = TICK_INTERVAL_MS): number {
  if (lastTickMs <= 0) {
    return nowMs + intervalMs;
  }
  return lastTickMs + intervalMs;
}

/**
 * ある時刻が指定 tick 周期に対してどれくらい遅延しているか。
 * 値が正なら遅延、負なら早すぎ。
 */
export function tickDriftMs(scheduledMs: number, actualMs: number): number {
  return actualMs - scheduledMs;
}
