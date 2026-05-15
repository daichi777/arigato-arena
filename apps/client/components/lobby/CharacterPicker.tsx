'use client';

import Image from 'next/image';
import type { CharacterId, PlayerState } from '@arigato/shared';

import { CHARACTERS } from '@/lib/lobby/characters';
import { sendClientMessage } from '@/lib/lobby/connection';
import { buildSelectCharacterMessage } from '@/lib/lobby/messages';

interface Props {
  myPlayer: PlayerState | null;
}

/**
 * キャラクター選択グリッド（9枚、重複可能）。
 * クリックで select_character を送信する。
 */
export function CharacterPicker({ myPlayer }: Props) {
  const selected: CharacterId | null = myPlayer?.characterId ?? null;

  const onPick = (id: CharacterId) => {
    sendClientMessage(buildSelectCharacterMessage(id));
  };

  return (
    <div className="rounded-lg border border-ink-800 bg-ink-900 p-4">
      <header className="mb-3 flex items-center justify-between">
        <p className="font-display tracking-[0.4em] text-ink-100">CHARACTER</p>
        <p className="text-xs text-ink-400">同じキャラを複数人が選べます</p>
      </header>
      <div className="grid grid-cols-3 gap-3">
        {CHARACTERS.map((c) => {
          const isSelected = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className={`group relative overflow-hidden rounded-md border bg-ink-950 transition ${
                isSelected
                  ? 'border-accent-red shadow-glow'
                  : 'border-ink-800 hover:border-accent-blue'
              }`}
            >
              <div className="relative aspect-[3/4] w-full">
                <Image
                  src={c.imagePath}
                  alt={c.displayName}
                  fill
                  sizes="(max-width: 1024px) 30vw, 200px"
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent px-2 py-1 text-left">
                <p className="text-sm font-semibold text-ink-100">{c.displayName}</p>
                <p className="text-[10px] uppercase tracking-widest text-ink-400">{c.trait}</p>
              </div>
              {isSelected && (
                <span className="absolute right-1 top-1 rounded bg-accent-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-ink-100">
                  選択中
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
