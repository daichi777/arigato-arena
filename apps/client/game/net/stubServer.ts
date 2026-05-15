import type {
  ClientInput,
  ClientShoot,
  PlayerId,
  PlayerSnapshot,
  ServerSnapshot,
  Team,
} from '@arigato/shared';
import { MATCH_DURATION_MS, TICK_INTERVAL_MS } from '@arigato/shared';
import type { GameConnection, GameMessageListener } from './gameMessages';

interface StubBot {
  id: PlayerId;
  team: Team;
  /** 円軌道のパラメータ */
  radius: number;
  speed: number;
  /** 位相オフセット（秒） */
  phase: number;
  centerX: number;
  centerZ: number;
}

/**
 * サーバー無しで renderer を駆動するスタブ接続。
 *
 * - `subscribe` した listener に 50ms 間隔で偽 ServerSnapshot を送る。
 * - 自プレイヤー（中央付近で静止）+ 円軌道で動く bot を 3 体。
 * - 送信は捨てる（send 呼び出しは no-op）。
 *
 * 用途: StubScene.tsx で `<GameView connection={stub}/>` する。
 */
export class StubServerConnection implements GameConnection {
  private readonly listeners = new Set<GameMessageListener>();
  private readonly bots: StubBot[];
  private readonly selfId: PlayerId;
  private startedAtMs = 0;
  private tick = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private open = false;

  constructor(selfId: PlayerId = 'self-stub') {
    this.selfId = selfId;
    this.bots = [
      {
        id: 'bot-red-1',
        team: 'red',
        radius: 6,
        speed: 1.0,
        phase: 0,
        centerX: -8,
        centerZ: -10,
      },
      {
        id: 'bot-blue-1',
        team: 'blue',
        radius: 7,
        speed: 0.8,
        phase: 1.5,
        centerX: 10,
        centerZ: 10,
      },
      {
        id: 'bot-blue-2',
        team: 'blue',
        radius: 5,
        speed: 1.4,
        phase: 0.7,
        centerX: -10,
        centerZ: 8,
      },
    ];
  }

  start(): void {
    if (this.interval) return;
    this.startedAtMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.open = true;
    this.interval = setInterval(() => this.emitSnapshot(), TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.open = false;
  }

  private emitSnapshot(): void {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tSec = (now - this.startedAtMs) / 1000;

    const players: PlayerSnapshot[] = [
      {
        id: this.selfId,
        position: { x: 0, y: 1, z: -15 },
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
      ...this.bots.map<PlayerSnapshot>((b) => {
        const a = b.phase + tSec * b.speed;
        const x = b.centerX + Math.cos(a) * b.radius;
        const z = b.centerZ + Math.sin(a) * b.radius;
        const yaw = a + Math.PI / 2;
        return {
          id: b.id,
          position: { x, y: 1, z },
          yaw,
          pitch: 0,
          hp: 100,
          isAlive: true,
          currentWeapon: 'ar',
          isReloading: false,
          velocity: {
            x: -Math.sin(a) * b.radius * b.speed,
            y: 0,
            z: Math.cos(a) * b.radius * b.speed,
          },
          ammoInMag: 30,
          isInvincible: false,
          reloadEndMs: 0,
        };
      }),
    ];

    const elapsedMs = now - this.startedAtMs;
    const msg: ServerSnapshot = {
      type: 'snapshot',
      tick: this.tick++,
      serverTimeMs: now,
      players,
      matchTimeRemainingMs: Math.max(0, MATCH_DURATION_MS - elapsedMs),
      teamKills: { red: 0, blue: 0 },
    };

    this.listeners.forEach((l) => {
      try {
        l(msg);
      } catch {
        /* listener エラーは個別に握りつぶす */
      }
    });
  }

  // ---- GameConnection 実装 ----

  subscribe(fn: GameMessageListener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  send(_msg: ClientInput | ClientShoot): void {
    // スタブは入力を捨てる（描画動作の確認だけが目的）
  }

  getYourPlayerId(): PlayerId | null {
    return this.selfId;
  }

  isOpen(): boolean {
    return this.open;
  }
}
