/**
 * shot ID 等の汎用 ID 生成ヘルパ。
 *
 * Cloudflare Workers 環境では crypto.randomUUID が利用可能。
 * 念のため fallback も用意する。
 */

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // フォールバック: 衝突確率は低いが暗号学的強度はない簡易 ID。
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${time}-${rand}`;
}
