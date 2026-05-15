import { RoomCodeSchema } from '@arigato/shared';
import type { RoomCode } from '@arigato/shared';

/**
 * 紛らわしい文字 (0, O, 1, I) を除いた 32 文字。
 * 大文字英字 + 数字、視認性重視。
 */
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** {@link generateRoomCode} の長さ既定値（shared 側 `ROOM_CODE_LENGTH` と一致）。 */
const ROOM_CODE_DEFAULT_LENGTH = 6;

/**
 * 暗号論的乱数で 6 桁ルームコードを生成し、Zod で再検証して返す。
 * `crypto.getRandomValues` が無い環境では Math.random フォールバック。
 */
export function generateRoomCode(length: number = ROOM_CODE_DEFAULT_LENGTH): RoomCode {
  const alphabet = ROOM_CODE_ALPHABET;
  const out = new Array<string>(length);
  const rand = getRandomBytes(length);
  for (let i = 0; i < length; i += 1) {
    const v = rand[i] ?? 0;
    out[i] = alphabet[v % alphabet.length] ?? alphabet[0]!;
  }
  const code = out.join('');
  return RoomCodeSchema.parse(code);
}

/**
 * 任意文字列がルームコード形式かを判定し、正規化された RoomCode を返す。
 * - 前後の空白を除去
 * - 小文字を大文字へ
 * - O→0 / I→1 などの誤入力補正は行わない（紛らわしい文字は最初から含まない）
 */
export function normalizeRoomCode(raw: string): RoomCode | null {
  const trimmed = raw.trim().toUpperCase();
  const result = RoomCodeSchema.safeParse(trimmed);
  return result.success ? result.data : null;
}

function getRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  const g: Crypto | undefined =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;
  if (g && typeof g.getRandomValues === 'function') {
    g.getRandomValues(buf);
    return buf;
  }
  for (let i = 0; i < n; i += 1) {
    buf[i] = Math.floor(Math.random() * 256);
  }
  return buf;
}
