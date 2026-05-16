'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import {
  useLastHitConfirmAt,
  useLastHitConfirmIsHs,
} from '../../game/store/selectors';

/** ヒットマーカー表示持続時間（ms） */
const HIT_MARKER_MS = 120;

/**
 * ヒットマーカー（Phase 3 A5）。
 *
 * - 自分が他人をヒットしたとき、クロスヘア中央に 4 本の斜め線（×型）を表示
 * - 120ms で scale 0.7→1.0 + opacity 1→0
 * - ヘッドショット時は赤色（#ff5050）、通常は白（#ffffff）
 */
export function HitMarker(): JSX.Element | null {
  const lastHitConfirmAt = useLastHitConfirmAt();
  const isHs = useLastHitConfirmIsHs();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (lastHitConfirmAt === 0) return undefined;
    const handle = setInterval(() => forceUpdate((n) => n + 1), 16);
    return () => clearInterval(handle);
  }, [lastHitConfirmAt]);

  if (lastHitConfirmAt === 0) return null;

  const elapsed =
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) -
    lastHitConfirmAt;
  if (elapsed >= HIT_MARKER_MS) return null;

  // 進行度 [0, 1]
  const progress = elapsed / HIT_MARKER_MS;
  // scale: 0.7→1.0
  const scale = 0.7 + progress * 0.3;
  // opacity: 1→0
  const opacity = 1 - progress;
  const color = isHs ? '#ff5050' : '#ffffff';

  /** 4 本の斜め線の角度（45°刻み × 4 = ×型） */
  const lines: { angle: number; dx: number; dy: number }[] = [
    { angle: 45, dx: 1, dy: -1 },
    { angle: -45, dx: -1, dy: -1 },
    { angle: 135, dx: 1, dy: 1 },
    { angle: -135, dx: -1, dy: 1 },
  ];

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 8,
            height: 2,
            background: color,
            boxShadow: `0 0 4px ${color}`,
            transformOrigin: 'left center',
            transform: `translate(${line.dx * 5}px, ${line.dy * 5 - 1}px) rotate(${line.angle}deg)`,
          }}
        />
      ))}
    </div>
  );
}
