import { PlayerNameSchema } from '@arigato/shared';

const STORAGE_KEY = 'arigato:player_name';

/** Zod 検証 + 前後空白カットで安全な表示名を返す。失敗時は null。 */
export function normalizePlayerName(raw: string): string | null {
  const trimmed = raw.trim();
  const result = PlayerNameSchema.safeParse(trimmed);
  return result.success ? result.data : null;
}

/** localStorage から名前を取り出す。Zod 検証に通らない値は無視。 */
export function loadStoredPlayerName(): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return '';
    return normalizePlayerName(raw) ?? '';
  } catch {
    return '';
  }
}

/** localStorage に名前を保存。検証 OK の値だけ書き込む。 */
export function saveStoredPlayerName(name: string): void {
  if (typeof window === 'undefined') return;
  const ok = normalizePlayerName(name);
  if (!ok) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, ok);
  } catch {
    // quota / private mode 等は黙って無視
  }
}

/** localStorage の名前を消去（テスト・サインアウト用）。 */
export function clearStoredPlayerName(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}
