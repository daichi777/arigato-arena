import {
  type PlayerId,
  type RoomState,
  SPAWN_INVINCIBLE_MS,
} from '@arigato/shared';

import { assignSpawn, listPlayers } from '../room/room-state.js';
import { respawnPlayer } from '../room/player.js';

/**
 * リスポーン待ち行列。
 *
 * - schedule(): プレイヤーID をリスポーン予定時刻つきで登録
 * - drainDue(): nowMs 以下になった予定を取り出して内部から削除
 * - cancel(): 切断などで予定を取り消す
 * - clear(): 全削除
 *
 * 設計方針:
 *  - 1 プレイヤーに対して最後の schedule のみ有効（再死亡時の上書き安全）。
 *  - Map なので順序保証は呼ばれた順（drainDue は時刻昇順でソートして返す）。
 */
export class RespawnQueue {
  private readonly scheduled: Map<PlayerId, number> = new Map();

  schedule(playerId: PlayerId, atMs: number): void {
    this.scheduled.set(playerId, atMs);
  }

  /** nowMs <= dueMs なプレイヤーIDを取り出し、内部から削除する */
  drainDue(nowMs: number): PlayerId[] {
    const due: { id: PlayerId; at: number }[] = [];
    for (const [id, at] of this.scheduled) {
      if (at <= nowMs) due.push({ id, at });
    }
    due.sort((a, b) => a.at - b.at);
    for (const { id } of due) {
      this.scheduled.delete(id);
    }
    return due.map((d) => d.id);
  }

  cancel(playerId: PlayerId): void {
    this.scheduled.delete(playerId);
  }

  clear(): void {
    this.scheduled.clear();
  }

  /** テスト用: 現在キューにいる件数 */
  size(): number {
    return this.scheduled.size;
  }

  /** テスト用: 指定プレイヤーの予定時刻（無ければ null） */
  getDueMs(playerId: PlayerId): number | null {
    return this.scheduled.get(playerId) ?? null;
  }
}

/**
 * 期限が来たリスポーンを処理する。
 * - 既に部屋から消えたプレイヤーは黙って無視
 * - 同チームの占有スポーンを避けて配置
 * - respawnPlayer で HP/装備/弾薬/無敵を初期化
 */
export function processRespawns(state: RoomState, queue: RespawnQueue, nowMs: number): void {
  const dueIds = queue.drainDue(nowMs);
  if (dueIds.length === 0) return;

  for (const pid of dueIds) {
    const player = state.players[pid];
    if (!player) continue;
    const occupied = listPlayers(state)
      .filter((p) => p.team === player.team && p.isAlive && p.id !== pid)
      .map((p) => p.position);
    const spawn = assignSpawn(player.team, occupied);
    respawnPlayer(player, spawn, nowMs, SPAWN_INVINCIBLE_MS);
  }
}
