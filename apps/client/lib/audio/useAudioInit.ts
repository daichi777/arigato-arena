'use client';

import { useCallback, useRef } from 'react';
import { audioManager } from './AudioManager';
import { preloadAll } from './SoundBank';

/**
 * AudioManager 初期化フック（Phase 3 B1）。
 *
 * - `initAudio()` を呼ぶとユーザーのジェスチャ起因で AudioContext を init し、
 *   全音声ファイルを preload する。
 * - 2 回目以降の呼び出しは no-op（一度だけ init する）。
 * - `usePointerLock().request()` を呼ぶ前に（同じハンドラ内で）呼ぶこと。
 */
export function useAudioInit(): {
  initAudio: () => Promise<void>;
} {
  const initializedRef = useRef(false);

  const initAudio = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    try {
      await audioManager.init();
      await preloadAll(audioManager);
      // BGM ループ再生（音声ファイル未配置でも no-op）
      audioManager.playBgm('bgm_match', 0.13);
    } catch (e) {
      // preloadAll は内部で握りつぶすが、念のため
      console.warn('[useAudioInit] 音声初期化中にエラー:', e);
    }
  }, []);

  return { initAudio };
}
