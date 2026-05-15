import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ClientInput,
  ClientShoot,
  PlayerId,
  Vec3,
  WeaponType,
} from '@arigato/shared';
import { WEAPONS } from '@arigato/shared';
import { ShootSender } from '../net/shootSender';
import type { GameConnection, GameMessageListener } from '../net/gameMessages';
import type { LookRef } from '../types';

/** ClientShoot だけを受け取る最小モック connection */
class MockConnection implements GameConnection {
  readonly sent: (ClientInput | ClientShoot)[] = [];
  private opened = true;
  private listeners = new Set<GameMessageListener>();
  private selfId: PlayerId | null = 'self';

  subscribe(fn: GameMessageListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  send(msg: ClientInput | ClientShoot): void {
    this.sent.push(msg);
  }

  getYourPlayerId(): PlayerId | null {
    return this.selfId;
  }

  isOpen(): boolean {
    return this.opened;
  }

  setOpen(o: boolean): void {
    this.opened = o;
  }
}

function makeSender(opts: {
  weapon?: WeaponType;
  fire?: boolean;
  pos?: Vec3 | null;
  locked?: boolean;
  now?: () => number;
  uuid?: () => string;
}): {
  sender: ShootSender;
  conn: MockConnection;
  keys: { current: { fire: boolean } };
  look: { current: LookRef };
  pos: { current: Vec3 | null };
  weaponRef: { current: WeaponType };
} {
  const conn = new MockConnection();
  const keys = { current: { fire: opts.fire ?? false } };
  const look = { current: { yaw: 0, pitch: 0 } as LookRef };
  const pos = {
    current: (opts.pos === undefined ? { x: 1, y: 2, z: 3 } : opts.pos) as Vec3 | null,
  };
  const weaponRef = { current: opts.weapon ?? 'ar' };

  const sender = new ShootSender(
    conn,
    keys,
    look,
    pos,
    () => weaponRef.current,
    () => opts.locked ?? true,
    opts.now ?? (() => 0),
    opts.uuid ?? defaultIncUuid(),
  );

  return { sender, conn, keys, look, pos, weaponRef };
}

function defaultIncUuid(): () => string {
  let i = 0;
  return () => `shot-${i++}`;
}

describe('ShootSender', () => {
  beforeEach(() => {
    // 個別テストで状態をリセット
  });

  it('fire の立ち上がりエッジで 1 度だけ ClientShoot を送る', () => {
    const { sender, conn, keys } = makeSender({});
    // 初回: fire=false → 送信しない
    sender.tick();
    expect(conn.sent).toHaveLength(0);

    // fire を true に
    keys.current.fire = true;
    sender.tick();
    expect(conn.sent).toHaveLength(1);
    expect(conn.sent[0]?.type).toBe('shoot');

    // 同じフレームの直後（now=0 のまま）に再度呼んでも、押下継続中は fireInterval 未満なので追加送信されない
    sender.tick();
    expect(conn.sent).toHaveLength(1);
  });

  it('押下継続中は武器の fireIntervalMs に従って連射する', () => {
    let t = 0;
    const ar = WEAPONS.ar.fireIntervalMs; // 100
    const { sender, conn, keys } = makeSender({
      weapon: 'ar',
      now: () => t,
    });
    keys.current.fire = true;

    // 立ち上がり: 送信
    sender.tick();
    expect(conn.sent).toHaveLength(1);

    // 50ms 後: まだ閾値未満
    t = 50;
    sender.tick();
    expect(conn.sent).toHaveLength(1);

    // 100ms 後: 閾値以上 → 2 発目
    t = 100;
    sender.tick();
    expect(conn.sent).toHaveLength(2);

    // さらに 50ms 後: まだ
    t = 150;
    sender.tick();
    expect(conn.sent).toHaveLength(2);

    // 200ms 後: 3 発目
    t = 200;
    sender.tick();
    expect(conn.sent).toHaveLength(3);

    // 武器変更 (sg, 700ms) → 押下継続だが、interval を満たさない間は送らない
    void ar;
  });

  it('shotId はすべて一意', () => {
    let t = 0;
    const { sender, conn, keys } = makeSender({
      weapon: 'smg',
      now: () => t,
    });
    keys.current.fire = true;
    for (let i = 0; i < 5; i++) {
      sender.tick();
      t += WEAPONS.smg.fireIntervalMs;
    }
    const ids = new Set(
      conn.sent.map((m) => (m.type === 'shoot' ? m.shotId : '')),
    );
    expect(ids.size).toBe(conn.sent.length);
    expect(conn.sent.length).toBeGreaterThanOrEqual(2);
  });

  it('pointer lock 中でないと送信しない', () => {
    const { sender, conn, keys } = makeSender({ locked: false });
    keys.current.fire = true;
    sender.tick();
    expect(conn.sent).toHaveLength(0);
  });

  it('接続が閉じている間は送信しない', () => {
    const { sender, conn, keys } = makeSender({});
    conn.setOpen(false);
    keys.current.fire = true;
    sender.tick();
    expect(conn.sent).toHaveLength(0);
  });

  it('localPlayerPositionRef が null の場合は送信しない', () => {
    const { sender, conn, keys } = makeSender({ pos: null });
    keys.current.fire = true;
    sender.tick();
    expect(conn.sent).toHaveLength(0);
  });

  it('fire を離して再押下した場合は立ち上がりエッジで再送信', () => {
    let t = 0;
    const { sender, conn, keys } = makeSender({
      weapon: 'ar',
      now: () => t,
    });
    keys.current.fire = true;
    sender.tick();
    expect(conn.sent).toHaveLength(1);

    // 離す
    keys.current.fire = false;
    sender.tick();
    expect(conn.sent).toHaveLength(1);

    // 即押下：interval を待たずに立ち上がりエッジで送信される
    t = 5; // interval (100ms) には満たない
    keys.current.fire = true;
    sender.tick();
    expect(conn.sent).toHaveLength(2);
  });

  it('origin は localPlayerPosition + (0, headHeight, 0)', () => {
    const { sender, conn, keys } = makeSender({
      pos: { x: 1, y: 2, z: 3 },
    });
    keys.current.fire = true;
    sender.tick();
    const msg = conn.sent[0];
    if (!msg || msg.type !== 'shoot') throw new Error('expected shoot');
    expect(msg.origin.x).toBeCloseTo(1, 5);
    expect(msg.origin.y).toBeGreaterThan(2);
    expect(msg.origin.z).toBeCloseTo(3, 5);
  });

  it('yaw=0, pitch=0 では direction が前方 (0,0,-1)', () => {
    const { sender, conn, keys } = makeSender({});
    keys.current.fire = true;
    sender.tick();
    const msg = conn.sent[0];
    if (!msg || msg.type !== 'shoot') throw new Error('expected shoot');
    expect(msg.direction.x).toBeCloseTo(0, 5);
    expect(msg.direction.y).toBeCloseTo(0, 5);
    expect(msg.direction.z).toBeCloseTo(-1, 5);
  });
});
