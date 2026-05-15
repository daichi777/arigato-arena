'use client';

import type { PlayerId, PlayerState, Team } from '@arigato/shared';
import { characterDisplayName } from '@/lib/lobby/characters';

interface Props {
  title: string;
  team: Team;
  players: PlayerState[];
  myPlayerId: PlayerId | null;
}

const TEAM_BORDER: Record<Team, string> = {
  red: 'border-accent-redDark',
  blue: 'border-accent-blueDark',
};

const TEAM_ACCENT: Record<Team, string> = {
  red: 'text-accent-red',
  blue: 'text-accent-blue',
};

export function PlayerList({ title, team, players, myPlayerId }: Props) {
  return (
    <div className={`rounded-lg border bg-ink-900 ${TEAM_BORDER[team]}`}>
      <header className="flex items-center justify-between px-3 py-2">
        <p className={`font-display tracking-[0.4em] ${TEAM_ACCENT[team]}`}>{title}</p>
        <span className="text-xs text-ink-400">{players.length} / 5</span>
      </header>
      <ul className="divide-y divide-ink-800">
        {players.length === 0 ? (
          <li className="px-3 py-3 text-xs text-ink-500">参加者待ち...</li>
        ) : (
          players.map((p) => (
            <li
              key={p.id}
              className={`flex items-center justify-between px-3 py-2 text-sm ${
                p.id === myPlayerId ? 'bg-ink-800' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink-100">{p.name}</span>
                {p.id === myPlayerId && (
                  <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-ink-300">
                    you
                  </span>
                )}
              </div>
              <span className="text-xs text-ink-400">
                {characterDisplayName(p.characterId)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
