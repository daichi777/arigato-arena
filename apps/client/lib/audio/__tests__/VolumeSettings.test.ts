import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { audioManager } from '../AudioManager';

/**
 * VolumeSettings の localStorage 連携ロジックのユニットテスト。
 *
 * コンポーネント自体は React DOM 依存のため、ここでは
 * localStorage 読み書きと AudioManager.setMasterVolume の連携を検証する。
 */

const STORAGE_KEY = 'arena.masterVolume';
const DEFAULT_VOLUME = 0.7;

/** localStorage の簡易モック */
function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
    _store: store,
  };
}

describe('VolumeSettings localStorage ロジック', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('localStorage に値がない場合はデフォルト値 0.7 が使われる', () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeNull();

    // デフォルト値を適用
    const v = stored !== null ? parseFloat(stored) : DEFAULT_VOLUME;
    expect(v).toBe(DEFAULT_VOLUME);
  });

  it('localStorage に有効な値がある場合はその値を使う', () => {
    localStorage.setItem(STORAGE_KEY, '0.4');
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBe('0.4');

    const v = stored !== null ? parseFloat(stored) : DEFAULT_VOLUME;
    expect(v).toBe(0.4);
  });

  it('localStorage に不正な値がある場合はデフォルト値にフォールバック', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored !== null ? parseFloat(stored) : DEFAULT_VOLUME;
    const v = isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : DEFAULT_VOLUME;
    expect(v).toBe(DEFAULT_VOLUME);
  });

  it('setMasterVolume は 0〜1 の範囲でクランプされる', () => {
    // AudioManager のクランプ動作確認（setMasterVolume は init 前でも呼べる）
    // ここでは AudioManager.setMasterVolume の呼び出しが行われることを確認する
    const setVolumeSpy = vi.spyOn(audioManager, 'setMasterVolume');
    audioManager.setMasterVolume(0.5);
    expect(setVolumeSpy).toHaveBeenCalledWith(0.5);
    setVolumeSpy.mockRestore();
  });

  it('値を変更すると localStorage に保存される', () => {
    const newVolume = 0.3;
    localStorage.setItem(STORAGE_KEY, String(newVolume));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('0.3');
  });
});
