import { TICK_INTERVAL_MS } from '@arigato/shared';

import type { Logger } from '../util/logger.js';
import { nextTickDueMs, tickDriftMs } from '../util/clock.js';

/**
 * Durable Object の alarm() を 20Hz で回すためのドライバ。
 *
 * Cloudflare Workers では setInterval が不安定なので Storage Alarm を使う。
 * - 起動: start(nowMs) で次回 alarm を scheduleNext(nowMs + interval) として保存。
 * - tick: PartyServer 側の onAlarm() でこの runDueTicks(nowMs, doStep) を呼ぶ。
 *   遅延していたら catch-up でまとめて進める。
 * - 停止: stop() で alarm を解除する。
 *
 * このクラス自体は I/O を握っていない。実際の setAlarm/deleteAlarm は呼び出し側が DurableObjectStorage に対して行う。
 */
export interface TickLoopHooks {
  /** 次回 alarm を予約 */
  setAlarm(dueMs: number): Promise<void> | void;
  /** alarm を解除 */
  deleteAlarm(): Promise<void> | void;
}

export class TickLoop {
  /** 次に「処理すべき」tick の予定時刻 (ms) */
  private nextDueMs = 0;
  private running = false;
  /** 直近 tick 処理時の drift 平均（観測用） */
  private lastDriftMs = 0;

  constructor(
    private readonly hooks: TickLoopHooks,
    private readonly logger: Logger,
    private readonly intervalMs: number = TICK_INTERVAL_MS,
  ) {}

  isRunning(): boolean {
    return this.running;
  }

  getNextDueMs(): number {
    return this.nextDueMs;
  }

  getLastDriftMs(): number {
    return this.lastDriftMs;
  }

  /** ループ開始。次回 alarm を予約する。 */
  async start(nowMs: number): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.nextDueMs = nextTickDueMs(0, nowMs, this.intervalMs);
    await this.hooks.setAlarm(this.nextDueMs);
  }

  /** ループ停止。alarm を解除する。 */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.nextDueMs = 0;
    await this.hooks.deleteAlarm();
  }

  /**
   * alarm 発火時に呼ぶ。
   * 遅延ぶんだけ catch-up で stepFn を複数回呼ぶ（broadcast は呼び出し側で最後の tick だけにする運用）。
   *
   * @returns 実行した tick 数
   */
  async runDueTicks(nowMs: number, stepFn: (tickNowMs: number) => void): Promise<number> {
    if (!this.running) return 0;

    let executed = 0;
    // 過剰 catch-up 防止（極端な drift で無限ループしないように上限）
    const maxCatchup = 20;

    while (this.nextDueMs <= nowMs && executed < maxCatchup) {
      stepFn(this.nextDueMs);
      executed += 1;
      this.nextDueMs += this.intervalMs;
    }

    // drift 観測
    const drift = tickDriftMs(this.nextDueMs - this.intervalMs, nowMs);
    this.lastDriftMs = drift;
    if (drift > this.intervalMs * 2) {
      this.logger.warn('tick drift exceeded', { driftMs: drift, executed });
    }

    if (executed === maxCatchup) {
      this.logger.warn('tick catch-up clamped', { nowMs, nextDueMs: this.nextDueMs });
      // 大幅遅延時はリセット
      this.nextDueMs = nowMs + this.intervalMs;
    }

    // 次回 alarm 予約
    await this.hooks.setAlarm(this.nextDueMs);
    return executed;
  }
}
