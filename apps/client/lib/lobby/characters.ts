import type { CharacterId } from '@arigato/shared';

/** ロビー画面で表示するキャラメタ情報。 */
export interface CharacterMeta {
  /** shared/CharacterId と同期する識別子。 */
  id: CharacterId;
  /** ロビー表示用の通称（ひらがな/英字混在）。 */
  displayName: string;
  /** ローマ字フルネーム（補助表示）。 */
  romaji: string;
  /** 一言で識別できるトレイト。 */
  trait: string;
  /** プレースホルダー画像パス（public/ 配下）。 */
  imagePath: string;
}

/**
 * 9キャラ定義（`docs/member-profiles-template.md` と同期）。
 * 並び順はロビーグリッドの表示順（左上→右下）。
 */
export const CHARACTERS: readonly CharacterMeta[] = [
  { id: 'k2', displayName: 'k2', romaji: 'Yoshikawa Ryo', trait: '宇宙人', imagePath: '/characters/k2.webp' },
  { id: 'hyouga', displayName: 'ひょうが', romaji: 'Hiromori Hyouga', trait: '知的・冷静', imagePath: '/characters/hyouga.webp' },
  { id: 'shuto', displayName: 'しゅーと', romaji: 'Nakamura Shuto', trait: '温和な好青年', imagePath: '/characters/shuto.webp' },
  { id: 'daichi', displayName: 'だいち', romaji: 'Nakata Daichi', trait: '兄貴肌', imagePath: '/characters/daichi.webp' },
  { id: 'katsuya', displayName: 'かつや', romaji: 'Takahashi Katsuya', trait: 'クール', imagePath: '/characters/katsuya.webp' },
  { id: 'tsuchiga', displayName: 'つちが', romaji: 'Tsuchiga Koushi', trait: '思慮深い', imagePath: '/characters/tsuchiga.webp' },
  { id: 'hide', displayName: 'ひで', romaji: 'Mifuji Hideya', trait: '元気・ノリよし', imagePath: '/characters/hide.webp' },
  { id: 'yugo', displayName: 'ゆうご', romaji: 'Nishimoto Yugo', trait: '爽やか・知的', imagePath: '/characters/yugo.webp' },
  { id: 'iru', displayName: 'あいる', romaji: 'Matsuo Iru', trait: 'アーティスト', imagePath: '/characters/iru.webp' },
] as const;

/** id でメタ情報を引く（不正IDは undefined）。 */
export function findCharacter(id: CharacterId | string | null | undefined): CharacterMeta | undefined {
  if (!id) return undefined;
  return CHARACTERS.find((c) => c.id === id);
}

/** 未選択時のフォールバック表示名。 */
export function characterDisplayName(id: CharacterId | string | null | undefined): string {
  return findCharacter(id)?.displayName ?? '未選択';
}
