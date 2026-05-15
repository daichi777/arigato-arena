import type { ClientReadyToggle } from '@arigato/shared';

import { sendError } from '../net/send-error.js';
import type { HandlerContext } from './dispatch.js';

/**
 * 準備完了トグル。
 *
 * 現状の PlayerState には ready フラグを持っていない（契約定義に未追加）。
 * Day1 午後では契約凍結維持のためフラグを足さず、受け取ったら無視に近い実装。
 * 将来 PlayerState に追加された際にここを書き換える。
 *
 * とはいえクライアントUI実装のため「受信は成功扱い」にしておく。
 */
export function handleReadyToggle(ctx: HandlerContext, _message: ClientReadyToggle): void {
  const { state, connId } = ctx;
  if (!state.players[connId]) {
    sendError(ctx.sender, 'invalid_action', 'まだ join していません');
    return;
  }
  if (state.phase !== 'lobby') {
    sendError(ctx.sender, 'invalid_action', 'ロビーでのみ準備状態を変更できます');
    return;
  }
  // Day1午後: noop。Day2でPlayerStateにreadyを足したらここで p.ready = message.ready する。
  ctx.onPhaseShouldRebroadcast();
}
