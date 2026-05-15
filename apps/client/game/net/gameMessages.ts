import type {
  ClientInput,
  ClientShoot,
  PlayerId,
  ServerHitEvent,
  ServerKillFeed,
  ServerSnapshot,
  ServerCountdown,
  ServerMatchEnd,
} from '@arigato/shared';

/**
 * renderer が試合中に取り扱うサーバーメッセージのサブセット。
 * lobby 系（welcome/room_snapshot/error）は lobby agent が処理する。
 */
export type GameServerMessage =
  | ServerSnapshot
  | ServerHitEvent
  | ServerKillFeed
  | ServerCountdown
  | ServerMatchEnd;

/** subscribe で渡されるリスナー */
export type GameMessageListener = (msg: GameServerMessage) => void;

/** subscribeGameMessages の型（unsubscribe 関数を返す） */
export type SubscribeGameMessages = (fn: GameMessageListener) => () => void;

/**
 * renderer が知る「接続」抽象。
 * - 実体は lobby agent 側の partysocket シングルトン経由で提供される。
 * - スタブモードでは `stubServer.ts` の StubConnection が同じ interface を満たす。
 *
 * renderer はこの interface に閉じてのみ通信し、`new WebSocket` 等の生接続を持たない。
 */
export interface GameConnection {
  /** 試合中メッセージを購読。返り値は unsubscribe。 */
  subscribe: SubscribeGameMessages;
  /** クライアント→サーバー送信。 */
  send: (msg: ClientInput | ClientShoot) => void;
  /** 自身の PlayerId（welcome 受信後に確定）。未確定時は null。 */
  getYourPlayerId: () => PlayerId | null;
  /** WebSocket 接続が開いているか */
  isOpen: () => boolean;
}
