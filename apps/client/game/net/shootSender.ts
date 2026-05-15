import type { ClientShoot, Vec3, WeaponType } from '@arigato/shared';
import { PLAYER_PHYSICS, WEAPONS } from '@arigato/shared';
import type { GameConnection } from './gameMessages';
import type { KeyState, LookRef } from '../types';

/**
 * 発砲送信用のローカルキー状態抽象。
 *
 * - 本物の `KeyState` のうち `fire` だけを参照する。
 * - テスト時はミニマムなオブジェクトで差し替えできる。
 */
export interface FireSource {
  /** 押下中なら true */
  fire: boolean;
}

/** 現在ロックされているか問い合わせる関数（pointer lock 未取得時は送信抑制） */
export type PointerLockedGetter = () => boolean;

/** ユーザー（ブラウザ）の現在時刻を返すフック関数（テスト差し替え用） */
export type NowFn = () => number;

/** UUID 生成関数（テストで差し替え可能、デフォルト crypto.randomUUID） */
export type UuidFn = () => string;

/**
 * クライアント側で fire の立ち上がりエッジを検知し、`ClientShoot` をサーバーへ送信する。
 *
 * 送信タイミング:
 * - `fire` が false→true に変わった瞬間（押下開始）に 1 回。
 * - `fire` が押下されたまま継続する場合は、現在武器の `fireIntervalMs` に従って連射送信する。
 * - クライアント側の `fireIntervalMs` スロットリングはあくまでネットワーク節約。最終判定はサーバー側で再計算する。
 *
 * 注意:
 * - origin / direction はあくまでローカルエフェクトのヒントとサーバー側の検証用。
 * - サーバーはこれを信用せず、サーバー側のプレイヤー位置 + yaw/pitch から再計算する。
 * - pointer lock 中以外は送信しない（誤射防止）。
 * - 接続が開いていない、または `localPlayerPositionRef.current` が null のときも送信しない。
 */
export class ShootSender {
  private rafHandle: number | null = null;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  /** 前フレームの fire 状態。立ち上がりエッジ検出用。 */
  private prevFire = false;
  /** 最後に送信した時刻（ms）。連射スロットリング用。 */
  private lastSentAt = 0;
  /** 停止フラグ */
  private stopped = true;

  constructor(
    private readonly connection: GameConnection,
    private readonly keysRef: { current: FireSource & Partial<KeyState> },
    private readonly lookRef: { current: LookRef },
    private readonly localPlayerPositionRef: { current: Vec3 | null },
    private readonly getCurrentWeapon: () => WeaponType,
    private readonly isPointerLocked: PointerLockedGetter = defaultPointerLocked,
    private readonly now: NowFn = defaultNow,
    private readonly uuid: UuidFn = defaultUuid,
  ) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;

    // requestAnimationFrame が使える環境（ブラウザ）では rAF ループ、
    // それ以外（テストなど）では setInterval ループ。どちらも tick() を呼ぶだけ。
    if (typeof requestAnimationFrame !== 'undefined') {
      const loop = (): void => {
        if (this.stopped) return;
        this.tick();
        this.rafHandle = requestAnimationFrame(loop);
      };
      this.rafHandle = requestAnimationFrame(loop);
    } else {
      this.timerHandle = setInterval(() => this.tick(), 16);
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.rafHandle !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  /**
   * 1 tick 評価。テスト用に public。
   *
   * 戻り値: 送信した ClientShoot（送信していなければ null）。
   */
  tick(): ClientShoot | null {
    const fireNow = this.keysRef.current.fire;
    const prev = this.prevFire;
    // 状態更新は最後にまとめてやる
    let shouldSend = false;

    if (fireNow && !prev) {
      // 立ち上がりエッジ → 必ず送信（fire interval は無視）
      shouldSend = true;
    } else if (fireNow && prev) {
      // 押下継続中 → 武器ごとの fireIntervalMs に従って送信
      const weapon = this.getCurrentWeapon();
      const interval = WEAPONS[weapon].fireIntervalMs;
      if (this.now() - this.lastSentAt >= interval) {
        shouldSend = true;
      }
    }

    this.prevFire = fireNow;

    if (!shouldSend) return null;

    // ガード: pointer lock 中でなければ送らない
    if (!this.isPointerLocked()) return null;
    if (!this.connection.isOpen()) return null;

    const origin = this.computeOrigin();
    if (!origin) return null;

    const direction = this.computeDirection();

    const msg: ClientShoot = {
      type: 'shoot',
      shotId: this.uuid(),
      origin,
      direction,
      clientTickMs: Math.round(this.now()),
    };
    this.connection.send(msg);
    this.lastSentAt = this.now();
    return msg;
  }

  /** デバッグ用 */
  getLastSentAt(): number {
    return this.lastSentAt;
  }

  /** デバッグ用：内部 prevFire */
  getPrevFire(): boolean {
    return this.prevFire;
  }

  private computeOrigin(): Vec3 | null {
    const p = this.localPlayerPositionRef.current;
    if (!p) return null;
    return { x: p.x, y: p.y + PLAYER_PHYSICS.headHeight, z: p.z };
  }

  private computeDirection(): Vec3 {
    const { yaw, pitch } = this.lookRef.current;
    // Three.js 座標系: yaw=0 のとき forward = (0,0,-1)。
    // FPS では右回転を +、上向きを + として pitch を使う。
    // direction = (sin(yaw)*cos(pitch), -sin(pitch), -cos(yaw)*cos(pitch))
    // ※ 既存 buildPlayerInput / mouseLook と同じ慣例（yaw 加算で左を向く）。
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    // 念のため Three.js の YXZ オイラーで rotateY(yaw)→rotateX(pitch) を (0,0,-1) に作用させた結果と一致させる:
    // forward = ( -sin(yaw)*cos(pitch), sin(pitch), -cos(yaw)*cos(pitch) )
    // ただし mouseLook は「movementX が +（右）」のとき yaw を「減らす」実装なので、
    // 「カメラが右を向くと yaw が小さくなる」モデル。
    // つまり yaw が増えるとカメラは「左」を向く。
    // → forward の x 成分は yaw 増加で +x（左）方向に動く ⇒ x = -sin(yaw)*cos(pitch)
    return {
      x: -sy * cp,
      y: sp,
      z: -cy * cp,
    };
  }
}

function defaultPointerLocked(): boolean {
  if (typeof document === 'undefined') return false;
  return document.pointerLockElement !== null;
}

function defaultNow(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function defaultUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // フォールバック（テスト/古環境用）。衝突確率は十分小さい。
  return `shot-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
