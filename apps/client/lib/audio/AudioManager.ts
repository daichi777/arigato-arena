/**
 * AudioManager — Web Audio API ラッパー（Phase 3 B1）。
 *
 * - autoplay policy 対策: ユーザーのポインターロックジェスチャで init() を呼ぶ
 * - 音声ファイル未配置でもクラッシュしない（preload 失敗は console.warn のみ）
 * - play() で buffer 未取得なら無音 (no-op)
 * - 同名サウンドの同時再生上限 8 件（古いものを stop して GC）
 */

/** play() に渡せるオプション */
export interface PlayOptions {
  /** 再生音量（0〜1、デフォルト 1.0） */
  volume?: number;
  /** 再生速度倍率（デフォルト 1.0）。ピッチにも影響する。 */
  pitch?: number;
}

const MAX_CONCURRENT_PER_NAME = 8;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private masterGain: GainNode | null = null;
  /** name → 現在再生中の AudioBufferSourceNode[] */
  private activeSources = new Map<string, AudioBufferSourceNode[]>();
  /** init() 済みかどうか */
  private initialized = false;

  /**
   * AudioContext を初期化する。
   * ポインターロック取得などのユーザーのジェスチャーから呼ぶこと。
   * 2 回目以降は no-op（既に running なら resume だけ試みる）。
   */
  async init(): Promise<void> {
    // globalThis.AudioContext が存在しない環境（SSR など）はスキップ
    const G = globalThis as Record<string, unknown>;
    const AudioContextCtor =
      (G['AudioContext'] as typeof AudioContext | undefined) ??
      (G['webkitAudioContext'] as typeof AudioContext | undefined);
    if (!AudioContextCtor) return;

    if (!this.initialized) {
      try {
        this.ctx = new AudioContextCtor();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.initialized = true;
      } catch (e) {
        console.warn('[AudioManager] AudioContext の初期化に失敗しました:', e);
        return;
      }
    }
    // サスペンド状態の場合は resume
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        console.warn('[AudioManager] AudioContext の resume に失敗しました:', e);
      }
    }
  }

  /**
   * 音声ファイルを事前ロードして AudioBuffer にデコードし、キャッシュする。
   * 失敗は console.warn のみで握りつぶす（音声未配置でもクラッシュしない）。
   */
  async preload(name: string, url: string): Promise<void> {
    if (!this.ctx) {
      // AudioContext 未初期化の場合も warn のみ
      console.warn(`[AudioManager] preload("${name}"): AudioContext が未初期化です。`);
      return;
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`[AudioManager] preload("${name}"): fetch 失敗 (${resp.status}) ${url}`);
        return;
      }
      const arrayBuffer = await resp.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(name, audioBuffer);
    } catch (e) {
      console.warn(`[AudioManager] preload("${name}") でエラー:`, e);
    }
  }

  /**
   * 指定名のサウンドを再生する。
   * buffer 未取得（preload 未完了 or 失敗）の場合は無音 (no-op)。
   */
  play(name: string, opts?: PlayOptions): void {
    const ctx = this.ctx;
    const gain = this.masterGain;
    if (!ctx || !gain || ctx.state !== 'running') return;

    const buffer = this.buffers.get(name);
    if (!buffer) return; // 未ロードは無音

    // 同時再生上限を超えた場合は古いものを停止
    this.enforceConcurrencyLimit(name);

    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = opts?.pitch ?? 1.0;

      // 個別ゲインノード（音量調整）
      const vol = ctx.createGain();
      vol.gain.value = Math.max(0, Math.min(1, opts?.volume ?? 1.0));
      source.connect(vol);
      vol.connect(gain);

      source.start(0);

      // active sources に登録
      const list = this.activeSources.get(name) ?? [];
      list.push(source);
      this.activeSources.set(name, list);

      // 再生終了時に自動的にリストから除去
      source.addEventListener('ended', () => {
        const current = this.activeSources.get(name);
        if (current) {
          const idx = current.indexOf(source);
          if (idx !== -1) current.splice(idx, 1);
        }
      });
    } catch (e) {
      console.warn(`[AudioManager] play("${name}") でエラー:`, e);
    }
  }

  /**
   * マスターボリュームを設定する。
   * @param v 0〜1
   */
  setMasterVolume(v: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  /**
   * 同名サウンドの同時再生上限を超えた場合に古い Source を stop して GC する。
   */
  private enforceConcurrencyLimit(name: string): void {
    const list = this.activeSources.get(name);
    if (!list) return;
    while (list.length >= MAX_CONCURRENT_PER_NAME) {
      const oldest = list.shift();
      if (oldest) {
        try {
          oldest.stop();
        } catch {
          // 既に終了済みの場合は無視
        }
      }
    }
  }
}

/** シングルトンインスタンス */
export const audioManager = new AudioManager();
