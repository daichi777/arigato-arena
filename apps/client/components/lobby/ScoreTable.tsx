'use client';

import { useMemo } from 'react';
import type { PlayerId, PlayerMatchStat, Team } from '@arigato/shared';

import { findCharacter } from '@/lib/lobby/characters';

interface Props {
  stats: PlayerMatchStat[];
  myPlayerId: PlayerId | null;
}

const TEAM_LABEL: Record<Team, string> = { red: 'RED', blue: 'BLUE' };
const TEAM_BORDER_CLASS: Record<Team, string> = {
  red: 'border-l-4 border-l-accent-red',
  blue: 'border-l-4 border-l-accent-blue',
};
const TEAM_HEADER_CLASS: Record<Team, string> = {
  red: 'text-accent-red',
  blue: 'text-accent-blue',
};

/**
 * チーム別 2 カラムスコア表。
 * - 各チームを kills DESC → headshots DESC → damageDealt DESC でソート
 * - 自分の行はハイライト
 * - チーム色枠（左ボーダー）でチーム識別
 */
export function ScoreTable({ stats, myPlayerId }: Props) {
  const { redStats, blueStats } = useMemo(() => {
    const sorted = [...stats].sort((a, b) => {
      if (a.kills !== b.kills) return b.kills - a.kills;
      if (a.headshots !== b.headshots) return b.headshots - a.headshots;
      return b.damageDealt - a.damageDealt;
    });
    return {
      redStats: sorted.filter((s) => s.team === 'red'),
      blueStats: sorted.filter((s) => s.team === 'blue'),
    };
  }, [stats]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TeamColumn team="red" stats={redStats} myPlayerId={myPlayerId} />
      <TeamColumn team="blue" stats={blueStats} myPlayerId={myPlayerId} />
    </div>
  );
}

interface TeamColumnProps {
  team: Team;
  stats: PlayerMatchStat[];
  myPlayerId: PlayerId | null;
}

function TeamColumn({ team, stats, myPlayerId }: TeamColumnProps) {
  return (
    <div className={`rounded-lg bg-ink-900 ${TEAM_BORDER_CLASS[team]}`}>
      <header
        className={`flex items-center justify-between px-4 py-3 font-display tracking-[0.4em] ${TEAM_HEADER_CLASS[team]}`}
      >
        <span className="text-sm">{TEAM_LABEL[team]} TEAM</span>
        <span className="text-[10px] text-ink-500">K / D / A / HS / DMG</span>
      </header>
      <ul className="divide-y divide-ink-800">
        {stats.length === 0 ? (
          <li className="px-4 py-3 text-xs text-ink-500">プレイヤー無し</li>
        ) : (
          stats.map((s) => (
            <ScoreRow key={s.playerId} stat={s} isMe={s.playerId === myPlayerId} />
          ))
        )}
      </ul>
    </div>
  );
}

function ScoreRow({ stat, isMe }: { stat: PlayerMatchStat; isMe: boolean }) {
  const character = findCharacter(stat.characterId);
  const imagePath = character?.imagePath ?? `/characters/${stat.characterId}.webp`;
  const charLabel = character?.displayName ?? stat.characterId;

  return (
    <li
      className={`flex items-center gap-3 px-4 py-2 text-sm ${
        isMe ? 'bg-ink-800/80 ring-1 ring-inset ring-ink-600' : ''
      }`}
    >
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagePath}
          alt={charLabel}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className={`font-medium ${isMe ? 'text-ink-100' : 'text-ink-200'}`}>{stat.name}</span>
          {isMe && (
            <span className="ml-2 rounded bg-ink-700 px-1.5 py-0.5 font-display text-[10px] tracking-widest text-ink-100">
              YOU
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-ink-500">{charLabel}</p>
      </div>

      <div className="font-mono text-ink-200 tabular-nums">
        <span className="text-ink-100">{stat.kills}</span>
        <span className="text-ink-500"> / </span>
        <span>{stat.deaths}</span>
        <span className="text-ink-500"> / </span>
        <span>{stat.assists}</span>
        <span className="text-ink-500"> / </span>
        <span className="text-amber-400">{stat.headshots}</span>
        <span className="text-ink-500"> / </span>
        <span>{stat.damageDealt}</span>
      </div>
    </li>
  );
}
