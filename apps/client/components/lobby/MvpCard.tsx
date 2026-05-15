'use client';

import type { PlayerMatchStat, Team } from '@arigato/shared';

import { findCharacter } from '@/lib/lobby/characters';

interface Props {
  mvp: PlayerMatchStat;
}

const TEAM_LABEL: Record<Team, string> = { red: 'RED', blue: 'BLUE' };
const TEAM_TEXT_CLASS: Record<Team, string> = {
  red: 'text-accent-red',
  blue: 'text-accent-blue',
};
const TEAM_BORDER_CLASS: Record<Team, string> = {
  red: 'border-accent-red shadow-glow',
  blue: 'border-accent-blue shadow-glowBlue',
};

/**
 * MVP プレイヤーを王冠アイコン付きで強調表示するカード。
 * - キャラクター画像（large）
 * - 表示名 + キャラ名（romaji）
 * - K数 / HS数 / Damage を強調表示
 */
export function MvpCard({ mvp }: Props) {
  const character = findCharacter(mvp.characterId);
  const imagePath = character?.imagePath ?? `/characters/${mvp.characterId}.webp`;
  const characterDisplayName = character?.displayName ?? mvp.characterId;
  const characterRomaji = character?.romaji ?? '';

  return (
    <section
      className={`relative overflow-hidden rounded-xl border-2 bg-ink-800 p-6 ${TEAM_BORDER_CLASS[mvp.team]}`}
    >
      <div className="absolute right-4 top-3 select-none text-3xl" aria-hidden="true">
        👑
      </div>
      <p className="font-display text-xs tracking-[0.5em] text-ink-400">MVP</p>

      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePath}
            alt={`${mvp.name} (${characterDisplayName})`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="flex-1">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-3xl tracking-widest text-ink-100">{mvp.name}</h2>
            <span className={`font-display text-xs tracking-[0.3em] ${TEAM_TEXT_CLASS[mvp.team]}`}>
              {TEAM_LABEL[mvp.team]}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-300">
            {characterDisplayName}
            {characterRomaji && (
              <span className="ml-2 text-xs text-ink-500">{characterRomaji}</span>
            )}
          </p>

          <dl className="mt-4 grid grid-cols-3 gap-3">
            <StatBox label="KILLS" value={mvp.kills} accentClass={TEAM_TEXT_CLASS[mvp.team]} />
            <StatBox label="HEADSHOTS" value={mvp.headshots} accentClass="text-amber-400" />
            <StatBox label="DAMAGE" value={mvp.damageDealt} accentClass="text-ink-100" />
          </dl>
        </div>
      </div>
    </section>
  );
}

function StatBox({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: number;
  accentClass: string;
}) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-900 px-3 py-2">
      <dt className="font-display text-[10px] tracking-[0.3em] text-ink-500">{label}</dt>
      <dd className={`font-mono text-2xl ${accentClass}`}>{value}</dd>
    </div>
  );
}
