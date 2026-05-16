import { useRef, useCallback } from 'react';

/** 被弾時の画面シェイク持続時間（ms） */
const SHAKE_DURATION_MS = 250;
/** シェイク強度係数 */
const SHAKE_INTENSITY = 0.015;

/**
 * 被弾時カメラシェイクフック（Phase 3 C1）。
 *
 * - lastDamageAt を購読し、被弾時に 250ms の Perlin 風揺れを加算
 * - LocalPlayerController の rotation 設定の後段で適用
 * - 揺れ強度: (rand - 0.5) * SHAKE_INTENSITY * (1 - elapsed/250)
 *
 * @returns
 *   - onDamage: 被弾時に呼ぶ関数
 *   - getShakeOffset: 毎フレームの揺れオフセット { pitch, yaw }（rad）を返す
 */
export function useCameraShake(): {
  onDamage: () => void;
  getShakeOffset: () => { pitch: number; yaw: number };
} {
  const damageAtRef = useRef<number>(0);

  const onDamage = useCallback(() => {
    damageAtRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
  }, []);

  const getShakeOffset = useCallback((): { pitch: number; yaw: number } => {
    const damageAt = damageAtRef.current;
    if (damageAt === 0) return { pitch: 0, yaw: 0 };

    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - damageAt;

    if (elapsed >= SHAKE_DURATION_MS) {
      return { pitch: 0, yaw: 0 };
    }

    const strength = SHAKE_INTENSITY * (1 - elapsed / SHAKE_DURATION_MS);
    return {
      pitch: (Math.random() - 0.5) * strength,
      yaw: (Math.random() - 0.5) * strength,
    };
  }, []);

  return { onDamage, getShakeOffset };
}
