'use client';

import dynamic from 'next/dynamic';
import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ComponentType } from 'react';
import type { PlayerId, Team } from '@arigato/shared';

import { GameViewStub } from '@/components/lobby/GameViewStub';
import { createGameConnection, type GameConnectionLike } from '@/lib/lobby/gameConnection';
import { loadStoredPlayerName } from '@/lib/lobby/player-name';
import { normalizeRoomCode } from '@/lib/lobby/room-code';
import { useLobbyStore } from '@/lib/lobby/store';
import { useConnection } from '@/lib/lobby/useConnection';
import { useRoomState } from '@/lib/lobby/useRoomState';

interface Props {
  params: Promise<{ code: string }>;
}

/** renderer agent の GameView が要求する props（構造的に合わせる）。 */
interface GameViewProps {
  connection: GameConnectionLike;
  team: Team;
  playerVisuals?: Map<
    PlayerId,
    { id: string; name?: string; team?: 'red' | 'blue'; characterId?: string }
  >;
}

type GameViewComponent = ComponentType<GameViewProps>;

/**
 * GameView の dynamic ロード。
 * - renderer agent の `apps/client/game/GameView.tsx` を読み込む
 * - 失敗時はスタブにフォールバック
 */
const GameView: GameViewComponent = dynamic<GameViewProps>(
  async () => {
    try {
      const mod: unknown = await import('@/game/GameView');
      // default export または named GameView のどちらにも対応
      if (mod && typeof mod === 'object') {
        const m = mod as Record<string, unknown>;
        if (typeof m.default === 'function') {
          return m.default as GameViewComponent;
        }
        if (typeof m.GameView === 'function') {
          return m.GameView as GameViewComponent;
        }
      }
      return GameViewStub as unknown as GameViewComponent;
    } catch {
      return GameViewStub as unknown as GameViewComponent;
    }
  },
  { ssr: false, loading: () => <GameViewStub /> },
);

export default function PlayPage({ params }: Props) {
  const { code: rawCode } = use(params);
  const code = normalizeRoomCode(rawCode);
  const router = useRouter();

  const myName = useLobbyStore((s) => s.myName);
  const setMyName = useLobbyStore((s) => s.setMyName);
  const isHost = useLobbyStore((s) => s.isHost);
  const myPlayerId = useLobbyStore((s) => s.myPlayerId);
  const phase = useLobbyStore((s) => s.roomState?.phase ?? null);
  const { players } = useRoomState();

  useEffect(() => {
    if (!myName) {
      const stored = loadStoredPlayerName();
      if (stored) setMyName(stored);
      else router.replace('/');
    }
  }, [myName, router, setMyName]);

  // 接続を維持（同一ルームならシングルトン再利用）
  useConnection({ roomCode: code, name: myName, asHost: isHost, enabled: Boolean(myName) });

  // 試合終了・ロビー復帰でリダイレクト
  useEffect(() => {
    if (!code) return;
    if (phase === 'finished') {
      router.replace(`/room/${code}/result`);
    } else if (phase === 'lobby') {
      router.replace(`/room/${code}`);
    }
  }, [phase, code, router]);

  // GameView に渡すデータ
  const connection = useMemo(() => createGameConnection(), []);
  const myTeam: Team = useMemo(() => {
    const me = players.find((p) => p.id === myPlayerId);
    return me?.team ?? 'red';
  }, [players, myPlayerId]);

  const playerVisuals = useMemo(() => {
    const m = new Map<PlayerId, { id: string; name?: string; team?: 'red' | 'blue'; characterId?: string }>();
    for (const p of players) {
      m.set(p.id, { id: p.id, name: p.name, team: p.team, characterId: p.characterId });
    }
    return m;
  }, [players]);

  if (!code) return null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <GameView connection={connection} team={myTeam} playerVisuals={playerVisuals} />
    </main>
  );
}
