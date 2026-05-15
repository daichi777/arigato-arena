'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { MatchResult, RoomCode, Team } from '@arigato/shared';

import { MvpCard } from '@/components/lobby/MvpCard';
import { PlayAgainButton } from '@/components/lobby/PlayAgainButton';
import { ScoreTable } from '@/components/lobby/ScoreTable';
import { findMvp } from '@/lib/lobby/result-mvp';
import { closeSocket } from '@/lib/lobby/connection';
import { useLobbyStore, selectIsHost } from '@/lib/lobby/store';

interface Props {
  roomCode: RoomCode;
  finalResult: MatchResult;
}

type Outcome = 'win' | 'lose' | 'draw';

const OUTCOME_LABEL: Record<Outcome, string> = {
  win: 'WIN',
  lose: 'LOSE',
  draw: 'DRAW',
};

const OUTCOME_TEXT_CLASS: Record<Outcome, string> = {
  win: 'text-accent-red',
  lose: 'text-ink-300',
  draw: 'text-amber-400',
};

const OUTCOME_BG_CLASS: Record<Outcome, string> = {
  win: 'border-accent-red shadow-glow',
  lose: 'border-ink-700',
  draw: 'border-amber-400/60',
};

/**
 * 試合結果画面の本体。
 * - ヘッダ: ルームコード + 勝敗 (WIN/LOSE/DRAW)
 * - チームスコア: RED N : N BLUE
 * - MVP セクション（kills/headshots/damage で算出、サーバー値より自前計算を優先する）
 * - 個人スコア表（チーム別 2 カラム）
 * - 「もう一度遊ぶ」（ホストのみ enabled）/「ロビーを抜ける」
 */
export function ResultDetail({ roomCode, finalResult }: Props) {
  const myPlayerId = useLobbyStore((s) => s.myPlayerId);
  const isHost = useLobbyStore(selectIsHost);

  const myTeam: Team | null = useMemo(() => {
    if (!myPlayerId) return null;
    const mine = finalResult.playerStats.find((s) => s.playerId === myPlayerId);
    return mine?.team ?? null;
  }, [myPlayerId, finalResult.playerStats]);

  const outcome: Outcome = useMemo(() => {
    if (finalResult.winnerTeam === 'draw') return 'draw';
    if (myTeam && finalResult.winnerTeam === myTeam) return 'win';
    return 'lose';
  }, [finalResult.winnerTeam, myTeam]);

  // クライアント側で MVP を再計算する（決定的タイブレーク確保）。
  // server から渡る mvpPlayerId と異なる場合でも、表示上は findMvp の結果を優先する。
  const mvp = useMemo(() => findMvp(finalResult.playerStats), [finalResult.playerStats]);

  const teamKills = finalResult.teamKills;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between border-b border-ink-800 pb-4">
        <div>
          <p className="font-display text-xs tracking-[0.4em] text-ink-400">RESULT</p>
          <h1 className="font-display text-5xl tracking-[0.25em] text-ink-100">{roomCode}</h1>
        </div>
        <Link
          href="/"
          onClick={() => {
            // トップに戻る前にソケットを明示切断（ルームを離脱）
            closeSocket();
            useLobbyStore.getState().resetForNewRoom();
          }}
          className="rounded-md border border-ink-700 bg-ink-800 px-4 py-2 text-xs uppercase tracking-widest text-ink-100 transition hover:border-accent-red hover:text-accent-red"
        >
          ロビーを抜ける
        </Link>
      </header>

      <section
        className={`rounded-xl border-2 bg-ink-950 p-6 text-center ${OUTCOME_BG_CLASS[outcome]}`}
      >
        <p className="font-display text-xs tracking-[0.5em] text-ink-400">RESULT</p>
        <p
          className={`mt-2 font-display text-7xl tracking-[0.3em] ${OUTCOME_TEXT_CLASS[outcome]}`}
        >
          {OUTCOME_LABEL[outcome]}
        </p>
        <div className="mt-6 flex items-center justify-center gap-6 font-mono text-3xl tabular-nums">
          <span className="font-display tracking-[0.3em] text-accent-red">RED</span>
          <span className="text-ink-100">{teamKills.red}</span>
          <span className="text-ink-500">:</span>
          <span className="text-ink-100">{teamKills.blue}</span>
          <span className="font-display tracking-[0.3em] text-accent-blue">BLUE</span>
        </div>
      </section>

      {mvp && <MvpCard mvp={mvp} />}

      <ScoreTable stats={finalResult.playerStats} myPlayerId={myPlayerId} />

      <footer className="grid gap-3 sm:grid-cols-2">
        <PlayAgainButton isHost={isHost} />
        <ResetAndLeaveButton />
      </footer>
    </div>
  );
}

/**
 * 「ロビーを抜ける」（フッター版）。
 * - 接続を切ってトップへ戻る。
 * - 上部リンクと別に大きめのボタンとして配置する。
 */
function ResetAndLeaveButton() {
  return (
    <Link
      href="/"
      onClick={() => {
        closeSocket();
        useLobbyStore.getState().resetForNewRoom();
      }}
      className="w-full rounded-md border border-ink-700 bg-ink-900 px-4 py-3 text-center font-display text-base uppercase tracking-[0.3em] text-ink-200 transition hover:border-accent-blue hover:text-ink-100"
    >
      ロビーを抜ける
    </Link>
  );
}

