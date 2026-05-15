'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useLastDamageAt } from '../store/selectors';

/** 被弾フラッシュの持続時間（ms） */
const DAMAGE_FLASH_MS = 280;

/**
 * 被弾時の画面赤フラッシュ（フルスクリーン DOM）。
 *
 * - store.lastDamageAt から DAMAGE_FLASH_MS 以内なら赤の半透明オーバーレイを表示。
 * - opacity をフェードアウト。
 * - 60ms 間隔でタイマー駆動の再評価。
 */
export function DamageFlash(): JSX.Element | null {
  const lastDamageAt = useLastDamageAt();
  const [, force] = useState(0);

  useEffect(() => {
    if (lastDamageAt === 0) return undefined;
    const handle = setInterval(() => force((n) => n + 1), 60);
    return () => clearInterval(handle);
  }, [lastDamageAt]);

  if (lastDamageAt === 0) return null;
  const elapsed = performance.now() - lastDamageAt;
  if (elapsed >= DAMAGE_FLASH_MS) return null;

  const opacity = 0.55 * (1 - elapsed / DAMAGE_FLASH_MS);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `rgba(255, 30, 30, ${opacity.toFixed(3)})`,
        pointerEvents: 'none',
      }}
    />
  );
}
