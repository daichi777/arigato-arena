'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * pointer lock の要求と状態取得を行うフック。
 *
 * - `request()` は user gesture（onClick 等）からのみ呼ぶこと。
 * - `locked` は現在 lock 状態かを返す。
 */
export function usePointerLock(): {
  locked: boolean;
  request: (target?: HTMLElement | null) => void;
  release: () => void;
} {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleChange = (): void => {
      setLocked(document.pointerLockElement !== null);
    };
    document.addEventListener('pointerlockchange', handleChange);
    return () => {
      document.removeEventListener('pointerlockchange', handleChange);
    };
  }, []);

  const request = useCallback((target?: HTMLElement | null) => {
    const el =
      target ?? (typeof document !== 'undefined' ? document.body : null);
    if (!el) return;
    // 一部ブラウザは Promise を返す。失敗しても致命的ではないため握りつぶす。
    try {
      const result = el.requestPointerLock();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          /* user gesture 不足等。再試行は呼び出し側責務 */
        });
      }
    } catch {
      /* noop */
    }
  }, []);

  const release = useCallback(() => {
    if (typeof document !== 'undefined' && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }, []);

  return { locked, request, release };
}
