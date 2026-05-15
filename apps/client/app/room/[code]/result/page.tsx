'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ResultDetail } from '@/components/lobby/ResultDetail';
import { loadStoredPlayerName } from '@/lib/lobby/player-name';
import { normalizeRoomCode } from '@/lib/lobby/room-code';
import { useLobbyStore } from '@/lib/lobby/store';
import { useConnection } from '@/lib/lobby/useConnection';

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * /room/[code]/result — 試合結果画面。
 *
 * 流れ:
 * 1. 名前未設定ならトップへ戻す
 * 2. WebSocket シングルトン接続を維持（同一ルームなら再利用）
 * 3. roomState.finalResult が来たら ResultDetail を描画
 * 4. phase が lobby に戻ったら（= もう一度遊ぶ）待機画面 /room/[code] に戻る
 * 5. phase が playing に戻ったら /room/[code]/play に進む
 */
export default function ResultPage({ params }: Props) {
  const { code: rawCode } = use(params);
  const router = useRouter();
  const code = normalizeRoomCode(rawCode);

  const myName = useLobbyStore((s) => s.myName);
  const setMyName = useLobbyStore((s) => s.setMyName);
  const isHost = useLobbyStore((s) => s.isHost);
  const setRoomCode = useLobbyStore((s) => s.setRoomCode);
  const phase = useLobbyStore((s) => s.roomState?.phase ?? null);
  const finalResult = useLobbyStore((s) => s.roomState?.finalResult ?? null);

  // 名前未設定なら復元 or トップへ
  useEffect(() => {
    if (!myName) {
      const stored = loadStoredPlayerName();
      if (stored) setMyName(stored);
      else router.replace('/');
    }
  }, [myName, router, setMyName]);

  useEffect(() => {
    if (code) setRoomCode(code);
  }, [code, setRoomCode]);

  // 接続維持（singleton。result 画面でホスト「もう一度遊ぶ」の host_start_match 送信に必要）
  useConnection({ roomCode: code, name: myName, asHost: isHost, enabled: Boolean(myName) });

  // サーバーが finished → lobby/countdown/playing に再遷移したら追従する。
  useEffect(() => {
    if (!code) return;
    if (phase === 'lobby' || phase === 'countdown') {
      router.replace(`/room/${code}`);
    } else if (phase === 'playing') {
      router.replace(`/room/${code}/play`);
    }
  }, [phase, code, router]);

  if (!code) return null;

  return (
    <main className="min-h-screen bg-ink-950 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {finalResult ? (
          <ResultDetail roomCode={code} finalResult={finalResult} />
        ) : (
          <div className="rounded-lg border border-ink-800 bg-ink-900 p-8 text-center text-ink-400">
            <p className="font-display tracking-[0.4em] text-ink-300">LOADING</p>
            <p className="mt-3 text-sm">試合結果を集計中です…</p>
          </div>
        )}
      </div>
    </main>
  );
}
