import type { PlayerSnapshot, Vec3 } from '@arigato/shared';
import { useGameStore } from './gameStore';

/**
 * HUD など低頻度コンポーネント向け selector。
 * 1 値ずつ subscribe してリレンダ範囲を最小化する。
 */
export const useHp = (): number => useGameStore((s) => s.hp);
export const useAmmoInMag = (): number => useGameStore((s) => s.ammoInMag);
export const useCurrentWeapon = (): 'ar' | 'sg' | 'smg' =>
  useGameStore((s) => s.currentWeapon);
export const useIsReloading = (): boolean => useGameStore((s) => s.isReloading);
export const useReloadEndMs = (): number => useGameStore((s) => s.reloadEndMs);
export const useMatchTimeRemainingMs = (): number =>
  useGameStore((s) => s.matchTimeRemainingMs);
export const useTeamKills = (): { red: number; blue: number } =>
  useGameStore((s) => s.teamKills);
export const useCountdownSecondsLeft = (): number | null =>
  useGameStore((s) => s.countdownSecondsLeft);
export const useMatchEnded = (): boolean => useGameStore((s) => s.matchEnded);
export const useLastSnapshotTick = (): number =>
  useGameStore((s) => s.lastSnapshotTick);
export const useLastSnapshotIntervalMs = (): number =>
  useGameStore((s) => s.lastSnapshotIntervalMs);

// ---- Day2-C 追加 ----

export const useIsAlive = (): boolean => useGameStore((s) => s.isAlive);
export const useIsInvincible = (): boolean => useGameStore((s) => s.isInvincible);
export const useRespawnAtMs = (): number => useGameStore((s) => s.respawnAtMs);
export const useLastDamageAt = (): number => useGameStore((s) => s.lastDamageAt);
export const useLastKillByMeAt = (): number =>
  useGameStore((s) => s.lastKillByMeAt);
export const useSelfPosition = (): Vec3 | null =>
  useGameStore((s) => s.selfPosition);
export const useSelfYaw = (): number => useGameStore((s) => s.selfYaw);
export const useYourPlayerId = (): string | null =>
  useGameStore((s) => s.yourPlayerId);
export const usePlayersForMinimap = (): PlayerSnapshot[] =>
  useGameStore((s) => s.playersForMinimap);

// ---- Phase 3 追加 ----

export const useLastHitConfirmAt = (): number =>
  useGameStore((s) => s.lastHitConfirmAt);
export const useLastHitConfirmIsHs = (): boolean =>
  useGameStore((s) => s.lastHitConfirmIsHs);
