import type {
  MatchResult,
  PlayerId,
  PlayerMatchStat,
  PlayerState,
  RoomState,
  Team,
} from '@arigato/shared';

import { listPlayers } from '../room/room-state.js';

/**
 * 試合結果を集計する純粋関数。
 *
 * - winnerTeam: teamKills を比較（同点なら 'draw'）
 * - playerStats: 全プレイヤーの戦績を出力（id ASC で安定ソート）
 * - mvpPlayerId: kills DESC → headshots DESC → damageDealt DESC → id ASC の優先順
 *   参加者が 0 のときは空文字を返す（呼び出し側で破棄前提）。
 */
export function buildMatchResult(state: RoomState): MatchResult {
  const players = listPlayers(state);

  const teamKills: Record<Team, number> = {
    red: state.teamKills.red,
    blue: state.teamKills.blue,
  };

  const winnerTeam: Team | 'draw' =
    teamKills.red > teamKills.blue
      ? 'red'
      : teamKills.blue > teamKills.red
        ? 'blue'
        : 'draw';

  const playerStats: PlayerMatchStat[] = players
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((p) => ({
      playerId: p.id,
      name: p.name,
      characterId: p.characterId,
      team: p.team,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      headshots: p.headshots,
      damageDealt: p.damageDealt,
    }));

  const mvpPlayerId: PlayerId = pickMvp(players);

  return {
    winnerTeam,
    teamKills,
    mvpPlayerId,
    playerStats,
  };
}

/**
 * MVP 選出。タイブレーク順:
 *   kills DESC
 *   → headshots DESC
 *   → damageDealt DESC
 *   → id ASC
 */
function pickMvp(players: PlayerState[]): PlayerId {
  if (players.length === 0) return '';
  const sorted = players.slice().sort((a, b) => {
    if (a.kills !== b.kills) return b.kills - a.kills;
    if (a.headshots !== b.headshots) return b.headshots - a.headshots;
    if (a.damageDealt !== b.damageDealt) return b.damageDealt - a.damageDealt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return sorted[0]!.id;
}
