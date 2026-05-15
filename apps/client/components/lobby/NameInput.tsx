'use client';

import { NAME_MAX_LENGTH } from '@arigato/shared';

interface Props {
  value: string;
  onChange: (next: string) => void;
  error?: string | null;
}

export function NameInput({ value, onChange, error }: Props) {
  return (
    <div>
      <label
        htmlFor="player-name-input"
        className="mb-1 block text-xs uppercase tracking-widest text-ink-400"
      >
        プレイヤー名
      </label>
      <input
        id="player-name-input"
        type="text"
        autoComplete="nickname"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="例: k2"
        maxLength={NAME_MAX_LENGTH}
        className="w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-3 text-lg text-ink-100 placeholder:text-ink-600 focus:border-accent-red"
      />
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-ink-500">{value.length} / {NAME_MAX_LENGTH}</span>
        {error && <span className="text-accent-red">{error}</span>}
      </div>
    </div>
  );
}
