'use client';

import { sendClientMessage } from '@/lib/lobby/connection';
import { buildHostStartMatchMessage } from '@/lib/lobby/messages';

interface Props {
  isHost: boolean;
}

/**
 * 「もう一度遊ぶ」ボタン。
 *
 * - ホスト: enabled。クリックで `host_start_match` を再送する。
 *   サーバー（Day2-B 担当）が finished → lobby に遷移させ、全員に room_snapshot を送る。
 *   その後 phase=lobby を受けたクライアントが /room/[code] にリダイレクトする。
 * - 非ホスト: disabled。「ホストの操作を待っています」とだけ表示する。
 */
export function PlayAgainButton({ isHost }: Props) {
  if (!isHost) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-md border border-ink-700 bg-ink-900 px-4 py-3 font-display text-sm uppercase tracking-[0.3em] text-ink-500"
      >
        ホストの操作を待っています…
      </button>
    );
  }

  const onClick = (): void => {
    sendClientMessage(buildHostStartMatchMessage());
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md bg-accent-red px-4 py-3 font-display text-base uppercase tracking-[0.3em] text-ink-100 shadow-glow transition hover:bg-accent-redDark"
    >
      もう一度遊ぶ
    </button>
  );
}
