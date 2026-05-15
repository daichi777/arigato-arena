'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useIsAlive, useRespawnAtMs } from '../../game/store/selectors';

/**
 * リスポーンオーバーレイ（死亡中フルスクリーン）。
 *
 * - `isAlive===false` の間だけ表示。
 * - `respawnAtMs - performance.now()` を秒で表示。
 * - 半透明黒背景の上に「やられた」「N 秒後にリスポーン」を中央表示。
 */
export function RespawnOverlay(): JSX.Element | null {
  const isAlive = useIsAlive();
  const respawnAtMs = useRespawnAtMs();

  const [, force] = useState(0);
  useEffect(() => {
    if (isAlive) return undefined;
    const handle = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(handle);
  }, [isAlive]);

  if (isAlive) return null;

  const remainingMs = Math.max(0, respawnAtMs - performance.now());
  const sec = Math.ceil(remainingMs / 1000);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        color: '#fff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontSize: 42,
          fontWeight: 800,
          letterSpacing: 4,
          color: '#ff6b5e',
          textShadow: '0 0 16px rgba(255,80,80,0.45)',
        }}
      >
        DOWN
      </div>
      <div style={{ fontSize: 20, opacity: 0.85 }}>
        {sec > 0 ? `${sec} 秒後にリスポーン` : 'リスポーン中…'}
      </div>
    </div>
  );
}
