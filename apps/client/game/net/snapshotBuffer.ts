import type { PlayerSnapshot, ServerSnapshot } from '@arigato/shared';
import type { BufferedSnapshot } from '../types';
import { SNAPSHOT_BUFFER_MAX } from '../constants';

/**
 * サーバー snapshot を時系列に蓄積するリングバッファ。
 *
 * 不変条件:
 * - 内部配列は `serverTimeMs` の昇順を維持する。
 * - 古いものから捨てる（getInterpolationPair が必要としない範囲）。
 * - SNAPSHOT_BUFFER_MAX を超えたら先頭を drop。
 */
export class SnapshotBuffer {
  private readonly buffer: BufferedSnapshot[] = [];

  push(snapshot: ServerSnapshot, clientNowMs: number): void {
    const players = new Map<string, PlayerSnapshot>();
    for (const p of snapshot.players) {
      players.set(p.id, p);
    }
    const entry: BufferedSnapshot = {
      clientReceivedAtMs: clientNowMs,
      serverTimeMs: snapshot.serverTimeMs,
      players,
    };

    // 通常はサーバー時刻順に来るが、稀な逆順は無視（より古いものは捨てる）
    const last = this.buffer[this.buffer.length - 1];
    if (last && entry.serverTimeMs <= last.serverTimeMs) {
      return;
    }

    this.buffer.push(entry);
    while (this.buffer.length > SNAPSHOT_BUFFER_MAX) {
      this.buffer.shift();
    }
  }

  /** テスト用：内部バッファのスナップショットを取得 */
  snapshot(): readonly BufferedSnapshot[] {
    return this.buffer;
  }

  /**
   * 「描画時刻 = 最新サーバー時刻 - delayMs」となる時刻に対する prev/next を返す。
   * バッファが足りない場合は null。
   */
  findPair(renderServerTimeMs: number): { prev: BufferedSnapshot; next: BufferedSnapshot } | null {
    if (this.buffer.length < 2) return null;

    for (let i = this.buffer.length - 1; i > 0; i--) {
      const next = this.buffer[i];
      const prev = this.buffer[i - 1];
      if (!next || !prev) continue;
      if (prev.serverTimeMs <= renderServerTimeMs && renderServerTimeMs <= next.serverTimeMs) {
        return { prev, next };
      }
    }
    return null;
  }

  /** 最新サーバー時刻（バッファ空なら null） */
  latestServerTimeMs(): number | null {
    const last = this.buffer[this.buffer.length - 1];
    return last ? last.serverTimeMs : null;
  }

  /** バッファをクリア（試合切替時など） */
  clear(): void {
    this.buffer.length = 0;
  }

  get size(): number {
    return this.buffer.length;
  }
}
