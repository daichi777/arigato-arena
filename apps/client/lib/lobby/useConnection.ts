'use client';

import { useEffect } from 'react';
import type { RoomCode } from '@arigato/shared';

import { closeSocket, getCurrentRoomCode, getOrCreateSocket } from './connection';
import { useLobbyStore } from './store';

export interface UseConnectionOptions {
  /** 対象ルーム。null/undefined の間は接続しない。 */
  roomCode: RoomCode | null | undefined;
  /** 名前。空文字の間は接続しない。 */
  name: string;
  /** ルーム作成者か。 */
  asHost: boolean;
  /** false のときは何もしない。 */
  enabled?: boolean;
}

/**
 * ルームコード・名前が揃ったタイミングで WebSocket 接続を確立する hook。
 *
 * 重要:
 * - `getOrCreateSocket` は同一ルームコードならインスタンスを再利用するため、
 *   /room/[code] → /room/[code]/play 遷移で再マウントされても接続は維持される。
 * - アンマウント時に明示的な close は行わない。
 *   ルームから抜けるときは {@link useLeaveLobbyOnUnmount} やトップ画面の
 *   `closeSocket()` 呼び出しで切断する。
 */
export function useConnection(opts: UseConnectionOptions): void {
  const { roomCode, name, asHost, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;
    if (!roomCode || !name) return;

    getOrCreateSocket({ roomCode, name, asHost });
    // unmount で close しない（singleton 維持）
  }, [roomCode, name, asHost, enabled]);
}

/**
 * 表示中のルームコードが現在のソケットと異なるとき、明示的に切断するための補助 hook。
 * トップ画面に戻った時に呼ぶ。
 */
export function useDisconnectIfMismatched(targetRoomCode: RoomCode | null): void {
  useEffect(() => {
    const current = getCurrentRoomCode();
    if (!targetRoomCode && current) {
      closeSocket();
      useLobbyStore.getState().setConnectionStatus('idle');
    }
  }, [targetRoomCode]);
}
