'use client';

import { useLobbyStore } from '@/lib/lobby/store';

const LABEL: Record<string, string> = {
  idle: '未接続',
  connecting: '接続中',
  connected: '接続済',
  disconnected: '切断',
};

const COLOR: Record<string, string> = {
  idle: 'bg-ink-700 text-ink-300',
  connecting: 'bg-rust-500 text-ink-100 animate-pulseSlow',
  connected: 'bg-emerald-700 text-emerald-100',
  disconnected: 'bg-accent-redDark text-ink-100',
};

export function ConnectionStatusBadge() {
  const status = useLobbyStore((s) => s.connectionStatus);
  const lastError = useLobbyStore((s) => s.lastError);
  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${COLOR[status] ?? 'bg-ink-700'}`}
      >
        {LABEL[status] ?? status}
      </span>
      {lastError && (
        <span className="max-w-[20rem] truncate text-xs text-accent-red" title={lastError.message}>
          {lastError.code}: {lastError.message}
        </span>
      )}
    </div>
  );
}
