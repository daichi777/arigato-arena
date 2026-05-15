import type {
  PlayerSnapshot,
  RoomState,
  ServerRoomSnapshot,
  ServerSnapshot,
} from '@arigato/shared';

import { matchTimeRemainingMs } from '../room/phase.js';

/**
 * 試合中スナップショット（playing フェーズ用）を構築する。
 * - 軽量化のため位置・速度・視点・武器状態のみ。
 * - HP は死亡判定の同期に使う（Day2でhitscan実装後に意味を持つ）。
 */
export function buildServerSnapshot(state: RoomState, nowMs: number): ServerSnapshot {
  const players: PlayerSnapshot[] = Object.values(state.players).map((p) => ({
    id: p.id,
    position: { x: p.position.x, y: p.position.y, z: p.position.z },
    yaw: p.yaw,
    pitch: p.pitch,
    hp: p.hp,
    isAlive: p.isAlive,
    currentWeapon: p.currentWeapon,
    isReloading: p.isReloading,
    velocity: { x: p.velocity.x, y: p.velocity.y, z: p.velocity.z },
    ammoInMag: p.weaponState[p.currentWeapon].ammoInMag,
    isInvincible: p.isInvincible,
    reloadEndMs: p.reloadEndMs,
  }));

  return {
    type: 'snapshot',
    tick: state.serverTick,
    serverTimeMs: nowMs,
    players,
    matchTimeRemainingMs: matchTimeRemainingMs(state, nowMs),
    teamKills: { red: state.teamKills.red, blue: state.teamKills.blue },
  };
}

/**
 * lobby / countdown / finished フェーズ用：フル RoomState を送る。
 * クライアントはこれを見てロビーUIを描画する。
 */
export function buildRoomSnapshot(state: RoomState): ServerRoomSnapshot {
  return {
    type: 'room_snapshot',
    // 参照渡しを避けるため players のみシャローコピー（PlayerState 自体は読み取り専用扱い）
    state: {
      ...state,
      players: { ...state.players },
      teamKills: { ...state.teamKills },
    },
  };
}
