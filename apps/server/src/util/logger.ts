/**
 * サーバーログの最小ラッパ。
 * - Cloudflare Workers では console.log が標準で stderr 相当に出る。
 * - tick ループ側で大量に呼ぶため interface は最小に保つ。
 * - 将来 structured logging に差し替えるならここを変える。
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** ルーム識別子。複数 Room を並行運用したときに区別するための prefix。 */
  roomCode?: string;
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  withRoom(roomCode: string): Logger;
}

function format(level: LogLevel, opts: LoggerOptions, message: string, data?: Record<string, unknown>): string {
  const prefix = opts.roomCode ? `[${opts.roomCode}]` : '';
  const tail = data ? ` ${JSON.stringify(data)}` : '';
  return `${prefix}[${level}] ${message}${tail}`;
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  return {
    debug(message, data) {
      console.log(format('debug', opts, message, data));
    },
    info(message, data) {
      console.log(format('info', opts, message, data));
    },
    warn(message, data) {
      console.warn(format('warn', opts, message, data));
    },
    error(message, data) {
      console.error(format('error', opts, message, data));
    },
    withRoom(roomCode) {
      return createLogger({ ...opts, roomCode });
    },
  };
}
