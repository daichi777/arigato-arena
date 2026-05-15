import type { ClientShoot } from '@arigato/shared';

import { processShot } from '../combat/hitscan.js';
import { sendError } from '../net/send-error.js';
import type { HandlerContext } from './dispatch.js';

/**
 * 発砲メッセージ受付（Day2-B）。
 *
 * フロー:
 *  1. 接続/フェーズ/生死/リロード/無敵中チェック
 *  2. レートリミッタで武器の連射上限を確認
 *  3. 弾薬を消費（在弾 0 なら無音で破棄）
 *  4. processShot に委譲して hitscan + HP/キル/リスポーン処理を実行
 *
 * サーバー権威の徹底:
 *  - クライアントから送られてくる ClientShoot.origin / direction は完全に無視
 *  - サーバー側で shooter.position + headHeight、shooter.yaw/pitch から再計算
 */
export function handleShoot(ctx: HandlerContext, message: ClientShoot): void {
  const { state, connId, nowMs, rateLimiter, respawnQueue, enqueueBroadcast } = ctx;
  const player = state.players[connId];
  if (!player) {
    sendError(ctx.sender, 'invalid_action', 'まだ join していません');
    return;
  }
  if (state.phase !== 'playing') {
    return;
  }
  if (!player.isAlive) {
    return;
  }
  if (player.isReloading) {
    return;
  }
  if (player.isInvincible) {
    // 無敵中の射撃は許容するゲームもあるが、本作はリスポーン直後の安全帯。
    // ここでは射撃自体は許可する方針（敵から守られるだけで反撃は可）。
  }

  const weapon = player.currentWeapon;
  if (!rateLimiter.allowShoot(connId, weapon, nowMs)) {
    return;
  }

  const slot = player.weaponState[weapon];
  if (slot.ammoInMag <= 0) {
    return;
  }
  slot.ammoInMag -= 1;
  slot.nextFireMs = nowMs;

  processShot(state, connId, message.shotId, respawnQueue, nowMs, enqueueBroadcast);

  ctx.logger.debug('shoot processed', {
    playerId: connId,
    shotId: message.shotId,
    weapon,
    ammoLeft: slot.ammoInMag,
  });
}
