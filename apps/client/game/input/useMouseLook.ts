'use client';

import { useEffect, useRef } from 'react';
import type { LookRef } from '../types';
import { MOUSE_SENSITIVITY } from '../constants';
import { clamp } from '../net/interpolate';
import { normalizeYaw } from './buildPlayerInput';

/**
 * マウス移動から yaw / pitch を ref に積算するフック。
 *
 * - pointer lock 中のみ反応（document.pointerLockElement の有無で判定）
 * - yaw は -π..+π に正規化
 * - pitch は -π/2..+π/2 にクランプ
 */
export function useMouseLook(): React.MutableRefObject<LookRef> {
  const lookRef = useRef<LookRef>({ yaw: 0, pitch: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent): void => {
      if (typeof document === 'undefined') return;
      if (document.pointerLockElement === null) return;

      const look = lookRef.current;
      // movementX は右が +、Three.js では yaw は左回転が +Y（時計回り）。
      // FPS では右に振ると yaw 減（=右回転）になるよう負号を掛ける。
      look.yaw = normalizeYaw(look.yaw - e.movementX * MOUSE_SENSITIVITY);
      // movementY は下が +、pitch は上向きが + なので負号
      look.pitch = clamp(look.pitch - e.movementY * MOUSE_SENSITIVITY, -Math.PI / 2, Math.PI / 2);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return lookRef;
}
