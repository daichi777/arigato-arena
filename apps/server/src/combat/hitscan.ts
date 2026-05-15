import {
  type BodyPart,
  type HitResult,
  PLAYER_PHYSICS,
  type PlayerId,
  type PlayerState,
  RESPAWN_DELAY_MS,
  type RoomState,
  type ServerHitEvent,
  type ServerKillFeed,
  type ServerMessage,
  type Vec3,
  WEAPONS,
} from '@arigato/shared';

import { listPlayers } from '../room/room-state.js';
import { computeDamage } from './damage.js';
import { intersectRaySphere, sphericalToDirection, vec3Normalize } from './raycast.js';
import type { RespawnQueue } from './respawn.js';

/**
 * 部位ヒットの中間表現。
 */
interface PartCandidate {
  victim: PlayerState;
  bodyPart: BodyPart;
  t: number;
  point: Vec3;
}

/**
 * shooter から見た target の頭/胴/脚の球を生成する。
 * 中心座標は target.position（足元基準 y=0）を起点に PLAYER_PHYSICS のオフセットを加える。
 */
function buildHitboxes(target: PlayerState): { part: Exclude<BodyPart, 'none'>; center: Vec3; radius: number }[] {
  const base = target.position;
  return [
    {
      part: 'head',
      center: { x: base.x, y: base.y + PLAYER_PHYSICS.headHeight, z: base.z },
      radius: PLAYER_PHYSICS.headRadius,
    },
    {
      part: 'body',
      center: { x: base.x, y: base.y + PLAYER_PHYSICS.bodyHeight, z: base.z },
      radius: PLAYER_PHYSICS.bodyRadius,
    },
    {
      part: 'leg',
      center: { x: base.x, y: base.y + PLAYER_PHYSICS.legHeight, z: base.z },
      radius: PLAYER_PHYSICS.bodyRadius * 0.6,
    },
  ];
}

/**
 * 1 本のレイで全ターゲットの全部位を判定し、最近接ヒットを返す。
 * - 自分自身、死亡中、無敵中、同チームはスキップ
 * - maxRange を超える t は不採用
 */
function castSingleRay(
  shooter: PlayerState,
  origin: Vec3,
  direction: Vec3,
  targets: PlayerState[],
  maxRange: number,
): PartCandidate | null {
  let best: PartCandidate | null = null;
  for (const target of targets) {
    if (target.id === shooter.id) continue;
    if (!target.isAlive) continue;
    if (target.isInvincible) continue;
    if (target.team === shooter.team) continue;
    for (const hb of buildHitboxes(target)) {
      const hit = intersectRaySphere(origin, direction, hb.center, hb.radius, maxRange);
      if (!hit.hit) continue;
      if (best === null || hit.t < best.t) {
        best = { victim: target, bodyPart: hb.part, t: hit.t, point: hit.point };
      }
    }
  }
  return best;
}

/**
 * 決定論的だが射手ごとに分散する spread 用 RNG。
 * shotId と pellet index で再現性を保つ。LCG ベースの単純実装。
 */
function spreadRng(seed: string, pelletIdx: number): { dx: number; dy: number } {
  // 文字列ハッシュ (djb2 派生)
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  }
  // 2 つの値を生成するため pelletIdx を 2 つの乱数に分ける
  const a = Math.abs((h ^ (pelletIdx * 2654435761)) | 0) % 100000;
  const b = Math.abs((h ^ ((pelletIdx * 2 + 1) * 2246822519)) | 0) % 100000;
  // [-1, 1] に正規化
  return {
    dx: (a / 50000) - 1,
    dy: (b / 50000) - 1,
  };
}

/**
 * spread 適用 (単純な軸ずらし)。
 * - direction を正規化して、yaw/pitch 方向の小さなオフセットを加算 → 再正規化
 * - 厳密なコーン乱数ではないが MVP では十分（SG 判定の妥当性を保てる）。
 */
function applySpread(direction: Vec3, spread: number, dx: number, dy: number): Vec3 {
  if (spread <= 0) return direction;
  // 適当な右ベクトルと上ベクトルを作る。direction とほぼ直交する基底を構築。
  // 上向き世界基準 Y で外積を取る。direction がほぼ真上/下なら別の基底を採る。
  const upWorld: Vec3 = Math.abs(direction.y) > 0.99 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const right = vec3Normalize({
    x: direction.y * upWorld.z - direction.z * upWorld.y,
    y: direction.z * upWorld.x - direction.x * upWorld.z,
    z: direction.x * upWorld.y - direction.y * upWorld.x,
  });
  const up = vec3Normalize({
    x: right.y * direction.z - right.z * direction.y,
    y: right.z * direction.x - right.x * direction.z,
    z: right.x * direction.y - right.y * direction.x,
  });
  return vec3Normalize({
    x: direction.x + right.x * dx * spread + up.x * dy * spread,
    y: direction.y + right.y * dx * spread + up.y * dy * spread,
    z: direction.z + right.z * dx * spread + up.z * dy * spread,
  });
}

/**
 * 1 発分の射撃をサーバー権威で処理する。
 *
 * - origin/direction はサーバー側で shooter から再計算（クライアント値は信頼しない）
 * - SG なら weapon.pellets 数だけ spread 適用してレイキャスト
 * - 各ヒットごとに HP 減算 / キル判定 / リスポーン予約 / Hit/KillFeed メッセージを enqueue
 *
 * 戻り値は試合中の集計向け（hit/kill 件数）。テストで使う。
 */
export interface ProcessShotResult {
  hits: number;
  kills: number;
}

export function processShot(
  state: RoomState,
  shooterId: PlayerId,
  shotId: string,
  respawnQueue: RespawnQueue,
  nowMs: number,
  enqueueBroadcast: (msg: ServerMessage) => void,
): ProcessShotResult {
  const shooter = state.players[shooterId];
  if (!shooter || !shooter.isAlive) {
    return { hits: 0, kills: 0 };
  }

  const weapon = shooter.currentWeapon;
  const cfg = WEAPONS[weapon];
  const origin: Vec3 = {
    x: shooter.position.x,
    y: shooter.position.y + PLAYER_PHYSICS.headHeight,
    z: shooter.position.z,
  };
  const baseDir = sphericalToDirection(shooter.yaw, shooter.pitch);

  const targets = listPlayers(state);
  let hits = 0;
  let kills = 0;

  const pellets = Math.max(1, cfg.pellets);
  for (let i = 0; i < pellets; i += 1) {
    let dir = baseDir;
    if (cfg.spread > 0 && pellets > 1) {
      const { dx, dy } = spreadRng(shotId, i);
      dir = applySpread(baseDir, cfg.spread, dx, dy);
    } else if (cfg.spread > 0) {
      // 単発武器でも spread を反映（決定論的にゼロでない微小ばらつき）
      const { dx, dy } = spreadRng(shotId, 0);
      dir = applySpread(baseDir, cfg.spread, dx, dy);
    }

    const cand = castSingleRay(shooter, origin, dir, targets, cfg.maxRange);
    if (!cand) continue;

    const dist = cand.t;
    const damage = computeDamage(weapon, cand.bodyPart, dist);
    if (damage <= 0) continue;

    const victim = cand.victim;
    const beforeHp = victim.hp;
    victim.hp = Math.max(0, victim.hp - damage);
    const actualDamage = beforeHp - victim.hp;
    shooter.damageDealt += actualDamage;
    hits += 1;

    const isKill = victim.hp <= 0 && victim.isAlive;
    if (isKill) {
      victim.isAlive = false;
      victim.deaths += 1;
      shooter.kills += 1;
      state.teamKills[shooter.team] += 1;
      if (cand.bodyPart === 'head') {
        shooter.headshots += 1;
      }
      respawnQueue.schedule(victim.id, nowMs + RESPAWN_DELAY_MS);
      kills += 1;
    }

    const hitResult: HitResult = {
      shotId,
      shooterId: shooter.id,
      victimId: victim.id,
      hitPoint: cand.point,
      bodyPart: cand.bodyPart,
      damage: actualDamage,
      isKill,
      isHeadshot: cand.bodyPart === 'head',
    };
    const hitMsg: ServerHitEvent = { type: 'hit', result: hitResult };
    enqueueBroadcast(hitMsg);

    if (isKill) {
      const feed: ServerKillFeed = {
        type: 'kill_feed',
        killerId: shooter.id,
        victimId: victim.id,
        weapon,
        isHeadshot: cand.bodyPart === 'head',
        tickMs: nowMs,
      };
      enqueueBroadcast(feed);
    }
  }

  return { hits, kills };
}
