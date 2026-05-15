'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 本番では Sentry などへの送信に差し替え予定
    // eslint-disable-next-line no-console
    console.error('[ArigatoArena] route error', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-lg border border-accent-redDark bg-ink-900 p-8 text-center shadow-glow">
        <p className="font-display text-5xl tracking-widest text-accent-red">ERROR</p>
        <h1 className="mt-4 text-xl font-semibold text-ink-100">予期しないエラーが発生しました</h1>
        <p className="mt-2 break-all text-sm text-ink-400">{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-md border border-ink-700 bg-ink-800 px-5 py-2 text-sm uppercase tracking-widest text-ink-100 transition hover:border-accent-red hover:text-accent-red"
        >
          再試行
        </button>
      </div>
    </main>
  );
}
