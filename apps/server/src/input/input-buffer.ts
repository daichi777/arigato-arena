import type { PlayerId, PlayerInput } from '@arigato/shared';

/**
 * プレイヤー毎の「最新 input」だけを保持するバッファ。
 *
 * - tick 内で複数 input が来ても最新のみ採用する（要件通り）。
 * - drain() で取り出すと内部はクリアされる。
 * - tick ループ側からは「今tick処理する分だけ」取得して使う。
 */
export class InputBuffer {
  private readonly latest: Map<PlayerId, PlayerInput> = new Map();
  /** 前 tick の jump 状態（立ち上がりエッジ判定用） */
  private readonly prevJump: Map<PlayerId, boolean> = new Map();

  /** 受信した input を上書きで格納 */
  push(playerId: PlayerId, input: PlayerInput): void {
    this.latest.set(playerId, input);
  }

  /** プレイヤーIDの最新 input を取り出してクリア。未受信なら null。 */
  drain(playerId: PlayerId): PlayerInput | null {
    const v = this.latest.get(playerId);
    if (v === undefined) return null;
    this.latest.delete(playerId);
    return v;
  }

  /** drain せずに最新 input を覗く（テスト・デバッグ用）。 */
  peek(playerId: PlayerId): PlayerInput | null {
    return this.latest.get(playerId) ?? null;
  }

  /** 前 tick の jump 状態（立ち上がりエッジ判定用） */
  getPrevJump(playerId: PlayerId): boolean {
    return this.prevJump.get(playerId) ?? false;
  }

  setPrevJump(playerId: PlayerId, value: boolean): void {
    this.prevJump.set(playerId, value);
  }

  /** プレイヤー切断時の後始末 */
  remove(playerId: PlayerId): void {
    this.latest.delete(playerId);
    this.prevJump.delete(playerId);
  }

  /** バッファ全体クリア（停止時用） */
  clear(): void {
    this.latest.clear();
    this.prevJump.clear();
  }
}
