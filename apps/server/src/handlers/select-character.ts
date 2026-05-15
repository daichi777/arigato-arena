import type { ClientSelectCharacter } from '@arigato/shared';

import { sendError } from '../net/send-error.js';
import type { HandlerContext } from './dispatch.js';

/**
 * キャラ選択。
 * - phase が lobby のときのみ受付。
 * - 同じチームの他プレイヤーと重複してもOK（9キャラ < 10人なので避けられない）。
 * - 試合中・カウントダウン中は変更不可。
 */
export function handleSelectCharacter(ctx: HandlerContext, message: ClientSelectCharacter): void {
  const { state, connId } = ctx;
  const player = state.players[connId];
  if (!player) {
    sendError(ctx.sender, 'invalid_action', 'まだ join していません');
    return;
  }
  if (state.phase !== 'lobby') {
    sendError(ctx.sender, 'invalid_action', 'ロビーでのみキャラを変更できます');
    return;
  }
  player.characterId = message.characterId;
  ctx.onPhaseShouldRebroadcast();
}
