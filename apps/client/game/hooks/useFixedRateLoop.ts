'use client';

import { useEffect, useRef } from 'react';

/**
 * 一定間隔でコールバックを呼ぶフック。
 *
 * - setInterval を使うため、ブラウザバックグラウンドではスロットルされる前提。
 * - 試合中の入力送信（20Hz）等の「ベストエフォート定期」用途を想定。
 * - cb は ref に保持するので、依存配列の再評価でタイマーが作り直されない。
 */
export function useFixedRateLoop(cb: () => void, intervalMs: number, enabled: boolean): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (!enabled) return;
    const handle = setInterval(() => {
      cbRef.current();
    }, intervalMs);
    return () => clearInterval(handle);
  }, [intervalMs, enabled]);
}
