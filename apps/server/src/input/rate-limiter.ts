import { INPUT_RATE_LIMIT_HZ, WEAPONS, WEAPON_SWITCH_COOLDOWN_MS, type PlayerId, type WeaponType } from '@arigato/shared';

/**
 * メッセージ種別ごとの簡易レートリミッタ。
 *
 * 設計方針:
 *  - input: 30Hz を超える受信頻度は破棄（最終 ts との間隔で判定）。
 *  - shoot: 武器ごとの fireIntervalMs を下回るバーストは破棄。
 *  - weaponSwitch: 100ms クールダウン。
 *
 * プレイヤー切断時は cleanup() で対象IDを忘れる。
 */
export class RateLimiter {
  private readonly lastInputMs: Map<PlayerId, number> = new Map();
  private readonly lastShootMs: Map<PlayerId, number> = new Map();
  private readonly lastWeaponSwitchMs: Map<PlayerId, number> = new Map();

  /** 入力レートを許容するか判定。返り値 true なら採用、false なら破棄。 */
  allowInput(playerId: PlayerId, nowMs: number): boolean {
    const last = this.lastInputMs.get(playerId);
    if (last === undefined) {
      this.lastInputMs.set(playerId, nowMs);
      return true;
    }
    const minInterval = 1000 / INPUT_RATE_LIMIT_HZ;
    // ±2ms のジッタ許容
    if (nowMs - last + 2 < minInterval) {
      return false;
    }
    this.lastInputMs.set(playerId, nowMs);
    return true;
  }

  /** 発砲レートを許容するか判定。武器ごとの fireIntervalMs を参照。 */
  allowShoot(playerId: PlayerId, weapon: WeaponType, nowMs: number): boolean {
    const last = this.lastShootMs.get(playerId);
    const minInterval = WEAPONS[weapon].fireIntervalMs;
    if (last === undefined || nowMs - last >= minInterval) {
      this.lastShootMs.set(playerId, nowMs);
      return true;
    }
    return false;
  }

  /** 武器切替を許容するか判定（100ms クールダウン） */
  allowWeaponSwitch(playerId: PlayerId, nowMs: number): boolean {
    const last = this.lastWeaponSwitchMs.get(playerId);
    if (last === undefined || nowMs - last >= WEAPON_SWITCH_COOLDOWN_MS) {
      this.lastWeaponSwitchMs.set(playerId, nowMs);
      return true;
    }
    return false;
  }

  /** プレイヤー切断時の後始末 */
  cleanup(playerId: PlayerId): void {
    this.lastInputMs.delete(playerId);
    this.lastShootMs.delete(playerId);
    this.lastWeaponSwitchMs.delete(playerId);
  }

  /** 全クリア（停止時用） */
  clear(): void {
    this.lastInputMs.clear();
    this.lastShootMs.clear();
    this.lastWeaponSwitchMs.clear();
  }
}
