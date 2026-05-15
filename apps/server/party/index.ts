import {
  tryParseClientMessageJson,
  type RoomCode,
  type RoomState,
  type ServerMessage,
  type ServerWelcome,
} from '@arigato/shared';
import type * as Party from 'partykit/server';

import { enqueueMatchEnd } from '../src/combat/match-finish.js';
import { RespawnQueue } from '../src/combat/respawn.js';
import type { Env } from '../src/env.js';
import { dispatch, type HandlerContext } from '../src/handlers/dispatch.js';
import { InputBuffer } from '../src/input/input-buffer.js';
import { RateLimiter } from '../src/input/rate-limiter.js';
import { broadcast, sendTo } from '../src/net/broadcast.js';
import { sendError } from '../src/net/send-error.js';
import { createInitialRoomState, pickNextHost } from '../src/room/room-state.js';
import { persistMatchResult } from '../src/supabase/persist.js';
import { TickLoop } from '../src/tick/tick-loop.js';
import { tickStep } from '../src/tick/tick-step.js';
import { buildRoomSnapshot, buildServerSnapshot } from '../src/tick/snapshot.js';
import { generateRoomCode } from '../src/util/room-code.js';
import { createLogger, type Logger } from '../src/util/logger.js';

/**
 * ArigatoArena の PartyKit Room 実装。
 *
 * - DurableObject 1 つ = 1 ルーム。
 * - 20Hz tick は `room.storage.setAlarm` 駆動。
 * - 状態は this.roomState に保持し、Day1 午後では永続化しない（接続全停止で消える）。
 *
 * `partykit/server` の `Party.Server` インタフェースを実装する形式。
 */
export default class ArigatoRoom implements Party.Server {
  static options: Party.ServerOptions = {
    hibernate: false,
  };

  private roomState: RoomState;
  private readonly inputs = new InputBuffer();
  private readonly rateLimiter = new RateLimiter();
  private readonly respawnQueue = new RespawnQueue();
  private readonly tickLoop: TickLoop;
  private logger: Logger;
  /** 直近の onMessage で broadcast を要したフェーズ（重複送信抑止用） */
  private dirtyRoomSnapshot = false;
  /** match_end / supabase 書き込みを 1 試合 1 回に絞るためのフラグ */
  private matchPersisted = false;
  /** Supabase 書き込み用に保持。transitionToPlaying 時に Date.now() を記録 */
  private matchStartedAtMs = 0;

  constructor(readonly room: Party.Room) {
    // PartyKit が `/parties/main/<roomCode>` のように URL 経由で room.id を決める。
    // クライアント側 (lobby agent) は 6桁英数大文字のルームコードを room.id として渡す前提。
    // ID が空 or 不正な場合は新規生成（テスト用）。
    const code = isValidRoomCode(room.id) ? (room.id as RoomCode) : generateRoomCode();
    this.roomState = createInitialRoomState(code);
    this.logger = createLogger({ roomCode: code });

    this.tickLoop = new TickLoop(
      {
        setAlarm: async (dueMs: number) => {
          await this.room.storage.setAlarm(dueMs);
        },
        deleteAlarm: async () => {
          await this.room.storage.deleteAlarm();
        },
      },
      this.logger,
    );
  }

  /** クライアント接続: welcome と現在のロビー状態を返す。 */
  onConnect(connection: Party.Connection, _ctx: Party.ConnectionContext): void {
    const welcome: ServerWelcome = {
      type: 'welcome',
      yourPlayerId: connection.id,
      roomCode: this.roomState.code,
    };
    sendTo(connection, welcome);
    sendTo(connection, buildRoomSnapshot(this.roomState));
  }

  async onMessage(
    message: string | ArrayBuffer | ArrayBufferView,
    sender: Party.Connection,
  ): Promise<void> {
    if (typeof message !== 'string') {
      sendError(sender, 'invalid_message', 'JSON 文字列以外は受け付けません');
      return;
    }
    const parsed = tryParseClientMessageJson(message);
    if (!parsed) {
      sendError(sender, 'invalid_message', 'メッセージ形式が不正です');
      return;
    }

    const pendingBroadcasts: ServerMessage[] = [];
    const handlerCtx: HandlerContext = {
      state: this.roomState,
      connId: sender.id,
      sender,
      nowMs: Date.now(),
      inputs: this.inputs,
      rateLimiter: this.rateLimiter,
      respawnQueue: this.respawnQueue,
      logger: this.logger,
      onPhaseShouldRebroadcast: () => {
        this.dirtyRoomSnapshot = true;
      },
      enqueueBroadcast: (msg) => {
        pendingBroadcasts.push(msg);
      },
    };

    try {
      dispatch(handlerCtx, parsed);
    } catch (err) {
      this.logger.error('handler exception', { type: parsed.type, error: String(err) });
      sendError(sender, 'invalid_action', '内部エラーが発生しました');
    }

    if (this.dirtyRoomSnapshot) {
      this.dirtyRoomSnapshot = false;
      // ロビーリセットなどフェーズリセット時に持ち越した match_end は破棄
      if (this.roomState.phase === 'lobby') {
        this.matchPersisted = false;
      }
      broadcast(this.room, buildRoomSnapshot(this.roomState));
    }

    for (const msg of pendingBroadcasts) {
      broadcast(this.room, msg);
    }

    // 最初のプレイヤー参加時に tickLoop を起動。
    if (!this.tickLoop.isRunning() && Object.keys(this.roomState.players).length > 0) {
      await this.tickLoop.start(Date.now());
    }
  }

  async onClose(connection: Party.Connection): Promise<void> {
    const pid = connection.id;
    if (!this.roomState.players[pid]) {
      return;
    }
    delete this.roomState.players[pid];
    this.inputs.remove(pid);
    this.rateLimiter.cleanup(pid);
    this.respawnQueue.cancel(pid);

    if (this.roomState.hostId === pid) {
      const nextHost = pickNextHost(this.roomState, pid);
      this.roomState.hostId = nextHost ?? '';
      this.logger.info('host transferred', { from: pid, to: this.roomState.hostId });
    }

    this.logger.info('player left', {
      playerId: pid,
      remaining: Object.keys(this.roomState.players).length,
    });

    broadcast(this.room, buildRoomSnapshot(this.roomState));

    if (Object.keys(this.roomState.players).length === 0) {
      await this.tickLoop.stop();
      this.inputs.clear();
      this.rateLimiter.clear();
      this.respawnQueue.clear();
    }
  }

  /**
   * Cloudflare Durable Object の alarm 発火。
   * tickLoop に委譲し、catch-up しつつ最後の tick だけ broadcast する。
   */
  async onAlarm(): Promise<void> {
    const now = Date.now();
    let lastPhase = this.roomState.phase;
    let lastCountdownSec = -1;
    let phaseChangedThisCycle = false;
    let finishedThisCycle = false;

    const executed = await this.tickLoop.runDueTicks(now, (tickNowMs) => {
      const prevPhase = this.roomState.phase;
      const result = tickStep({
        state: this.roomState,
        inputs: this.inputs,
        nowMs: tickNowMs,
        respawnQueue: this.respawnQueue,
      });

      if (result.phaseChanged) {
        phaseChangedThisCycle = true;
        if (result.phaseChanged === 'playing' && prevPhase === 'countdown') {
          // 試合開始タイミングを記録（Supabase の started_at に使う）
          this.matchStartedAtMs = Date.now();
          this.matchPersisted = false;
          this.respawnQueue.clear();
        }
        if (result.phaseChanged === 'finished') {
          finishedThisCycle = true;
        }
        this.logger.info('phase changed', {
          to: result.phaseChanged,
          tick: this.roomState.serverTick,
        });
      }
      lastPhase = this.roomState.phase;
      lastCountdownSec = result.countdownSecondsLeft;

      for (const pid of result.timedOutPlayers) {
        const conn = this.room.getConnection(pid);
        if (conn) {
          try {
            conn.close(4000, 'idle timeout');
          } catch {
            // 既に閉じている場合は無視
          }
        }
        delete this.roomState.players[pid];
        this.inputs.remove(pid);
        this.rateLimiter.cleanup(pid);
        this.respawnQueue.cancel(pid);
        if (this.roomState.hostId === pid) {
          this.roomState.hostId = pickNextHost(this.roomState, pid) ?? '';
        }
        phaseChangedThisCycle = true;
        this.logger.warn('player timed out', { playerId: pid });
      }
    });

    if (executed === 0) {
      return;
    }

    if (lastPhase === 'playing') {
      broadcast(this.room, buildServerSnapshot(this.roomState, now));
    } else if (lastPhase === 'countdown') {
      if (lastCountdownSec >= 0) {
        broadcast(this.room, { type: 'countdown', secondsLeft: lastCountdownSec });
      }
      if (phaseChangedThisCycle) {
        broadcast(this.room, buildRoomSnapshot(this.roomState));
      }
    } else {
      if (phaseChangedThisCycle) {
        broadcast(this.room, buildRoomSnapshot(this.roomState));
      }
    }

    if (finishedThisCycle && !this.matchPersisted) {
      this.matchPersisted = true;
      this.respawnQueue.clear();
      const pendingMatchEnd: ServerMessage[] = [];
      enqueueMatchEnd(this.roomState, (m) => pendingMatchEnd.push(m));
      for (const m of pendingMatchEnd) {
        broadcast(this.room, m);
      }
      // fire-and-forget: 試合体験を止めない
      const env = this.getEnv();
      if (this.roomState.finalResult) {
        const result = this.roomState.finalResult;
        const startedAt = this.matchStartedAtMs || Date.now();
        const endedAt = Date.now();
        const roomCode = this.roomState.code;
        const logger = this.logger;
        void persistMatchResult(env, { roomCode, startedAt, endedAt, result }, logger).catch((err) => {
          logger.error('persistMatchResult unhandled rejection', { error: String(err) });
        });
      }
    }
  }

  /**
   * PartyKit は `room.env` に環境変数を提供する（型は any）。
   * 必要な 2 キーだけ narrow に取り出す。Cloudflare Worker 本番では PartyKit Secrets から注入される。
   */
  private getEnv(): Env {
    const raw = (this.room as unknown as { env?: Record<string, unknown> }).env ?? {};
    const url = raw['SUPABASE_URL'];
    const key = raw['SUPABASE_SERVICE_ROLE_KEY'];
    return {
      SUPABASE_URL: typeof url === 'string' ? url : undefined,
      SUPABASE_SERVICE_ROLE_KEY: typeof key === 'string' ? key : undefined,
    };
  }
}

/** ルームコードの形式チェック（6桁英数大文字） */
function isValidRoomCode(id: string): boolean {
  return /^[A-Z0-9]{6}$/.test(id);
}

// PartyKit のリント用、Worker としても satisfies
ArigatoRoom satisfies Party.Worker;
