'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useCountdownSecondsLeft } from '../../game/store/selectors';
import { audioManager } from '../../lib/audio/AudioManager';

/**
 * 試合開始カウントダウン大型オーバーレイ（Phase 3 F1）。
 *
 * - store.countdownSecondsLeft を購読
 * - 試合中のカウントダウンを大型表示（120px、中央、白）
 * - 各秒変化時に countdown_tick を再生
 * - 0 になる瞬間に countdown_go を再生
 *
 * 注: lobby agent の同名ファイルとは独立した renderer 側フルスクリーン版。
 */
export function CountdownOverlay(): JSX.Element | null {
  const secondsLeft = useCountdownSecondsLeft();
  const prevSecondsRef = useRef<number | null>(null);

  // 秒変化を検知して音を鳴らす
  useEffect(() => {
    if (secondsLeft === null) {
      prevSecondsRef.current = null;
      return;
    }
    const prev = prevSecondsRef.current;
    if (prev !== secondsLeft) {
      if (secondsLeft === 0) {
        audioManager.play('countdown_go', { volume: 1.0 });
      } else if (secondsLeft > 0) {
        audioManager.play('countdown_tick', { volume: 0.8 });
      }
      prevSecondsRef.current = secondsLeft;
    }
  }, [secondsLeft]);

  // 表示: null か 0 以下（試合中）は非表示
  if (secondsLeft === null || secondsLeft <= 0) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: '#ffffff',
          textShadow: '0 0 30px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,0.8)',
          fontFamily: '"Arial Black", Arial, sans-serif',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {secondsLeft}
      </span>
    </div>
  );
}
