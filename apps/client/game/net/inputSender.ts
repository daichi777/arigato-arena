import type { ClientInput, PlayerInput } from '@arigato/shared';
import type { GameConnection } from './gameMessages';

/**
 * 20Hz で PlayerInput をサーバーへ送信する送信器。
 *
 * 設計方針:
 * - 入力収集（キーボード / マウス）は描画側で ref に積み、送信時に snapshot を取る。
 * - jump / reload はエッジを「消費」する責務を持つ：build 関数が edge 値を返した後、
 *   呼び出し側で edge ref を false に戻すこと。
 * - 接続が閉じている間は send をスキップ（再接続は lobby agent 側の責務）。
 */
export class InputSender {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private tick = 0;

  constructor(
    private readonly connection: GameConnection,
    private readonly getInput: (tick: number) => PlayerInput,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.intervalHandle !== null) return;
    this.intervalHandle = setInterval(() => this.sendOnce(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /** テスト用：1tick だけ送る */
  sendOnce(): void {
    if (!this.connection.isOpen()) return;
    const input = this.getInput(this.tick);
    const msg: ClientInput = { type: 'input', input };
    this.connection.send(msg);
    this.tick++;
  }

  /** テスト用：内部 tick を参照 */
  getTick(): number {
    return this.tick;
  }
}
