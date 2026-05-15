import type { ServerError, ServerErrorCode } from '@arigato/shared';
import type * as Party from 'partykit/server';

import { sendTo } from './broadcast.js';

/**
 * クライアントに error メッセージを返す。
 * 接続は維持。フェーズ違反やレート違反など軽微なエラー専用。
 */
export function sendError(
  connection: Party.Connection,
  code: ServerErrorCode,
  message: string,
): void {
  const payload: ServerError = { type: 'error', code, message };
  sendTo(connection, payload);
}
