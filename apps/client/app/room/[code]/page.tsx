'use client';

import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { WaitingRoom } from '@/components/lobby/WaitingRoom';
import { CountdownOverlay } from '@/components/lobby/CountdownOverlay';
import { ConnectionStatusBadge } from '@/components/lobby/ConnectionStatusBadge';
import { loadStoredPlayerName } from '@/lib/lobby/player-name';
import { normalizeRoomCode } from '@/lib/lobby/room-code';
import { useLobbyStore } from '@/lib/lobby/store';
import { useConnection } from '@/lib/lobby/useConnection';
import { useRoomState } from '@/lib/lobby/useRoomState';

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * /room/[code] — 待機画面。
 * - 名前が無い場合はトップへ戻す
 * - 接続を開始し、サーバーからの room_snapshot を待つ
 * - phase=playing になったら /play へ遷移
 */
export default function RoomWaitingPage({ params }: Props) {
  const { code: rawCode } = use(params);
  const router = useRouter();
  const code = normalizeRoomCode(rawCode);

  const myName = useLobbyStore((s) => s.myName);
  const setMyName = useLobbyStore((s) => s.setMyName);
  const isHost = useLobbyStore((s) => s.isHost);
  const setRoomCode = useLobbyStore((s) => s.setRoomCode);
  const phase = useLobbyStore((s) => s.roomState?.phase ?? null);
  const countdown = useLobbyStore((s) => s.countdownSecondsLeft);

  // localStorage から名前を復元（未設定なら top へ戻す）
  useEffect(() => {
    if (!myName) {
      const stored = loadStoredPlayerName();
      if (stored) {
        setMyName(stored);
      } else {
        router.replace('/');
      }
    }
  }, [myName, router, setMyName]);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);

  // 接続開始（必要条件が揃ったときだけ）
  useConnection({ roomCode: code, name: myName, asHost: isHost, enabled: Boolean(myName) });

  // phase=playing なら試合画面へ遷移
  useEffect(() => {
    if (!code) return;
    if (phase === 'playing') {
      router.replace(`/room/${code}/play`);
    } else if (phase === 'finished') {
      router.replace(`/room/${code}/result`);
    }
  }, [phase, code, router]);

  const showCountdown = useMemo(
    () => phase === 'countdown' && typeof countdown === 'number',
    [phase, countdown],
  );

  if (!code) return null;

  return (
    <main className="relative min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-ink-800 pb-4">
          <div>
            <p className="font-display text-xs tracking-[0.4em] text-ink-400">ROOM</p>
            <h1 className="font-display text-5xl tracking-[0.25em] text-ink-100">{code}</h1>
          </div>
          <ConnectionStatusBadge />
        </header>
        <WaitingRoom roomCode={code} />
      </div>
      {showCountdown && countdown !== null && <CountdownOverlay secondsLeft={countdown} />}
    </main>
  );
}
