'use client';

import { useMemo } from 'react';
import type { PlayerState, RoomPhase, RoomState, Team } from '@arigato/shared';

import { useLobbyStore } from './store';

export interface RoomDerived {
  phase: RoomPhase | null;
  hostId: string | null;
  isHost: boolean;
  players: PlayerState[];
  teamRed: PlayerState[];
  teamBlue: PlayerState[];
  unassigned: PlayerState[];
  matchTimeRemainingMs: number;
  finalResult: RoomState['finalResult'];
}

/** roomState から派生する表示用データをまとめて返す。 */
export function useRoomState(): RoomDerived {
  const roomState = useLobbyStore((s) => s.roomState);
  const myPlayerId = useLobbyStore((s) => s.myPlayerId);

  return useMemo<RoomDerived>(() => {
    if (!roomState) {
      return {
        phase: null,
        hostId: null,
        isHost: false,
        players: [],
        teamRed: [],
        teamBlue: [],
        unassigned: [],
        matchTimeRemainingMs: 0,
        finalResult: null,
      };
    }
    const players = Object.values(roomState.players);
    const teamRed = players.filter((p) => p.team === ('red' satisfies Team));
    const teamBlue = players.filter((p) => p.team === ('blue' satisfies Team));
    // 現プロトコルでは team は必ず付くが、将来 unassigned を扱う余地を残す。
    const knownIds = new Set([...teamRed, ...teamBlue].map((p) => p.id));
    const unassigned = players.filter((p) => !knownIds.has(p.id));

    const matchTimeRemainingMs = Math.max(
      0,
      roomState.matchDurationMs - (roomState.serverTick * 0 + 0),
    );

    return {
      phase: roomState.phase,
      hostId: roomState.hostId,
      isHost: myPlayerId !== null && roomState.hostId === myPlayerId,
      players,
      teamRed,
      teamBlue,
      unassigned,
      matchTimeRemainingMs,
      finalResult: roomState.finalResult,
    };
  }, [roomState, myPlayerId]);
}
