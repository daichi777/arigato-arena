import { create } from 'zustand';
import type {
  ParsedServerMessage,
  PlayerId,
  RoomCode,
  RoomState,
  ServerErrorCode,
} from '@arigato/shared';

/** 接続ライフサイクル状態。 */
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface LobbyErrorState {
  code: ServerErrorCode | 'network' | 'parse';
  message: string;
}

export interface LobbyState {
  // セッション識別
  myPlayerId: PlayerId | null;
  myName: string;
  roomCode: RoomCode | null;
  isHost: boolean;

  // 接続状態
  connectionStatus: ConnectionStatus;
  lastError: LobbyErrorState | null;

  // ルーム全体（サーバー権威スナップショット）
  roomState: RoomState | null;

  // 試合開始カウントダウン（countdown フェーズで描画）
  countdownSecondsLeft: number | null;

  // ============ actions ============
  setMyName(name: string): void;
  setRoomCode(code: RoomCode | null): void;
  setIsHost(asHost: boolean): void;
  setConnectionStatus(status: ConnectionStatus): void;
  setLastError(err: LobbyErrorState | null): void;
  resetForNewRoom(): void;
  /**
   * サーバー受信メッセージの一次処理。
   * snapshot/hit/kill_feed は内部状態を変えない（renderer 側で購読）。
   */
  applyServerMessage(msg: ParsedServerMessage): void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  myPlayerId: null,
  myName: '',
  roomCode: null,
  isHost: false,
  connectionStatus: 'idle',
  lastError: null,
  roomState: null,
  countdownSecondsLeft: null,

  setMyName: (name) => set({ myName: name }),
  setRoomCode: (code) => set({ roomCode: code }),
  setIsHost: (asHost) => set({ isHost: asHost }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setLastError: (err) => set({ lastError: err }),

  resetForNewRoom: () =>
    set({
      myPlayerId: null,
      roomCode: null,
      isHost: false,
      connectionStatus: 'idle',
      lastError: null,
      roomState: null,
      countdownSecondsLeft: null,
    }),

  applyServerMessage: (msg) =>
    set((state) => {
      switch (msg.type) {
        case 'welcome':
          return {
            myPlayerId: msg.yourPlayerId,
            roomCode: msg.roomCode,
            lastError: null,
          };
        case 'room_snapshot': {
          // ルーム状態反映。countdown フェーズから外れたら残りカウントダウンを消す。
          const next: Partial<LobbyState> = { roomState: msg.state };
          if (msg.state.phase !== 'countdown') {
            next.countdownSecondsLeft = null;
          }
          return next;
        }
        case 'countdown':
          return { countdownSecondsLeft: msg.secondsLeft };
        case 'match_end':
          // 試合終了は room_snapshot で phase=finished が来る前提だが、
          // 早着の match_end でも roomState.finalResult を補完する。
          if (!state.roomState) return {};
          return {
            roomState: {
              ...state.roomState,
              phase: 'finished',
              finalResult: msg.result,
            },
          };
        case 'error':
          return {
            lastError: { code: msg.code, message: msg.message },
          };
        case 'snapshot':
        case 'hit':
        case 'kill_feed':
          // game 側に転送される（connection.ts の listener 経由）。
          // lobby store では何も触らない。
          return {};
        default: {
          const exhaustive: never = msg;
          void exhaustive;
          return {};
        }
      }
    }),
}));

// ============================================================================
// セレクタ（再レンダリング最小化のため）
// ============================================================================

export const selectIsHost = (s: LobbyState): boolean =>
  s.myPlayerId !== null && s.roomState !== null && s.roomState.hostId === s.myPlayerId;

export const selectRoomPhase = (s: LobbyState): RoomState['phase'] | null =>
  s.roomState?.phase ?? null;

export const selectPlayerList = (s: LobbyState) =>
  s.roomState ? Object.values(s.roomState.players) : [];
