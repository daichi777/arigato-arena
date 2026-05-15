import type { ClientHostStartMatch } from '@arigato/shared';

import { sendError } from '../net/send-error.js';
import { canStartMatch, transitionToCountdown, transitionToLobby } from '../room/phase.js';
import { requireHost, type HandlerContext } from './dispatch.js';

/**
 * 試合開始。ホスト権限 + canStartMatch を満たせば countdown へ遷移。
 * 実際に playing に入るのは tickStep 内（カウントダウンが 0 になったとき）。
 *
 * finished フェーズから呼ばれた場合は再戦扱いとして、先に lobby にリセットしてから countdown へ遷移する。
 */
export function handleHostStartMatch(ctx: HandlerContext, _message: ClientHostStartMatch): void {
  if (!requireHost(ctx)) {
    sendError(ctx.sender, 'not_host', 'ホストのみ実行できます');
    return;
  }
  if (!canStartMatch(ctx.state)) {
    sendError(ctx.sender, 'invalid_action', '開始条件を満たしていません');
    return;
  }
  if (ctx.state.phase === 'finished') {
    transitionToLobby(ctx.state);
  }
  transitionToCountdown(ctx.state, ctx.nowMs);
  ctx.logger.info('match countdown started', { matchStartMs: ctx.state.matchStartMs });
  ctx.onPhaseShouldRebroadcast();
}
