import PartySocket from 'partysocket';
import type {
  ClientMessage,
  ParsedServerMessage,
  RoomCode,
  ServerCountdown,
  ServerHitEvent,
  ServerKillFeed,
  ServerMatchEnd,
  ServerSnapshot,
} from '@arigato/shared';

import { getPartyKitHost, getPartyKitProtocol } from './env';
import { encodeClientMessage, parseServerMessageFromEvent } from './messages';
import { useLobbyStore } from './store';

/**
 * 試合中メッセージ購読リスナの型。
 * renderer agent が `subscribeGameMessages` を呼んで購読する。
 * - snapshot/hit/kill_feed: 試合中の本体メッセージ
 * - countdown/match_end: 試合進行イベント（lobby store にも反映するが、renderer 側 HUD でも参照したい）
 */
export type GameMessage =
  | ServerSnapshot
  | ServerHitEvent
  | ServerKillFeed
  | ServerCountdown
  | ServerMatchEnd;
export type GameMessageListener = (msg: GameMessage) => void;

// ============================================================================
// シングルトン状態
// ============================================================================

let socket: PartySocket | null = null;
let currentRoomCode: RoomCode | null = null;
let currentSocketHandlers: SocketHandlerSet | null = null;

const gameListeners = new Set<GameMessageListener>();

interface SocketHandlerSet {
  onOpen: (ev: Event) => void;
  onClose: (ev: CloseEvent) => void;
  onError: (ev: Event) => void;
  onMessage: (ev: MessageEvent) => void;
}

interface OpenConnectionOptions {
  roomCode: RoomCode;
  name: string;
  asHost: boolean;
}

/**
 * 指定ルームに接続する PartySocket を取得（必要なら新規生成）。
 * 同じ roomCode で既に接続済みなら同じインスタンスを返す。
 * 違う roomCode なら既存を閉じてから作り直す。
 */
export function getOrCreateSocket(opts: OpenConnectionOptions): PartySocket {
  if (socket && currentRoomCode === opts.roomCode) {
    // 既存ソケット維持。join メッセージは sendJoin() を別途呼ぶ前提。
    return socket;
  }
  if (socket) {
    closeSocket();
  }
  socket = createSocket(opts);
  currentRoomCode = opts.roomCode;
  return socket;
}

/**
 * 現在のソケットを閉じてリスナを解除する。
 * `useLobbyStore` の `resetForNewRoom` はここでは呼ばない（呼び出し側責務）。
 */
export function closeSocket(): void {
  if (socket && currentSocketHandlers) {
    socket.removeEventListener('open', currentSocketHandlers.onOpen);
    socket.removeEventListener('close', currentSocketHandlers.onClose);
    socket.removeEventListener('error', currentSocketHandlers.onError);
    socket.removeEventListener('message', currentSocketHandlers.onMessage);
  }
  if (socket) {
    try {
      socket.close();
    } catch {
      // 無視
    }
  }
  socket = null;
  currentSocketHandlers = null;
  currentRoomCode = null;
}

/** 現在の WebSocket インスタンス（renderer agent などが ad-hoc に使う用）。 */
export function getCurrentSocket(): PartySocket | null {
  return socket;
}

/** 現在接続中のルームコード。 */
export function getCurrentRoomCode(): RoomCode | null {
  return currentRoomCode;
}

/** ClientMessage を送信。未接続/OPEN前ならキューイングされる（partysocket 内部）。 */
export function sendClientMessage(msg: ClientMessage): void {
  if (!socket) return;
  try {
    socket.send(encodeClientMessage(msg));
  } catch {
    // 送信失敗時はサーバー側で再同期される前提。最低限のフェイルセーフ。
  }
}

// ============================================================================
// 試合中メッセージ Pub/Sub（renderer agent 結線点）
// ============================================================================

/**
 * 試合中メッセージ（snapshot/hit/kill_feed）を購読する。
 * renderer 側で `useEffect(() => subscribeGameMessages(fn), [])` のように使う。
 * 解除関数を返す。
 */
export function subscribeGameMessages(fn: GameMessageListener): () => void {
  gameListeners.add(fn);
  return () => {
    gameListeners.delete(fn);
  };
}

function emitGameMessage(msg: GameMessage): void {
  for (const fn of gameListeners) {
    try {
      fn(msg);
    } catch {
      // 1つのリスナが落ちても他に伝播しない
    }
  }
}

// ============================================================================
// 内部実装
// ============================================================================

function createSocket(opts: OpenConnectionOptions): PartySocket {
  const store = useLobbyStore.getState();
  store.setConnectionStatus('connecting');

  const ws = new PartySocket({
    host: getPartyKitHost(),
    room: opts.roomCode,
    protocol: getPartyKitProtocol(),
    // 自前タイミングで接続を開始するため一度閉じた状態で生成。
    startClosed: true,
  });

  const handlers: SocketHandlerSet = {
    onOpen: () => {
      useLobbyStore.getState().setConnectionStatus('connected');
      // 接続直後に join を送る（サーバーが welcome を返す）
      try {
        ws.send(
          encodeClientMessage({ type: 'join', name: opts.name, asHost: opts.asHost }),
        );
      } catch {
        // 送信失敗時はサーバー側で welcome が来ないので、UI 側はタイムアウト扱い
      }
    },
    onClose: () => {
      useLobbyStore.getState().setConnectionStatus('disconnected');
    },
    onError: () => {
      useLobbyStore.getState().setLastError({
        code: 'network',
        message: 'サーバーとの通信中にエラーが発生しました。',
      });
    },
    onMessage: (ev) => {
      const parsed = parseServerMessageFromEvent(ev.data);
      if (!parsed) {
        useLobbyStore.getState().setLastError({
          code: 'parse',
          message: '不正なサーバーメッセージを受信しました。',
        });
        return;
      }
      dispatchServerMessage(parsed);
    },
  };

  ws.addEventListener('open', handlers.onOpen);
  ws.addEventListener('close', handlers.onClose);
  ws.addEventListener('error', handlers.onError);
  ws.addEventListener('message', handlers.onMessage);
  currentSocketHandlers = handlers;

  // 実接続開始
  ws.reconnect();
  return ws;
}

function dispatchServerMessage(msg: ParsedServerMessage): void {
  // snapshot/hit/kill_feed は lobby store には残さず、game listener にのみ流す。
  // countdown/match_end は lobby store にも反映しつつ game listener にも転送する
  //   （renderer の HUD でも countdown 残秒数や試合終了を即時拾うため）。
  switch (msg.type) {
    case 'snapshot':
    case 'hit':
    case 'kill_feed':
      emitGameMessage(msg);
      return;
    case 'countdown':
    case 'match_end':
      useLobbyStore.getState().applyServerMessage(msg);
      emitGameMessage(msg);
      return;
    default:
      useLobbyStore.getState().applyServerMessage(msg);
      return;
  }
}

// ============================================================================
// テスト用 API（vitest のみで使用想定）
// ============================================================================

/** テスト：登録済リスナをすべて解除（プロセス内残留対策）。 */
export function __resetGameListenersForTest(): void {
  gameListeners.clear();
}

/** テスト：dispatchServerMessage を直接叩く。 */
export function __dispatchForTest(msg: ParsedServerMessage): void {
  dispatchServerMessage(msg);
}
