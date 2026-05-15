'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { WEAPONS } from '@arigato/shared';
import {
  useCurrentWeapon,
  useIsReloading,
  useReloadEndMs,
} from '../../game/store/selectors';

/**
 * リロードゲージ（中央下）。
 *
 * - isReloading の間だけ表示。
 * - reloadEndMs - now（推定）でゲージを 0→1 に進める。
 * - reloadEndMs はサーバー時間なので、ローカルではローカル now と比較できない。
 *   そのため「最初に isReloading が true になった瞬間の now」を基準にして、
 *   武器の reloadTimeMs を上限としたタイムベースで進める。
 */
export function ReloadGauge(): JSX.Element | null {
  const reloading = useIsReloading();
  const weapon = useCurrentWeapon();
  const reloadEndMs = useReloadEndMs(); // 将来サーバー時刻同期したら使用
  void reloadEndMs;

  const startAtRef = useRef<number | null>(null);
  const totalMsRef = useRef<number>(WEAPONS[weapon].reloadTimeMs);

  const [, force] = useState(0);

  useEffect(() => {
    if (reloading) {
      if (startAtRef.current === null) {
        startAtRef.current = performance.now();
        totalMsRef.current = WEAPONS[weapon].reloadTimeMs;
      }
      const handle = setInterval(() => force((n) => n + 1), 50);
      return () => clearInterval(handle);
    }
    startAtRef.current = null;
    return undefined;
  }, [reloading, weapon]);

  if (!reloading) return null;

  const start = startAtRef.current ?? performance.now();
  const total = totalMsRef.current;
  const elapsed = performance.now() - start;
  const ratio = Math.max(0, Math.min(1, elapsed / total));

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 100,
        transform: 'translateX(-50%)',
        width: 220,
        pointerEvents: 'none',
        userSelect: 'none',
        color: '#fff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          opacity: 0.8,
          marginBottom: 4,
          letterSpacing: 2,
        }}
      >
        RELOADING
      </div>
      <div
        style={{
          width: '100%',
          height: 6,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            background: '#e0b840',
          }}
        />
      </div>
    </div>
  );
}
