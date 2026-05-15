import type { ParsedClientMessage, PlayerId, RoomState, ServerMessage } from '@arigato/shared';
import type * as Party from 'partykit/server';

import type { RespawnQueue } from '../combat/respawn.js';
import type { InputBuffer } from '../input/input-buffer.js';
import type { RateLimiter } from '../input/rate-limiter.js';
import type { Logger } from '../util/logger.js';
import { handleJoin } from './join.js';
import { handleSelectCharacter } from './select-character.js';
import { handleReadyToggle } from './ready-toggle.js';
import { handleHostShuffleTeams } from './host-shuffle.js';
import { handleHostStartMatch } from './host-start.js';
import { handleInput } from './input.js';
import { handleShoot } from './shoot.js';

/**
 * ハンドラ共通コンテキスト。
 *
 * - state: ルーム状態（破壊的に更新可）
 * - connId: 接続ID（= playerId として扱う。partyserver は WebSocket ごとに一意なIDを振る）
 * - sender: 当該クライアント接続（個別 error 返答用）
 * - nowMs: メッセージ受信時刻
 * - inputs: 入力バッファ
 * - rateLimiter: レート制限
 * - respawnQueue: 死亡 → リスポーン予約用キュー（hitscan で push、tickStep で drain）
 * - enqueueBroadcast: onMessage の最後に全員へ flush される ServerMessage キューに追加
 */
export interface HandlerContext {
  state: RoomState;
  connId: PlayerId;
  sender: Party.Connection;
  nowMs: number;
  inputs: InputBuffer;
  rateLimiter: RateLimiter;
  respawnQueue: RespawnQueue;
  logger: Logger;
  /** ホスト切断時など、外部から呼ばれるイベント通知 */
  onPhaseShouldRebroadcast: () => void;
  /** ハンドラ内から broadcast したいメッセージを積む。onMessage 末尾で flush される */
  enqueueBroadcast: (msg: ServerMessage) => void;
}

/**
 * パース済み ClientMessage を type で振り分ける。
 * - 各ハンドラは context + message を受け取り state を更新する。
 * - 不正なホスト操作などはハンドラ内で sendError して return する設計。
 */
export function dispatch(ctx: HandlerContext, message: ParsedClientMessage): void {
  switch (message.type) {
    case 'join':
      handleJoin(ctx, message);
      return;
    case 'select_character':
      handleSelectCharacter(ctx, message);
      return;
    case 'ready_toggle':
      handleReadyToggle(ctx, message);
      return;
    case 'host_shuffle_teams':
      handleHostShuffleTeams(ctx, message);
      return;
    case 'host_start_match':
      handleHostStartMatch(ctx, message);
      return;
    case 'input':
      handleInput(ctx, message);
      return;
    case 'shoot':
      handleShoot(ctx, message);
      return;
  }
}

/** ホスト権限が必要なメッセージで使う共通チェック。 */
export function requireHost(ctx: HandlerContext): boolean {
  return ctx.state.hostId === ctx.connId;
}
