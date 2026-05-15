'use client';

import { sendClientMessage } from '@/lib/lobby/connection';
import {
  buildHostShuffleTeamsMessage,
  buildHostStartMatchMessage,
} from '@/lib/lobby/messages';

interface Props {
  isHost: boolean;
  playersCount: number;
}

/**
 * ホスト権限 UI。
 * - シャッフル: チーム再振り分け
 * - 試合開始: phase=countdown へ遷移要求
 * 参加人数 0 では開始押下不可。
 */
export function HostControls({ isHost, playersCount }: Props) {
  if (!isHost) {
    return (
      <div className="rounded-lg border border-ink-800 bg-ink-900 p-4 text-sm text-ink-400">
        <p className="font-display text-xs tracking-[0.4em] text-ink-500">HOST CONTROL</p>
        <p className="mt-2">ホストが試合開始するまでお待ちください。</p>
      </div>
    );
  }

  const onShuffle = () => sendClientMessage(buildHostShuffleTeamsMessage());
  const onStart = () => sendClientMessage(buildHostStartMatchMessage());

  return (
    <div className="rounded-lg border border-accent-red bg-ink-900 p-4 shadow-glow">
      <p className="font-display text-xs tracking-[0.4em] text-accent-red">HOST CONTROL</p>
      <p className="mt-1 text-xs text-ink-400">参加人数: {playersCount}</p>
      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={onShuffle}
          className="w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-2 text-sm uppercase tracking-widest text-ink-100 transition hover:border-accent-blue"
          disabled={playersCount === 0}
        >
          チームシャッフル
        </button>
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-md bg-accent-red px-4 py-3 font-display text-lg uppercase tracking-[0.3em] text-ink-100 transition hover:bg-accent-redDark disabled:cursor-not-allowed disabled:opacity-50"
          disabled={playersCount === 0}
        >
          試合開始
        </button>
      </div>
    </div>
  );
}
