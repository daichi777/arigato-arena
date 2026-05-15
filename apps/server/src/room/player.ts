import {
  type CharacterId,
  PLAYER_INITIAL_HP,
  PLAYER_INITIAL_WEAPON,
  type PlayerId,
  type PlayerState,
  type Team,
  type Vec3,
  WEAPONS,
  type WeaponInstanceState,
  type WeaponType,
} from '@arigato/shared';

/** 9キャラの順序固定リスト（重複時の選択補助用） */
export const CHARACTER_ORDER: readonly CharacterId[] = [
  'k2',
  'hyouga',
  'shuto',
  'daichi',
  'katsuya',
  'tsuchiga',
  'hide',
  'yugo',
  'iru',
];

/**
 * 既に部屋にいる占有キャラを除いて、初期割り当て候補を返す。
 * 9キャラ < 最大10人なので必ず重複が起きる。MVPでは「使われていない順」を優先。
 */
export function pickInitialCharacter(occupied: Iterable<CharacterId>): CharacterId {
  const used = new Set<CharacterId>(occupied);
  for (const id of CHARACTER_ORDER) {
    if (!used.has(id)) {
      return id;
    }
  }
  // 全員埋まっていたら先頭を返す（10人目のフォールバック）。
  return CHARACTER_ORDER[0]!;
}

/** 武器スロット3種を初期化（マガジンフル、即射撃可能） */
export function createInitialWeaponState(): Record<WeaponType, WeaponInstanceState> {
  return {
    ar: { ammoInMag: WEAPONS.ar.magSize, nextFireMs: 0 },
    sg: { ammoInMag: WEAPONS.sg.magSize, nextFireMs: 0 },
    smg: { ammoInMag: WEAPONS.smg.magSize, nextFireMs: 0 },
  };
}

export interface CreatePlayerArgs {
  id: PlayerId;
  name: string;
  team: Team;
  characterId: CharacterId;
  spawn: Vec3;
  nowMs: number;
  currentTick: number;
}

/**
 * 新規 PlayerState を作る純粋関数。
 * - スポーン地点と現在 tick を引数で受け取る（I/O を含めない）。
 * - 無敵時間は 0ms（lobby なのでまだ意味を持たない）。playing 遷移時に再設定する想定。
 */
export function createPlayerState(args: CreatePlayerArgs): PlayerState {
  return {
    id: args.id,
    name: args.name.slice(0, 16),
    characterId: args.characterId,
    team: args.team,

    position: { x: args.spawn.x, y: args.spawn.y, z: args.spawn.z },
    velocity: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,

    hp: PLAYER_INITIAL_HP,
    isAlive: true,
    isInvincible: false,
    invincibleUntilMs: 0,

    currentWeapon: PLAYER_INITIAL_WEAPON,
    weaponState: createInitialWeaponState(),

    isSprinting: false,
    isReloading: false,
    reloadEndMs: 0,

    kills: 0,
    deaths: 0,
    assists: 0,
    headshots: 0,
    damageDealt: 0,

    lastInputTick: args.currentTick,
  };
}

/**
 * プレイヤーを指定スポーン地点にリセットする（副作用あり）。
 * Day2 のリスポーン処理で再利用予定。Day1 では未使用だが純粋関数として用意。
 */
export function respawnPlayer(player: PlayerState, spawn: Vec3, nowMs: number, invincibleMs: number): void {
  player.position = { x: spawn.x, y: spawn.y, z: spawn.z };
  player.velocity = { x: 0, y: 0, z: 0 };
  player.hp = PLAYER_INITIAL_HP;
  player.isAlive = true;
  player.isInvincible = invincibleMs > 0;
  player.invincibleUntilMs = nowMs + invincibleMs;
  player.isReloading = false;
  player.reloadEndMs = 0;
  player.weaponState = createInitialWeaponState();
}
