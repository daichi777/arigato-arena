import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../AudioManager';

/**
 * AudioManager のユニットテスト（node 環境）。
 *
 * - globalThis に AudioContext をモックして動作確認
 * - preload / play の主要パスを検証
 */

/** モック AudioBuffer */
function makeMockAudioBuffer(): AudioBuffer {
  return {} as AudioBuffer;
}

/** モック AudioBufferSourceNode */
function makeMockSource() {
  const endedListeners: Array<(e: Event) => void> = [];
  const source = {
    buffer: null as AudioBuffer | null,
    playbackRate: { value: 1.0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn((type: string, handler: (e: Event) => void) => {
      if (type === 'ended') endedListeners.push(handler);
    }),
    _triggerEnded: () => {
      endedListeners.forEach((h) => h(new Event('ended')));
    },
  };
  return source;
}

/** モック GainNode */
function makeMockGain() {
  return {
    gain: { value: 1.0 },
    connect: vi.fn(),
  };
}

type MockContext = ReturnType<typeof makeMockAudioContext>;

/** モック AudioContext ファクトリ */
function makeMockAudioContext(state: AudioContextState = 'running') {
  const sources: ReturnType<typeof makeMockSource>[] = [];
  const gains: ReturnType<typeof makeMockGain>[] = [];
  const ctx = {
    state,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createBufferSource: vi.fn(() => {
      const src = makeMockSource();
      sources.push(src);
      return src;
    }),
    createGain: vi.fn(() => {
      const g = makeMockGain();
      gains.push(g);
      return g;
    }),
    decodeAudioData: vi.fn().mockResolvedValue(makeMockAudioBuffer()),
    _sources: sources,
    _gains: gains,
  };
  return ctx;
}

/** AudioContext を globalThis に注入してテスト後に復元する */
function withMockAudioContext(mockCtx: MockContext): () => void {
  const MockAudioContextCtor = vi.fn(() => mockCtx);
  const prev = (globalThis as Record<string, unknown>)['AudioContext'];
  (globalThis as Record<string, unknown>)['AudioContext'] = MockAudioContextCtor;
  // window も存在しない環境向けに補完
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>)['AudioContext'] = MockAudioContextCtor;
  }
  // 呼び出し検証用に返す
  (mockCtx as MockContext & { _ctor: typeof MockAudioContextCtor })._ctor = MockAudioContextCtor;
  return () => {
    if (prev === undefined) {
      delete (globalThis as Record<string, unknown>)['AudioContext'];
    } else {
      (globalThis as Record<string, unknown>)['AudioContext'] = prev;
    }
  };
}

describe('AudioManager', () => {
  let manager: AudioManager;
  let restore: (() => void) | undefined;

  beforeEach(() => {
    manager = new AudioManager();
  });

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('preload() で fetch が失敗しても例外を投げない（console.warn のみ）', async () => {
    const mockCtx = makeMockAudioContext();
    restore = withMockAudioContext(mockCtx);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    await manager.init();
    await expect(manager.preload('missing', '/sfx/missing.mp3')).resolves.not.toThrow();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('play() で buffer 未取得なら no-op（エラーなし）', async () => {
    const mockCtx = makeMockAudioContext();
    restore = withMockAudioContext(mockCtx);

    await manager.init();
    // preload していない名前で play → 何もしない
    expect(() => manager.play('nonexistent')).not.toThrow();
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });

  it('play() で buffer があれば AudioBufferSourceNode が生成・再生される', async () => {
    const mockCtx = makeMockAudioContext();
    restore = withMockAudioContext(mockCtx);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as unknown as Response);

    await manager.init();
    await manager.preload('fire', '/sfx/fire.mp3');
    manager.play('fire');

    expect(mockCtx.createBufferSource).toHaveBeenCalledOnce();
    const src = mockCtx._sources[0];
    expect(src).toBeDefined();
    expect(src!.start).toHaveBeenCalledOnce();
  });

  it('play() で pitch オプションが playbackRate に反映される', async () => {
    const mockCtx = makeMockAudioContext();
    restore = withMockAudioContext(mockCtx);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as unknown as Response);

    await manager.init();
    await manager.preload('hitmark', '/sfx/hitmark.mp3');
    manager.play('hitmark', { pitch: 1.2 });

    const src = mockCtx._sources[0];
    expect(src!.playbackRate.value).toBe(1.2);
  });

  it('AudioContext が未初期化の場合は preload で warn のみ', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    // init() を呼ばずに preload
    await manager.preload('test', '/sfx/test.mp3');
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('setMasterVolume() でマスターゲインが設定される', async () => {
    const mockCtx = makeMockAudioContext();
    restore = withMockAudioContext(mockCtx);

    await manager.init();
    manager.setMasterVolume(0.5);

    const masterGain = mockCtx._gains[0];
    expect(masterGain!.gain.value).toBe(0.5);
  });

  it('setMasterVolume(0) でゲインが 0 になる', async () => {
    const mockCtx = makeMockAudioContext();
    restore = withMockAudioContext(mockCtx);

    await manager.init();
    manager.setMasterVolume(0);

    const masterGain = mockCtx._gains[0];
    expect(masterGain!.gain.value).toBe(0);
  });

  it('init() を呼ばなければ play() は no-op', () => {
    // init なしで play を呼んでもエラーにならない
    expect(() => manager.play('fire')).not.toThrow();
  });
});
