'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { NameInput } from './NameInput';
import { closeSocket } from '@/lib/lobby/connection';
import { loadStoredPlayerName, normalizePlayerName, saveStoredPlayerName } from '@/lib/lobby/player-name';
import { generateRoomCode, normalizeRoomCode } from '@/lib/lobby/room-code';
import { useLobbyStore } from '@/lib/lobby/store';

/**
 * トップ画面：名前入力 + ルーム作成 / 参加コード入力。
 * - 名前は localStorage に保存（次回自動入力）
 * - 「作成」: 6桁コードをクライアント生成して /room/[code] に遷移（asHost=true）
 * - 「参加」: 入力コードを大文字化して遷移（asHost=false）
 */
export function TopScreen() {
  const router = useRouter();
  const setMyName = useLobbyStore((s) => s.setMyName);
  const setIsHost = useLobbyStore((s) => s.setIsHost);
  const resetForNewRoom = useLobbyStore((s) => s.resetForNewRoom);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  // 前回名前を localStorage から復元
  useEffect(() => {
    const stored = loadStoredPlayerName();
    if (stored) setName(stored);
    // 戻ってきたタイミングなので接続は念のため閉じる
    closeSocket();
    resetForNewRoom();
  }, [resetForNewRoom]);

  const validateName = (): string | null => {
    const n = normalizePlayerName(name);
    if (!n) {
      setNameError('1〜16文字で名前を入力してください');
      return null;
    }
    setNameError(null);
    return n;
  };

  const onCreateRoom = () => {
    const validName = validateName();
    if (!validName) return;
    saveStoredPlayerName(validName);
    setMyName(validName);
    setIsHost(true);
    const newCode = generateRoomCode();
    router.push(`/room/${newCode}`);
  };

  const onJoinRoom = () => {
    const validName = validateName();
    if (!validName) return;
    const validCode = normalizeRoomCode(code);
    if (!validCode) {
      setCodeError('ルームコードは英数大文字6桁です');
      return;
    }
    setCodeError(null);
    saveStoredPlayerName(validName);
    setMyName(validName);
    setIsHost(false);
    router.push(`/room/${validCode}`);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <p className="font-display text-xs tracking-[0.6em] text-ink-400">FPS 5 vs 5 · 3 MIN</p>
          <h1 className="mt-2 font-display text-6xl tracking-[0.25em] text-ink-100">
            <span className="text-accent-red">ARIGATO</span>
            <span className="ml-2 text-accent-blue">ARENA</span>
          </h1>
          <p className="mt-3 text-sm text-ink-400">社内イベント用ブラウザFPS</p>
        </div>

        <div className="rounded-xl border border-ink-800 bg-ink-900/80 p-6 shadow-glow backdrop-blur">
          <NameInput value={name} onChange={setName} error={nameError} />

          <div className="my-6 h-px bg-ink-800" />

          <div className="space-y-4">
            <button
              type="button"
              onClick={onCreateRoom}
              className="w-full rounded-md bg-accent-red px-5 py-3 font-display text-lg uppercase tracking-[0.3em] text-ink-100 transition hover:bg-accent-redDark"
            >
              ルームを作成
            </button>

            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-ink-500">
              <div className="h-px flex-1 bg-ink-800" />
              <span>または</span>
              <div className="h-px flex-1 bg-ink-800" />
            </div>

            <div>
              <label
                htmlFor="room-code-input"
                className="mb-1 block text-xs uppercase tracking-widest text-ink-400"
              >
                ルームコード
              </label>
              <input
                id="room-code-input"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="A2BC3D"
                maxLength={6}
                className="w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-3 text-center font-display text-2xl tracking-[0.4em] text-ink-100 placeholder:text-ink-600 focus:border-accent-blue"
              />
              {codeError && <p className="mt-1 text-xs text-accent-red">{codeError}</p>}
            </div>

            <button
              type="button"
              onClick={onJoinRoom}
              className="w-full rounded-md border border-accent-blue bg-accent-blueDark/40 px-5 py-3 font-display text-lg uppercase tracking-[0.3em] text-ink-100 transition hover:bg-accent-blueDark"
            >
              ルームに参加
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          推奨環境: デスクトップChrome / 1920×1080 / 社内LAN
        </p>
      </div>
    </main>
  );
}
