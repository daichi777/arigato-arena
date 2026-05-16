'use client';

import { useMemo } from 'react';
import type { RoomCode } from '@arigato/shared';

import { CharacterPicker } from './CharacterPicker';
import { HostControls } from './HostControls';
import { PlayerList } from './PlayerList';
import { useLobbyStore } from '@/lib/lobby/store';
import { useRoomState } from '@/lib/lobby/useRoomState';

interface Props {
  roomCode: RoomCode;
}

/**
 * 待機画面の本体。
 * - 左: プレイヤー一覧（赤/青チームに分かれて表示）
 * - 中央: キャラクター選択グリッド
 * - 右: ホスト用コントロール（シャッフル・開始）
 */
export function WaitingRoom({ roomCode }: Props) {
  const { players, teamRed, teamBlue, isHost, hostId } = useRoomState();
  const myPlayerId = useLobbyStore((s) => s.myPlayerId);
  const lastError = useLobbyStore((s) => s.lastError);

  const myPlayer = useMemo(
    () => (myPlayerId ? players.find((p) => p.id === myPlayerId) ?? null : null),
    [players, myPlayerId],
  );

  return (
    <section className="grid gap-6 lg:grid-cols-[2fr_3fr_2fr]">
      <div className="space-y-4">
        <PlayerList title="RED" team="red" players={teamRed} myPlayerId={myPlayerId} hostId={hostId} />
        <PlayerList title="BLUE" team="blue" players={teamBlue} myPlayerId={myPlayerId} hostId={hostId} />
        <div className="rounded-md border border-ink-800 bg-ink-900 p-3 text-xs text-ink-400">
          <p>ルームコード:</p>
          <p className="mt-1 font-display text-2xl tracking-[0.4em] text-ink-100">{roomCode}</p>
          <p className="mt-2">このコードをSlackや口頭で共有してください。</p>
        </div>
      </div>

      <CharacterPicker myPlayer={myPlayer} />

      <div className="space-y-4">
        <HostControls isHost={isHost} playersCount={players.length} />
        {lastError && (
          <div className="rounded-md border border-accent-redDark bg-ink-900 p-3 text-xs text-accent-red">
            <p className="font-semibold uppercase tracking-widest">{lastError.code}</p>
            <p className="mt-1 text-ink-300">{lastError.message}</p>
          </div>
        )}
      </div>
    </section>
  );
}
