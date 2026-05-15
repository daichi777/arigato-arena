import {
  tryParseServerMessageJson,
  type ClientMessage,
  type ParsedServerMessage,
} from '@arigato/shared';
import type {
  CharacterId,
  ClientHostShuffleTeams,
  ClientHostStartMatch,
  ClientJoinRoom,
  ClientReadyToggle,
  ClientSelectCharacter,
  PlayerId,
  Team,
} from '@arigato/shared';

/**
 * 試合中メッセージかどうか。lobby は内部状態としては保持せず、
 * `subscribeGameMessages` 経由で renderer に流す。
 */
export type GameOnlyServerMessage = Extract<
  ParsedServerMessage,
  { type: 'snapshot' | 'hit' | 'kill_feed' }
>;

/** lobby 自身がハンドルするロビー系メッセージ。 */
export type LobbyServerMessage = Exclude<ParsedServerMessage, GameOnlyServerMessage>;

/** ServerMessage を game/lobby に振り分けるための判定。 */
export function isGameOnlyMessage(msg: ParsedServerMessage): msg is GameOnlyServerMessage {
  return msg.type === 'snapshot' || msg.type === 'hit' || msg.type === 'kill_feed';
}

/** WebSocket data の生表現を ParsedServerMessage に正規化。 */
export function parseServerMessageFromEvent(data: unknown): ParsedServerMessage | null {
  if (typeof data === 'string') {
    return tryParseServerMessageJson(data);
  }
  // ArrayBuffer / Blob は MVP では未対応（JSON 文字列固定）
  return null;
}

// ============================================================================
// クライアント → サーバー送信ヘルパー
// 送信側はサーバー側 Zod 検証に任せる前提で型のみ強制。
// ============================================================================

export function buildJoinMessage(name: string, asHost: boolean): ClientJoinRoom {
  return { type: 'join', name, asHost };
}

export function buildSelectCharacterMessage(characterId: CharacterId): ClientSelectCharacter {
  return { type: 'select_character', characterId };
}

export function buildReadyToggleMessage(ready: boolean): ClientReadyToggle {
  return { type: 'ready_toggle', ready };
}

export function buildHostShuffleTeamsMessage(
  assignments?: Record<PlayerId, Team>,
): ClientHostShuffleTeams {
  return assignments
    ? { type: 'host_shuffle_teams', assignments }
    : { type: 'host_shuffle_teams' };
}

export function buildHostStartMatchMessage(): ClientHostStartMatch {
  return { type: 'host_start_match' };
}

/** ClientMessage を WebSocket 送信用 JSON 文字列に変換。 */
export function encodeClientMessage(msg: ClientMessage): string {
  return JSON.stringify(msg);
}
