import { z } from 'zod';
import { NAME_MAX_LENGTH, ROOM_CODE_LENGTH } from './constants.js';

// ============================================================================
// 基本スキーマ
// ============================================================================

export const Vec3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
});

export const TeamSchema = z.enum(['red', 'blue']);

export const WeaponTypeSchema = z.enum(['ar', 'sg', 'smg']);

export const CharacterIdSchema = z.enum([
  'k2',
  'hyouga',
  'shuto',
  'daichi',
  'katsuya',
  'tsuchiga',
  'hide',
  'yugo',
  'iru',
]);

export const PlayerNameSchema = z
  .string()
  .min(1, '名前を入力してください')
  .max(NAME_MAX_LENGTH, `${NAME_MAX_LENGTH}文字以内で入力してください`)
  .regex(/^[^\s]+(?:\s[^\s]+)*$/, '前後の空白は使用できません');

export const RoomCodeSchema = z
  .string()
  .length(ROOM_CODE_LENGTH)
  .regex(/^[A-Z0-9]+$/, 'ルームコードは英数大文字のみです');

export const PlayerIdSchema = z.string().min(1);

// ============================================================================
// 入力スキーマ
// ============================================================================

export const PlayerInputSchema = z.object({
  tick: z.number().int().nonnegative(),
  moveX: z.number().min(-1).max(1),
  moveZ: z.number().min(-1).max(1),
  yaw: z.number().min(-Math.PI).max(Math.PI),
  pitch: z.number().min(-Math.PI / 2).max(Math.PI / 2),
  sprint: z.boolean(),
  jump: z.boolean(),
  fire: z.boolean(),
  reload: z.boolean(),
  weaponSwitch: WeaponTypeSchema.nullable(),
});

// ============================================================================
// ClientMessage スキーマ
// ============================================================================

export const ClientJoinRoomSchema = z.object({
  type: z.literal('join'),
  name: PlayerNameSchema,
  asHost: z.boolean(),
});

export const ClientSelectCharacterSchema = z.object({
  type: z.literal('select_character'),
  characterId: CharacterIdSchema,
});

export const ClientReadyToggleSchema = z.object({
  type: z.literal('ready_toggle'),
  ready: z.boolean(),
});

export const ClientHostShuffleTeamsSchema = z.object({
  type: z.literal('host_shuffle_teams'),
  assignments: z.record(PlayerIdSchema, TeamSchema).optional(),
});

export const ClientHostStartMatchSchema = z.object({
  type: z.literal('host_start_match'),
});

export const ClientInputSchema = z.object({
  type: z.literal('input'),
  input: PlayerInputSchema,
});

export const ClientShootSchema = z.object({
  type: z.literal('shoot'),
  shotId: z.string().min(1).max(64),
  origin: Vec3Schema,
  direction: Vec3Schema,
  clientTickMs: z.number().nonnegative(),
});

export const ClientMessageSchema = z.discriminatedUnion('type', [
  ClientJoinRoomSchema,
  ClientSelectCharacterSchema,
  ClientReadyToggleSchema,
  ClientHostShuffleTeamsSchema,
  ClientHostStartMatchSchema,
  ClientInputSchema,
  ClientShootSchema,
]);

export type ParsedClientMessage = z.infer<typeof ClientMessageSchema>;

// ============================================================================
// ServerMessage スキーマ（クライアント側受信検証用）
// サーバーは正常な JSON を送る前提だが、クライアントは防御的にパースする。
// ============================================================================

const QuatSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  w: z.number().finite(),
});
void QuatSchema;

const WeaponInstanceStateSchema = z.object({
  ammoInMag: z.number().int().nonnegative(),
  nextFireMs: z.number().nonnegative(),
});

const BodyPartSchema = z.enum(['head', 'body', 'leg', 'none']);

const PlayerStateSchema = z.object({
  id: PlayerIdSchema,
  name: z.string(),
  characterId: CharacterIdSchema,
  team: TeamSchema,
  position: Vec3Schema,
  velocity: Vec3Schema,
  yaw: z.number().finite(),
  pitch: z.number().finite(),
  hp: z.number().int(),
  isAlive: z.boolean(),
  isInvincible: z.boolean(),
  invincibleUntilMs: z.number().nonnegative(),
  currentWeapon: WeaponTypeSchema,
  weaponState: z.object({
    ar: WeaponInstanceStateSchema,
    sg: WeaponInstanceStateSchema,
    smg: WeaponInstanceStateSchema,
  }),
  isSprinting: z.boolean(),
  isReloading: z.boolean(),
  reloadEndMs: z.number().nonnegative(),
  kills: z.number().int().nonnegative(),
  deaths: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  headshots: z.number().int().nonnegative(),
  damageDealt: z.number().int().nonnegative(),
  lastInputTick: z.number().int().nonnegative(),
});

const RoomPhaseSchema = z.enum(['lobby', 'countdown', 'playing', 'finished']);

const PlayerMatchStatSchema = z.object({
  playerId: PlayerIdSchema,
  name: z.string(),
  characterId: CharacterIdSchema,
  team: TeamSchema,
  kills: z.number().int().nonnegative(),
  deaths: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  headshots: z.number().int().nonnegative(),
  damageDealt: z.number().int().nonnegative(),
});

const MatchResultSchema = z.object({
  winnerTeam: z.enum(['red', 'blue', 'draw']),
  teamKills: z.object({ red: z.number().int(), blue: z.number().int() }),
  mvpPlayerId: PlayerIdSchema,
  playerStats: z.array(PlayerMatchStatSchema),
});

const RoomStateSchema = z.object({
  code: RoomCodeSchema,
  hostId: PlayerIdSchema,
  phase: RoomPhaseSchema,
  players: z.record(PlayerIdSchema, PlayerStateSchema),
  matchStartMs: z.number(),
  matchDurationMs: z.number().nonnegative(),
  serverTick: z.number().int().nonnegative(),
  teamKills: z.object({ red: z.number().int(), blue: z.number().int() }),
  finalResult: MatchResultSchema.nullable(),
});

const PlayerSnapshotSchema = z.object({
  id: PlayerIdSchema,
  position: Vec3Schema,
  yaw: z.number().finite(),
  pitch: z.number().finite(),
  hp: z.number().int(),
  isAlive: z.boolean(),
  currentWeapon: WeaponTypeSchema,
  isReloading: z.boolean(),
  velocity: Vec3Schema,
  ammoInMag: z.number().int().nonnegative(),
  isInvincible: z.boolean(),
  reloadEndMs: z.number().nonnegative(),
});

const HitResultSchema = z.object({
  shotId: z.string(),
  shooterId: PlayerIdSchema,
  victimId: PlayerIdSchema.nullable(),
  hitPoint: Vec3Schema,
  bodyPart: BodyPartSchema,
  damage: z.number().nonnegative(),
  isKill: z.boolean(),
  isHeadshot: z.boolean(),
});

export const ServerWelcomeSchema = z.object({
  type: z.literal('welcome'),
  yourPlayerId: PlayerIdSchema,
  roomCode: RoomCodeSchema,
});

export const ServerRoomSnapshotSchema = z.object({
  type: z.literal('room_snapshot'),
  state: RoomStateSchema,
});

export const ServerCountdownSchema = z.object({
  type: z.literal('countdown'),
  secondsLeft: z.number().int().nonnegative(),
});

export const ServerSnapshotSchema = z.object({
  type: z.literal('snapshot'),
  tick: z.number().int().nonnegative(),
  serverTimeMs: z.number().nonnegative(),
  players: z.array(PlayerSnapshotSchema),
  matchTimeRemainingMs: z.number(),
  teamKills: z.object({ red: z.number().int(), blue: z.number().int() }),
});

export const ServerHitEventSchema = z.object({
  type: z.literal('hit'),
  result: HitResultSchema,
});

export const ServerKillFeedSchema = z.object({
  type: z.literal('kill_feed'),
  killerId: PlayerIdSchema,
  victimId: PlayerIdSchema,
  weapon: WeaponTypeSchema,
  isHeadshot: z.boolean(),
  tickMs: z.number().nonnegative(),
});

export const ServerMatchEndSchema = z.object({
  type: z.literal('match_end'),
  result: MatchResultSchema,
});

export const ServerErrorSchema = z.object({
  type: z.literal('error'),
  code: z.enum([
    'room_full',
    'invalid_action',
    'not_host',
    'name_taken',
    'rate_limited',
    'invalid_message',
  ]),
  message: z.string(),
});

export const ServerMessageSchema = z.discriminatedUnion('type', [
  ServerWelcomeSchema,
  ServerRoomSnapshotSchema,
  ServerCountdownSchema,
  ServerSnapshotSchema,
  ServerHitEventSchema,
  ServerKillFeedSchema,
  ServerMatchEndSchema,
  ServerErrorSchema,
]);

export type ParsedServerMessage = z.infer<typeof ServerMessageSchema>;

// ============================================================================
// ヘルパー
// ============================================================================

/**
 * 任意の値を ClientMessage として安全にパース。
 * 失敗時は null を返し、サーバー側で破棄する。
 */
export function tryParseClientMessage(raw: unknown): ParsedClientMessage | null {
  const result = ClientMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * JSON 文字列を ClientMessage としてパース。
 * JSON parse 失敗・スキーマ違反いずれも null を返す。
 */
export function tryParseClientMessageJson(json: string): ParsedClientMessage | null {
  try {
    const parsed: unknown = JSON.parse(json);
    return tryParseClientMessage(parsed);
  } catch {
    return null;
  }
}

/**
 * 任意の値を ServerMessage として安全にパース（クライアント側使用）。
 * 失敗時は null を返す。
 */
export function tryParseServerMessage(raw: unknown): ParsedServerMessage | null {
  const result = ServerMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/**
 * JSON 文字列を ServerMessage としてパース（クライアント側使用）。
 */
export function tryParseServerMessageJson(json: string): ParsedServerMessage | null {
  try {
    const parsed: unknown = JSON.parse(json);
    return tryParseServerMessage(parsed);
  } catch {
    return null;
  }
}
