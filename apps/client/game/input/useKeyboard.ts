'use client';

import { useEffect, useRef } from 'react';
import type { WeaponType } from '@arigato/shared';
import type { KeyState } from '../types';

/**
 * キーボード入力を React state ではなく ref に蓄積するフック。
 *
 * - useFrame 内から ref.current を読むだけで最新値が取れる。
 * - jumpEdge / reloadEdge / weaponSwitch は「立ち上がり」を保持し、
 *   呼び出し側で消費後に手動でリセットする責務を持つ。
 */
export function useKeyboard(): React.MutableRefObject<KeyState> {
  const keysRef = useRef<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    fire: false,
    reload: false,
    jumpEdge: false,
    reloadEdge: false,
    weaponSwitch: null,
  });

  useEffect(() => {
    const handleDown = (e: KeyboardEvent): void => {
      const k = keysRef.current;
      switch (e.code) {
        case 'KeyW':
          k.forward = true;
          break;
        case 'KeyS':
          k.backward = true;
          break;
        case 'KeyA':
          k.left = true;
          break;
        case 'KeyD':
          k.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          k.sprint = true;
          break;
        case 'Space':
          if (!k.jump) k.jumpEdge = true;
          k.jump = true;
          break;
        case 'KeyR':
          if (!k.reload) k.reloadEdge = true;
          k.reload = true;
          break;
        case 'Digit1':
          k.weaponSwitch = 'ar' satisfies WeaponType;
          break;
        case 'Digit2':
          k.weaponSwitch = 'sg' satisfies WeaponType;
          break;
        case 'Digit3':
          k.weaponSwitch = 'smg' satisfies WeaponType;
          break;
        default:
          break;
      }
    };

    const handleUp = (e: KeyboardEvent): void => {
      const k = keysRef.current;
      switch (e.code) {
        case 'KeyW':
          k.forward = false;
          break;
        case 'KeyS':
          k.backward = false;
          break;
        case 'KeyA':
          k.left = false;
          break;
        case 'KeyD':
          k.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          k.sprint = false;
          break;
        case 'Space':
          k.jump = false;
          break;
        case 'KeyR':
          k.reload = false;
          break;
        default:
          break;
      }
    };

    const handleMouseDown = (e: MouseEvent): void => {
      if (e.button === 0) keysRef.current.fire = true;
    };
    const handleMouseUp = (e: MouseEvent): void => {
      if (e.button === 0) keysRef.current.fire = false;
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return keysRef;
}
