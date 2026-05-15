import type { ClientInput, ClientShoot, PlayerId } from '@arigato/shared';

import {
  getCurrentSocket,
  sendClientMessage,
  subscribeGameMessages,
  type GameMessage,
} from './connection';
import { useLobbyStore } from './store';

/**
 * renderer agent が要求する `GameConnection` インタフェースの最小形。
 * 本ファイルは renderer の型に依存せず構造的に合致するよう定義する
 *   （`apps/client/game/net/gameMessages.ts` の `GameConnection` と一致）。
 */
export interface GameConnectionLike {
  subscribe(listener: (msg: GameMessage) => void): () => void;
  send(msg: ClientInput | ClientShoot): void;
  getYourPlayerId(): PlayerId | null;
  isOpen(): boolean;
}

/**
 * lobby シングルトンの WebSocket を `GameConnection` として renderer に渡すアダプタ。
 * /play ページでマウント時に生成し、renderer の `<GameView connection={...} />` に渡す。
 */
export function createGameConnection(): GameConnectionLike {
  return {
    subscribe: (fn) => subscribeGameMessages(fn),
    send: (msg) => sendClientMessage(msg),
    getYourPlayerId: () => useLobbyStore.getState().myPlayerId,
    isOpen: () => {
      const s = getCurrentSocket();
      if (!s) return false;
      // ReconnectingWebSocket.OPEN === 1
      return s.readyState === 1;
    },
  };
}
