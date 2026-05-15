import {
  MATCH_DURATION_MS,
  type PlayerId,
  type PlayerState,
  type RoomCode,
  type RoomState,
  SPAWN_POINTS,
  type Team,
  type Vec3,
} from '@arigato/shared';

/**
 * 新規ルームの初期状態を作る。
 * - 最初の参加者がホストになるので、hostId は join 時に上書き前提で空文字。
 * - 試合タイマー等は playing 遷移時に書き換える。
 */
export function createInitialRoomState(code: RoomCode): RoomState {
  return {
    code,
    hostId: '',
    phase: 'lobby',
    players: {},
    matchStartMs: 0,
    matchDurationMs: MATCH_DURATION_MS,
    serverTick: 0,
    teamKills: { red: 0, blue: 0 },
    finalResult: null,
  };
}

/**
 * 指定チームの占有済みスポーン地点を考慮しつつスポーン地点を割り当てる。
 * - 空きがあれば未使用のスポーンを優先（リスポーンキル軽減）。
 * - 全占有なら先頭にフォールバック。
 * - ロビーフェーズの初期配置とリスポーンの両方で使える純粋関数。
 */
export function assignSpawn(team: Team, occupied: Iterable<Vec3>, randomFn: () => number = Math.random): Vec3 {
  const candidates = SPAWN_POINTS[team];
  const occSet = new Set<string>();
  for (const v of occupied) {
    occSet.add(spawnKey(v));
  }
  const free = candidates.filter((c) => !occSet.has(spawnKey(c)));
  const pool = free.length > 0 ? free : candidates;
  const idx = Math.floor(randomFn() * pool.length);
  const picked = pool[Math.min(idx, pool.length - 1)] ?? candidates[0]!;
  return { x: picked.x, y: picked.y, z: picked.z };
}

function spawnKey(v: Vec3): string {
  return `${v.x}:${v.y}:${v.z}`;
}

/**
 * 次に小さいチームを返す（チーム人数バランス補助）。
 * 同数なら red を返す（恣意的だが決定論的）。
 */
export function pickBalancedTeam(state: RoomState): Team {
  let red = 0;
  let blue = 0;
  for (const p of Object.values(state.players)) {
    if (p.team === 'red') red += 1;
    else blue += 1;
  }
  return red <= blue ? 'red' : 'blue';
}

/** state.players の値を配列で返すヘルパ。Object.values の薄いラッパ。 */
export function listPlayers(state: RoomState): PlayerState[] {
  return Object.values(state.players);
}

/** ホストが切断した時、残った参加者から次のホストを選ぶ。0人なら null。 */
export function pickNextHost(state: RoomState, excludeId: PlayerId): PlayerId | null {
  for (const id of Object.keys(state.players)) {
    if (id !== excludeId) {
      return id;
    }
  }
  return null;
}

/** あるチームの現在スポーン使用状況を返す（spawn割当用の入力） */
export function teamSpawnOccupancy(state: RoomState, team: Team): Vec3[] {
  return listPlayers(state)
    .filter((p) => p.team === team)
    .map((p) => p.position);
}
