import type { PlayerMatchStat } from '@arigato/shared';

/**
 * 試合終了時の MVP を算出する。
 *
 * タイブレーク順:
 *   1. kills           DESC
 *   2. headshots       DESC
 *   3. damageDealt     DESC
 *   4. playerId        ASC（辞書順、決定性確保用）
 *
 * - stats が空配列のときは null を返す。
 * - 入力配列を破壊しない（コピー後にソート）。
 */
export function findMvp(stats: PlayerMatchStat[]): PlayerMatchStat | null {
  if (stats.length === 0) return null;
  const sorted = [...stats].sort((a, b) => {
    if (a.kills !== b.kills) return b.kills - a.kills;
    if (a.headshots !== b.headshots) return b.headshots - a.headshots;
    if (a.damageDealt !== b.damageDealt) return b.damageDealt - a.damageDealt;
    return a.playerId.localeCompare(b.playerId);
  });
  return sorted[0] ?? null;
}
