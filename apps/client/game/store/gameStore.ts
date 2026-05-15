'use client';

import { create } from 'zustand';
import type {
  PlayerId,
  PlayerSnapshot,
  ServerHitEvent,
  ServerKillFeed,
  Team,
  Vec3,
} from '@arigato/shared';

/**
 * 試合画面用 Zustand store。
 *
 * 設計方針:
 * - 高頻度更新（位置補間など）は store に乗せず、useFrame 内で ref/Object3D を直接 mutate する。
 * - ここに乗せるのは「DOM 側の HUD で必要な低頻度状態」のみ。
 *   例: HP / マガジン / 残り時間 / チームスコア / キルフィード / 死亡状態 / ミニマップ用自己位置。
 */
export interface KillFeedEntry {
  id: string;
  killerId: PlayerId;
  victimId: PlayerId;
  weapon: ServerKillFeed['weapon'];
  isHeadshot: boolean;
  tickMs: number;
}

/**
 * エフェクト系で参照する直近ヒット情報。
 * - useFrame 内のエフェクトコンポーネントは ref ベースで参照する（再レンダ抑制）。
 */
export interface RecentHit {
  shotId: string;
  shooterId: PlayerId;
  victimId: PlayerId | null;
  hitPoint: Vec3;
  isKill: boolean;
  isHeadshot: boolean;
  /** クライアント側受信時刻（performance.now） */
  receivedAt: number;
}

interface GameStoreState {
  yourPlayerId: PlayerId | null;
  hp: number;
  ammoInMag: number;
  currentWeapon: 'ar' | 'sg' | 'smg';
  isReloading: boolean;
  /** リロード終了予定時刻（サーバー時間 ms）。0 ならリロードしていない。 */
  reloadEndMs: number;
  matchTimeRemainingMs: number;
  teamKills: Record<Team, number>;
  killFeed: KillFeedEntry[];
  countdownSecondsLeft: number | null;
  matchEnded: boolean;
  /** 最後に確認した snapshot tick（DebugPanel 用） */
  lastSnapshotTick: number;
  /** 最後に観測したラウンドトリップ風指標（受信間隔 ms） */
  lastSnapshotIntervalMs: number;

  // ---- Day2-C 追加 ----

  /** 自分が生存中か */
  isAlive: boolean;
  /** リスポーン直後の無敵中か */
  isInvincible: boolean;
  /**
   * リスポーン可能予定時刻（performance.now 基準 ms）。
   * `isAlive===false` の間だけ意味を持つ。
   */
  respawnAtMs: number;
  /** 最後に被弾した時刻（performance.now 基準 ms）。DamageFlash に使用。 */
  lastDamageAt: number;
  /** 最後にヒットイベントを観測した時刻（performance.now）。HitParticles / Tracer 用。 */
  lastHitAt: number;
  /** 自分が他人をキルした時刻（performance.now）。Crosshair の赤化に使用。 */
  lastKillByMeAt: number;
  /** 自分の最新スナップショット位置（Minimap などの DOM 側で使用）。 */
  selfPosition: Vec3 | null;
  /** 自分の最新 yaw（Minimap の向き矢印で使用）。 */
  selfYaw: number;
  /** 全プレイヤーの最新位置（Minimap 用、id→snapshot）。低頻度 DOM 用。 */
  playersForMinimap: PlayerSnapshot[];
  /** 直近ヒットイベント（最大 8 件）。エフェクト寿命管理は描画側 ref で行う。 */
  recentHits: RecentHit[];
}

interface GameStoreActions {
  setYourPlayerId: (id: PlayerId | null) => void;
  applySelfSnapshot: (self: PlayerSnapshot) => void;
  setAllPlayersForMinimap: (players: PlayerSnapshot[]) => void;
  setMatchTime: (remainingMs: number) => void;
  setTeamKills: (kills: Record<Team, number>) => void;
  pushKillFeed: (k: ServerKillFeed) => void;
  pushHitEvent: (h: ServerHitEvent) => void;
  recordHit: (h: ServerHitEvent) => void;
  markKillBySelf: (tickMs: number) => void;
  setCountdown: (secondsLeft: number | null) => void;
  setMatchEnded: (ended: boolean) => void;
  setSnapshotMeta: (tick: number, intervalMs: number) => void;
  reset: () => void;
}

const initialState: GameStoreState = {
  yourPlayerId: null,
  hp: 100,
  ammoInMag: 30,
  currentWeapon: 'ar',
  isReloading: false,
  reloadEndMs: 0,
  matchTimeRemainingMs: 180_000,
  teamKills: { red: 0, blue: 0 },
  killFeed: [],
  countdownSecondsLeft: null,
  matchEnded: false,
  lastSnapshotTick: 0,
  lastSnapshotIntervalMs: 0,
  isAlive: true,
  isInvincible: false,
  respawnAtMs: 0,
  lastDamageAt: 0,
  lastHitAt: 0,
  lastKillByMeAt: 0,
  selfPosition: null,
  selfYaw: 0,
  playersForMinimap: [],
  recentHits: [],
};

/** 直近ヒットを何件まで保持するか（エフェクト寿命より十分長く） */
const RECENT_HITS_CAP = 16;
/** リスポーン遅延（performance.now 基準で respawnAtMs を埋める時のフォールバック） */
const RESPAWN_FALLBACK_MS = 3_000;

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export const useGameStore = create<GameStoreState & GameStoreActions>((set) => ({
  ...initialState,

  setYourPlayerId: (id) => set({ yourPlayerId: id }),

  applySelfSnapshot: (self) =>
    set((s) => {
      const now = nowMs();
      // 被弾検知: 直前 HP より下がっていれば lastDamageAt を更新。
      // ただし生→死の瞬間（hp===0 への遷移）も含む。
      let nextLastDamageAt = s.lastDamageAt;
      if (self.hp < s.hp) {
        nextLastDamageAt = now;
      }
      // 生→死の遷移を検知してリスポーン時刻を埋める。
      let nextRespawnAtMs = s.respawnAtMs;
      if (s.isAlive && !self.isAlive) {
        // サーバーから明示的な respawnAtMs は送られないため、ここで仮置きする。
        // サーバーが RESPAWN_DELAY_MS 後に isAlive=true で復活させる仕様。
        nextRespawnAtMs = now + RESPAWN_FALLBACK_MS;
      }
      if (!s.isAlive && self.isAlive) {
        nextRespawnAtMs = 0;
      }
      return {
        hp: self.hp,
        ammoInMag: self.ammoInMag,
        currentWeapon: self.currentWeapon,
        isReloading: self.isReloading,
        reloadEndMs: self.reloadEndMs,
        isAlive: self.isAlive,
        isInvincible: self.isInvincible,
        respawnAtMs: nextRespawnAtMs,
        lastDamageAt: nextLastDamageAt,
        selfPosition: self.position,
        selfYaw: self.yaw,
      };
    }),

  setAllPlayersForMinimap: (players) => set({ playersForMinimap: players }),

  setMatchTime: (remainingMs) => set({ matchTimeRemainingMs: remainingMs }),

  setTeamKills: (kills) => set({ teamKills: kills }),

  pushKillFeed: (k) =>
    set((s) => {
      const entry: KillFeedEntry = {
        id: `${k.tickMs}:${k.killerId}:${k.victimId}`,
        killerId: k.killerId,
        victimId: k.victimId,
        weapon: k.weapon,
        isHeadshot: k.isHeadshot,
        tickMs: k.tickMs,
      };
      const next = [...s.killFeed, entry];
      while (next.length > 6) next.shift();
      // 自分がキルした場合は Crosshair 赤化用タイムスタンプを更新
      const lastKillByMeAt =
        s.yourPlayerId !== null && k.killerId === s.yourPlayerId
          ? nowMs()
          : s.lastKillByMeAt;
      return { killFeed: next, lastKillByMeAt };
    }),

  pushHitEvent: (_h) => {
    // 互換のため残置。実エフェクト記録は recordHit。
  },

  recordHit: (h) =>
    set((s) => {
      const r: RecentHit = {
        shotId: h.result.shotId,
        shooterId: h.result.shooterId,
        victimId: h.result.victimId,
        hitPoint: h.result.hitPoint,
        isKill: h.result.isKill,
        isHeadshot: h.result.isHeadshot,
        receivedAt: nowMs(),
      };
      const next = [...s.recentHits, r];
      while (next.length > RECENT_HITS_CAP) next.shift();
      return { recentHits: next, lastHitAt: r.receivedAt };
    }),

  markKillBySelf: (_tickMs) => set({ lastKillByMeAt: nowMs() }),

  setCountdown: (secondsLeft) => set({ countdownSecondsLeft: secondsLeft }),

  setMatchEnded: (ended) => set({ matchEnded: ended }),

  setSnapshotMeta: (tick, intervalMs) =>
    set({ lastSnapshotTick: tick, lastSnapshotIntervalMs: intervalMs }),

  reset: () => set({ ...initialState }),
}));
