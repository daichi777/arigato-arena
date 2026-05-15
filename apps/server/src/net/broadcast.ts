import type { ServerMessage } from '@arigato/shared';
import type * as Party from 'partykit/server';

/** WebSocket.OPEN === 1 */
const WS_OPEN = 1;

/**
 * 全接続にメッセージを broadcast する薄いラッパ。
 * - メッセージは ServerMessage 型のみ許可（不正なオブジェクト混入を防ぐ）。
 * - close 済みコネクションへの送信を回避するため、明示的に getConnections を回す。
 */
export function broadcast(room: Party.Room, message: ServerMessage, without?: string[]): void {
  const payload = JSON.stringify(message);
  const skip = new Set(without);
  for (const conn of room.getConnections()) {
    if (skip.has(conn.id)) continue;
    if (conn.readyState !== WS_OPEN) continue;
    try {
      conn.send(payload);
    } catch {
      // close レース等で送信に失敗しても tick を止めない
    }
  }
}

/** 単一接続だけに送信。close 済みなら無視。 */
export function sendTo(connection: Party.Connection, message: ServerMessage): void {
  if (connection.readyState !== WS_OPEN) return;
  try {
    connection.send(JSON.stringify(message));
  } catch {
    // close レースは無視
  }
}
