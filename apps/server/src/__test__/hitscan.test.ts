import { describe, expect, it } from 'vitest';
import {
  PLAYER_PHYSICS,
  type ServerMessage,
  WEAPONS,
} from '@arigato/shared';

import { processShot } from '../combat/hitscan.js';
import { RespawnQueue } from '../combat/respawn.js';
import { createPlayerState } from '../room/player.js';
import { createInitialRoomState } from '../room/room-state.js';
import { transitionToPlaying } from '../room/phase.js';

interface SetupOpts {
  shooterTeam: 'red' | 'blue';
  targetTeam: 'red' | 'blue';
  targetPos: { x: number; y: number; z: number };
  weapon?: 'ar' | 'sg' | 'smg';
  targetAlive?: boolean;
  targetInvincible?: boolean;
}

function setup(opts: SetupOpts) {
  const state = createInitialRoomState('TESTHS');
  const shooter = createPlayerState({
    id: 'shooter',
    name: 'shooter',
    team: opts.shooterTeam,
    characterId: 'k2',
    spawn: { x: 0, y: 0, z: 0 },
    nowMs: 0,
    currentTick: 0,
  });
  const target = createPlayerState({
    id: 'target',
    name: 'target',
    team: opts.targetTeam,
    characterId: 'k2',
    spawn: opts.targetPos,
    nowMs: 0,
    currentTick: 0,
  });
  state.players['shooter'] = shooter;
  state.players['target'] = target;
  state.hostId = 'shooter';
  transitionToPlaying(state, 0);

  // transitionToPlaying がスポーン地点に飛ばすので、テスト用に再配置。
  state.players['shooter']!.position = { x: 0, y: 0, z: 0 };
  state.players['shooter']!.yaw = 0; // -Z 方向を向く
  state.players['shooter']!.pitch = 0;
  state.players['shooter']!.isInvincible = false;
  state.players['shooter']!.isAlive = true;
  state.players['shooter']!.hp = 100;

  state.players['target']!.position = { ...opts.targetPos };
  state.players['target']!.isAlive = opts.targetAlive ?? true;
  state.players['target']!.isInvincible = opts.targetInvincible ?? false;
  state.players['target']!.hp = 100;

  if (opts.weapon) {
    state.players['shooter']!.currentWeapon = opts.weapon;
  }
  return state;
}

describe('processShot', () => {
  it('正面の敵に当たって damage が入る + hit イベントを enqueue', () => {
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'blue',
      // 5m 前方（-Z 方向、頭の高さ）
      targetPos: { x: 0, y: 0, z: -5 },
      weapon: 'ar',
    });
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    const result = processShot(state, 'shooter', 'shot1', queue, 1000, (m) => events.push(m));
    expect(result.hits).toBeGreaterThan(0);
    expect(state.players['target']!.hp).toBeLessThan(100);
    const hitEvents = events.filter((e) => e.type === 'hit');
    expect(hitEvents.length).toBe(1);
  });

  it('フレンドリーファイア無効：同チームには当たらない', () => {
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'red',
      targetPos: { x: 0, y: 0, z: -5 },
      weapon: 'ar',
    });
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    const result = processShot(state, 'shooter', 'shot1', queue, 1000, (m) => events.push(m));
    expect(result.hits).toBe(0);
    expect(state.players['target']!.hp).toBe(100);
    expect(events).toEqual([]);
  });

  it('死亡中の敵には当たらない', () => {
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'blue',
      targetPos: { x: 0, y: 0, z: -5 },
      weapon: 'ar',
      targetAlive: false,
    });
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    const result = processShot(state, 'shooter', 'shot1', queue, 1000, (m) => events.push(m));
    expect(result.hits).toBe(0);
    expect(events).toEqual([]);
  });

  it('無敵中の敵には当たらない', () => {
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'blue',
      targetPos: { x: 0, y: 0, z: -5 },
      weapon: 'ar',
      targetInvincible: true,
    });
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    const result = processShot(state, 'shooter', 'shot1', queue, 1000, (m) => events.push(m));
    expect(result.hits).toBe(0);
    expect(events).toEqual([]);
  });

  it('SG はペレット数 (8) 分のレイを撃つ', () => {
    // SG は spread が大きいので、巨大な球を置いて確実に全弾命中させる：
    // target をすぐ前に置き、bodyRadius を超える spread でも当たるよう距離 1m に。
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'blue',
      targetPos: { x: 0, y: 0, z: -1 },
      weapon: 'sg',
    });
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    processShot(state, 'shooter', 'shot-sg', queue, 1000, (m) => events.push(m));
    // 全 8 ペレットが当たる保証はないが、SG は pellets=8 で複数回試行されること
    // を確認したいので「hit イベント数 >= 1 かつ <= 8」をチェック。
    const hitCount = events.filter((e) => e.type === 'hit').length;
    expect(WEAPONS.sg.pellets).toBe(8);
    expect(hitCount).toBeGreaterThanOrEqual(1);
    expect(hitCount).toBeLessThanOrEqual(WEAPONS.sg.pellets);
  });

  it('キル成立で kill_feed が enqueue され、リスポーンが予約される', () => {
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'blue',
      targetPos: { x: 0, y: 0, z: -5 },
      weapon: 'ar',
    });
    // 1 発でキルできるよう HP を低く設定
    state.players['target']!.hp = 1;
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    const result = processShot(state, 'shooter', 'shot-k', queue, 5000, (m) => events.push(m));
    expect(result.kills).toBe(1);
    expect(state.players['target']!.isAlive).toBe(false);
    expect(state.players['target']!.deaths).toBe(1);
    expect(state.players['shooter']!.kills).toBe(1);
    expect(state.teamKills.red).toBe(1);
    const kf = events.filter((e) => e.type === 'kill_feed');
    expect(kf.length).toBe(1);
    // リスポーン予約
    expect(queue.getDueMs('target')).not.toBeNull();
  });

  it('射手が死亡中なら何もしない', () => {
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'blue',
      targetPos: { x: 0, y: 0, z: -5 },
      weapon: 'ar',
    });
    state.players['shooter']!.isAlive = false;
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    const result = processShot(state, 'shooter', 'shot1', queue, 1000, (m) => events.push(m));
    expect(result.hits).toBe(0);
    expect(events).toEqual([]);
  });

  it('射手の origin は position + headHeight、direction は yaw/pitch 由来（自分自身に当たらない）', () => {
    const state = setup({
      shooterTeam: 'red',
      targetTeam: 'blue',
      // 後方に置いてレイから外す
      targetPos: { x: 0, y: 0, z: 10 },
      weapon: 'ar',
    });
    expect(PLAYER_PHYSICS.headHeight).toBeGreaterThan(0);
    const queue = new RespawnQueue();
    const events: ServerMessage[] = [];
    const result = processShot(state, 'shooter', 'shot1', queue, 1000, (m) => events.push(m));
    expect(result.hits).toBe(0); // 後ろは見ない
  });
});
