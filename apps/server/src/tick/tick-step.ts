import {
  PLAYER_TIMEOUT_MS,
  TICK_INTERVAL_MS,
  type RoomPhase,
  type RoomState,
} from '@arigato/shared';

import { processRespawns, type RespawnQueue } from '../combat/respawn.js';
import type { InputBuffer } from '../input/input-buffer.js';
import { stepPlayerMovement } from '../physics/movement.js';
import { countdownSecondsLeft, shouldFinishMatch, transitionToFinished, transitionToPlaying } from '../room/phase.js';
import { listPlayers } from '../room/room-state.js';

/**
 * 1tick の純粋ステップ関数。
 *
 * 入力:
 *  - state: 更新対象（破壊的更新する）
 *  - inputs: 各プレイヤーの最新 input バッファ
 *  - nowMs: この tick が「処理されているサーバー時刻」
 *
 * 出力:
 *  - phaseChanged: フェーズ遷移が起きたか（呼び出し側でログ用）
 *  - countdownSecondsLeft: countdown 中の残り秒（broadcast 用）
 *  - timedOutPlayers: タイムアウトで削除すべきプレイヤーID一覧
 *
 * 副作用: state, inputs.prevJump を更新。snapshot 構築・broadcast はしない。
 */
export interface TickStepResult {
  phaseChanged: RoomPhase | null;
  countdownSecondsLeft: number;
  timedOutPlayers: string[];
}

export interface TickStepInputs {
  state: RoomState;
  inputs: InputBuffer;
  nowMs: number;
  /** リスポーンキュー（playing で drain される）。省略時は no-op */
  respawnQueue?: RespawnQueue;
}

export function tickStep({ state, inputs, nowMs, respawnQueue }: TickStepInputs): TickStepResult {
  state.serverTick += 1;
  const dtSeconds = TICK_INTERVAL_MS / 1000;
  let phaseChanged: RoomPhase | null = null;
  let secondsLeft = 0;
  const timedOutPlayers: string[] = [];

  switch (state.phase) {
    case 'lobby': {
      // 入力は溜まっていても破棄（試合中ではない）
      for (const p of listPlayers(state)) {
        inputs.drain(p.id);
        // lobby 中も最後のping的なものとして lastInputTick は更新しておく
        p.lastInputTick = state.serverTick;
      }
      break;
    }
    case 'countdown': {
      // カウントダウン中は入力受け付けつつも物理は止める（位置は固定）
      for (const p of listPlayers(state)) {
        const input = inputs.drain(p.id);
        if (input) {
          // 視点だけは反映しておく（描画用）
          p.yaw = input.yaw;
          p.pitch = input.pitch;
          p.lastInputTick = state.serverTick;
        }
      }
      secondsLeft = countdownSecondsLeft(state, nowMs);
      if (secondsLeft <= 0) {
        transitionToPlaying(state, nowMs);
        phaseChanged = 'playing';
      }
      break;
    }
    case 'playing': {
      // リスポーン待ち消化（死亡 → 期限到来でスポーン）
      if (respawnQueue) {
        processRespawns(state, respawnQueue, nowMs);
      }
      for (const p of listPlayers(state)) {
        const input = inputs.drain(p.id);
        const prevJump = inputs.getPrevJump(p.id);
        const { prevJump: nextPrevJump } = stepPlayerMovement(p, {
          input,
          dt: dtSeconds,
          prevJump,
        });
        inputs.setPrevJump(p.id, nextPrevJump);
        if (input) {
          p.lastInputTick = state.serverTick;
        }
        // 無敵時間切れ
        if (p.isInvincible && nowMs >= p.invincibleUntilMs) {
          p.isInvincible = false;
        }
      }
      // 試合終了判定
      if (shouldFinishMatch(state, nowMs)) {
        transitionToFinished(state, nowMs);
        phaseChanged = 'finished';
      }
      break;
    }
    case 'finished': {
      // 何もしない（room_snapshot だけ流す）
      break;
    }
  }

  // タイムアウト判定（lobby 中は緩く扱う:接続が生きていれば良い）
  if (state.phase === 'playing' || state.phase === 'countdown') {
    for (const p of listPlayers(state)) {
      const idleMs = (state.serverTick - p.lastInputTick) * TICK_INTERVAL_MS;
      if (idleMs >= PLAYER_TIMEOUT_MS) {
        timedOutPlayers.push(p.id);
      }
    }
  }

  return { phaseChanged, countdownSecondsLeft: secondsLeft, timedOutPlayers };
}
