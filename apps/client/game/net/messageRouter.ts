import type { ServerMessage } from '@arigato/shared';
import { tryParseServerMessage, tryParseServerMessageJson } from '@arigato/shared';
import type { GameServerMessage } from './gameMessages';

/**
 * renderer が試合中に処理するメッセージタイプの集合。
 * lobby 系（welcome/room_snapshot/error）は lobby agent 側に流す前提。
 */
const GAME_MESSAGE_TYPES = new Set<ServerMessage['type']>([
  'snapshot',
  'hit',
  'kill_feed',
  'countdown',
  'match_end',
]);

/**
 * 受信した ServerMessage が renderer 対象か判定するナローイング関数。
 */
export function isGameMessage(msg: ServerMessage): msg is GameServerMessage {
  return GAME_MESSAGE_TYPES.has(msg.type);
}

/**
 * 生の文字列 / 任意値を ServerMessage としてパースし、
 * renderer 対象のメッセージだけを取り出すルータ。
 *
 * - JSON parse 失敗・スキーマ違反は null
 * - lobby 側メッセージも null（呼び出し側で lobby に流す責務がある）
 */
export function routeServerMessage(raw: unknown): GameServerMessage | null {
  let parsed: ServerMessage | null;
  if (typeof raw === 'string') {
    parsed = tryParseServerMessageJson(raw);
  } else {
    parsed = tryParseServerMessage(raw);
  }
  if (!parsed) return null;
  return isGameMessage(parsed) ? parsed : null;
}
