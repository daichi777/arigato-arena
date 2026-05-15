import type { ClientInput } from '@arigato/shared';

import { sendError } from '../net/send-error.js';
import { WEAPONS } from '@arigato/shared';
import type { HandlerContext } from './dispatch.js';

/**
 * 入力受付。
 * - lobby/finished では破棄（試合に影響しないため軽くエラーは返さない方針もあるが
 *   明示的にエラーを返したほうがクライアント実装時に気づける）。
 * - レート制限を超えたら rate_limited エラーで返す。
 * - 武器切替は別レート制限。
 *
 * 実際の物理適用は tickStep で行う。ここでは inputs に積むだけ。
 */
export function handleInput(ctx: HandlerContext, message: ClientInput): void {
  const { state, connId, nowMs, inputs, rateLimiter } = ctx;
  const player = state.players[connId];
  if (!player) {
    sendError(ctx.sender, 'invalid_action', 'まだ join していません');
    return;
  }

  // フェーズ判定: playing と countdown のみ受け付ける。
  // countdown でも視点回転は許容したいので受け取って tick-step 側で吸収する。
  if (state.phase !== 'playing' && state.phase !== 'countdown') {
    return;
  }

  if (!rateLimiter.allowInput(connId, nowMs)) {
    // 静かに破棄（rate_limited を毎tick送ると逆にうるさい）
    return;
  }

  // 武器切替はクールダウン適用
  let input = message.input;
  if (input.weaponSwitch !== null) {
    if (!rateLimiter.allowWeaponSwitch(connId, nowMs)) {
      input = { ...input, weaponSwitch: null };
    } else {
      // 武器変更を即時反映（弾薬・nextFireMs は維持）
      if (player.currentWeapon !== input.weaponSwitch) {
        player.currentWeapon = input.weaponSwitch;
        // 切替中はリロードキャンセル
        player.isReloading = false;
        player.reloadEndMs = 0;
      }
    }
  }

  // リロード処理（立ち上がりエッジ）
  if (input.reload && !player.isReloading) {
    const cfg = WEAPONS[player.currentWeapon];
    const slot = player.weaponState[player.currentWeapon];
    if (slot.ammoInMag < cfg.magSize) {
      player.isReloading = true;
      player.reloadEndMs = nowMs + cfg.reloadTimeMs;
    }
  }
  // リロード完了
  if (player.isReloading && nowMs >= player.reloadEndMs) {
    const cfg = WEAPONS[player.currentWeapon];
    player.weaponState[player.currentWeapon].ammoInMag = cfg.magSize;
    player.isReloading = false;
    player.reloadEndMs = 0;
  }

  inputs.push(connId, input);
}
