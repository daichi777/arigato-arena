import type { ClientHostShuffleTeams, PlayerId, Team } from '@arigato/shared';

import { sendError } from '../net/send-error.js';
import { listPlayers } from '../room/room-state.js';
import { requireHost, type HandlerContext } from './dispatch.js';

/**
 * ホストによるチーム振り分け。
 * - assignments があれば指定をそのまま採用（不明なIDは無視）。
 * - 無ければランダムシャッフルで red/blue 半々に分ける。
 * - lobby フェーズでのみ実行可。
 */
export function handleHostShuffleTeams(ctx: HandlerContext, message: ClientHostShuffleTeams): void {
  const { state } = ctx;
  if (!requireHost(ctx)) {
    sendError(ctx.sender, 'not_host', 'ホストのみ実行できます');
    return;
  }
  if (state.phase !== 'lobby') {
    sendError(ctx.sender, 'invalid_action', 'ロビーでのみ実行できます');
    return;
  }

  const assignments = message.assignments;
  if (assignments) {
    for (const [pid, team] of Object.entries(assignments) as Array<[PlayerId, Team]>) {
      const p = state.players[pid];
      if (p) {
        p.team = team;
      }
    }
  } else {
    // Fisher-Yates シャッフル → 前半 red / 後半 blue
    const ids = listPlayers(state).map((p) => p.id);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = ids[i]!;
      ids[i] = ids[j]!;
      ids[j] = tmp;
    }
    const half = Math.ceil(ids.length / 2);
    ids.forEach((id, idx) => {
      const p = state.players[id];
      if (p) {
        p.team = idx < half ? 'red' : 'blue';
      }
    });
  }

  ctx.onPhaseShouldRebroadcast();
}
