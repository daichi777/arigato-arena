import type { AudioManager } from './AudioManager';

/**
 * 音声ファイルパス定数（Phase 3 B1）。
 *
 * asset agent が `apps/client/public/assets/audio/sfx/` に配置するファイルと一致。
 * 未配置でも AudioManager.preload() は warn のみで握りつぶすため安全。
 */
const SFX_BASE = '/assets/audio/sfx';

export const SOUND_URLS = {
  ar_fire: `${SFX_BASE}/ar_fire.mp3`,
  sg_fire: `${SFX_BASE}/sg_fire.mp3`,
  smg_fire: `${SFX_BASE}/smg_fire.mp3`,
  kill: `${SFX_BASE}/kill.mp3`,
  hurt: `${SFX_BASE}/hurt.mp3`,
  hitmark: `${SFX_BASE}/hitmark.mp3`,
  reload: `${SFX_BASE}/reload.mp3`,
  countdown_tick: `${SFX_BASE}/countdown_tick.mp3`,
  countdown_go: `${SFX_BASE}/countdown_go.mp3`,
} as const;

/** preload リスト（全件） */
export const PRELOAD_LIST: Array<{ name: string; url: string }> = Object.entries(
  SOUND_URLS,
).map(([name, url]) => ({ name, url }));

/**
 * 全音声ファイルを preload する。
 * AudioManager.init() の後に呼ぶこと。
 * 失敗は AudioManager 側で console.warn のみ。
 */
export async function preloadAll(manager: AudioManager): Promise<void> {
  await Promise.all(PRELOAD_LIST.map(({ name, url }) => manager.preload(name, url)));
}
