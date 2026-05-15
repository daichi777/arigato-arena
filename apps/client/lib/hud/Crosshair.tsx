'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { WEAPONS } from '@arigato/shared';
import {
  useCurrentWeapon,
  useIsReloading,
  useLastKillByMeAt,
  useIsAlive,
} from '../../game/store/selectors';

/** キル赤化の持続時間（ms） */
const KILL_HIGHLIGHT_MS = 400;

/**
 * クロスヘア（DOM）。
 *
 * Day2-C 仕様:
 * - 武器ごとの spread に応じて 4 本ストロークが外側に広がる（cosmetic）。
 * - リロード中は X 表示。
 * - キル直後 400ms は赤色。
 * - 死亡中は非表示。
 */
export function Crosshair(): JSX.Element | null {
  const weapon = useCurrentWeapon();
  const reloading = useIsReloading();
  const lastKillByMeAt = useLastKillByMeAt();
  const isAlive = useIsAlive();

  // キル赤化中フラグを 60ms 間隔で評価（タイマー駆動の再レンダ）
  const [killGlow, setKillGlow] = useState(false);
  useEffect(() => {
    const handle = setInterval(() => {
      const active =
        lastKillByMeAt > 0 &&
        performance.now() - lastKillByMeAt < KILL_HIGHLIGHT_MS;
      setKillGlow(active);
    }, 60);
    return () => clearInterval(handle);
  }, [lastKillByMeAt]);

  if (!isAlive) return null;

  if (reloading) {
    return (
      <div
        aria-hidden
        style={crosshairCenterStyle()}
      >
        <span
          style={{
            color: killGlow ? '#ff6b5e' : '#fff',
            fontSize: 22,
            fontWeight: 700,
            textShadow: '0 0 6px rgba(0,0,0,0.7)',
          }}
        >
          ×
        </span>
      </div>
    );
  }

  // 武器ごとの spread を 4 本線のオフセット距離に変換（rad→px 適当換算）
  const spread = WEAPONS[weapon].spread; // 0.01〜0.12
  const offset = 4 + spread * 60; // ar:4.6, smg:5.8, sg:11.2

  const color = killGlow ? '#ff6b5e' : 'rgba(255,255,255,0.92)';

  return (
    <div aria-hidden style={crosshairCenterStyle()}>
      {/* 中央ドット */}
      <div
        style={{
          position: 'absolute',
          width: 2,
          height: 2,
          background: color,
          boxShadow: '0 0 3px rgba(0,0,0,0.7)',
        }}
      />
      {/* 4 本線 */}
      {([
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ] as const).map(([dx, dy], i) => {
        const horizontal = dx !== 0;
        const w = horizontal ? 6 : 2;
        const h = horizontal ? 2 : 6;
        const tx = dx * offset;
        const ty = dy * offset;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: w,
              height: h,
              background: color,
              transform: `translate(${tx}px, ${ty}px)`,
              boxShadow: '0 0 3px rgba(0,0,0,0.7)',
            }}
          />
        );
      })}
    </div>
  );
}

function crosshairCenterStyle(): React.CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  };
}
