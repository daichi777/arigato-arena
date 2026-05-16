import { useRef, useCallback } from 'react';

/**
 * 武器ごとのリコイル量（rad）。
 * 発砲の立ち上がりエッジで pitch をキックする。
 */
export const RECOIL_KICK: Record<'ar' | 'sg' | 'smg', number> = {
  ar: 0.012,
  sg: 0.05,
  smg: 0.012,
};

/**
 * リコイル累積の減衰定数。
 * 200ms で 1/1000 まで減衰する指数減衰。
 * decay = -ln(1/1000) / 200 = ln(1000) / 200 ≈ 0.03454
 */
const DECAY_RATE = Math.log(1000) / 200;

/**
 * 発砲リコイル管理フック。
 *
 * - 発砲立ち上がりエッジで pitch をキック（武器ごと設定値）
 * - 毎フレーム指数減衰（200ms で 1/1000）
 * - LocalPlayerController の look.pitch 適用後に加算合成
 * - マウス入力との競合回避: lookRef.pitch ではなく独立した recoilPitch を保持
 *
 * @returns
 *   - recoilPitch: 現在のリコイル累積値（rad）の ref
 *   - onFire: 発砲時に呼ぶ関数（武器種別を渡す）
 *   - update: 毎フレーム useFrame 内で呼ぶ減衰更新関数（delta: 秒）
 */
export function useRecoil(): {
  recoilPitch: React.MutableRefObject<number>;
  onFire: (weapon: 'ar' | 'sg' | 'smg') => void;
  update: (delta: number) => void;
} {
  const recoilPitch = useRef(0);

  const onFire = useCallback((weapon: 'ar' | 'sg' | 'smg') => {
    recoilPitch.current += RECOIL_KICK[weapon];
  }, []);

  const update = useCallback((delta: number) => {
    if (recoilPitch.current === 0) return;
    // 指数減衰: v *= exp(-DECAY_RATE * delta_ms)
    const deltaMs = delta * 1000;
    recoilPitch.current *= Math.exp(-DECAY_RATE * deltaMs);
    // 数値的にゼロに近づいたら完全にゼロにする
    if (Math.abs(recoilPitch.current) < 0.0001) {
      recoilPitch.current = 0;
    }
  }, []);

  return { recoilPitch, onFire, update };
}
