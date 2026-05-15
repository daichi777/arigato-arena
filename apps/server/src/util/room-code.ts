import { ROOM_CODE_LENGTH } from '@arigato/shared';

// ルームコードに使う文字集合。1/I/O/0 はあえて含める。
// （社内利用前提で覚えやすさより衝突回避を優先）
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * 6 桁英数大文字のルームコードを生成する。
 * Cloudflare Workers でも crypto.getRandomValues は利用可能。
 */
export function generateRoomCode(length: number = ROOM_CODE_LENGTH): string {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let code = '';
  for (let i = 0; i < length; i += 1) {
    const idx = buf[i]! % ALPHABET.length;
    code += ALPHABET[idx]!;
  }
  return code;
}
