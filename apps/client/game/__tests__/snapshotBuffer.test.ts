import { describe, it, expect } from 'vitest';
import { SnapshotBuffer } from '../net/snapshotBuffer';
import type { ServerSnapshot } from '@arigato/shared';

function mkSnap(serverTimeMs: number, tick: number): ServerSnapshot {
  return {
    type: 'snapshot',
    tick,
    serverTimeMs,
    players: [
      {
        id: 'p1',
        position: { x: tick, y: 0, z: 0 },
        yaw: 0,
        pitch: 0,
        hp: 100,
        isAlive: true,
        currentWeapon: 'ar',
        isReloading: false,
        velocity: { x: 0, y: 0, z: 0 },
        ammoInMag: 30,
        isInvincible: false,
        reloadEndMs: 0,
      },
    ],
    matchTimeRemainingMs: 180000,
    teamKills: { red: 0, blue: 0 },
  };
}

describe('SnapshotBuffer', () => {
  it('push した順に latestServerTimeMs が更新される', () => {
    const buf = new SnapshotBuffer();
    expect(buf.latestServerTimeMs()).toBeNull();
    buf.push(mkSnap(100, 0), 0);
    expect(buf.latestServerTimeMs()).toBe(100);
    buf.push(mkSnap(150, 1), 50);
    expect(buf.latestServerTimeMs()).toBe(150);
  });

  it('逆順や同時刻 snapshot は無視される', () => {
    const buf = new SnapshotBuffer();
    buf.push(mkSnap(100, 0), 0);
    buf.push(mkSnap(150, 1), 50);
    buf.push(mkSnap(120, 99), 60); // 古いものは無視
    buf.push(mkSnap(150, 99), 70); // 同時刻も無視
    expect(buf.size).toBe(2);
    expect(buf.latestServerTimeMs()).toBe(150);
  });

  it('findPair: prev/next が renderTime を挟む', () => {
    const buf = new SnapshotBuffer();
    buf.push(mkSnap(100, 0), 0);
    buf.push(mkSnap(150, 1), 50);
    buf.push(mkSnap(200, 2), 100);
    const pair = buf.findPair(160);
    expect(pair).not.toBeNull();
    expect(pair?.prev.serverTimeMs).toBe(150);
    expect(pair?.next.serverTimeMs).toBe(200);
  });

  it('findPair: バッファに 2 件未満なら null', () => {
    const buf = new SnapshotBuffer();
    expect(buf.findPair(0)).toBeNull();
    buf.push(mkSnap(100, 0), 0);
    expect(buf.findPair(50)).toBeNull();
  });

  it('clear で空に戻る', () => {
    const buf = new SnapshotBuffer();
    buf.push(mkSnap(100, 0), 0);
    buf.push(mkSnap(150, 1), 50);
    buf.clear();
    expect(buf.size).toBe(0);
    expect(buf.latestServerTimeMs()).toBeNull();
  });
});
