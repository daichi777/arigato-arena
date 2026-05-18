'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import {
  useMatchTimeRemainingMs,
  useTeamKills,
  useCountdownSecondsLeft,
} from '../../game/store/selectors';
import { DEBUG_PANEL_UPDATE_MS } from '../../game/constants';

/**
 * 試合タイマー（中央上）。
 *
 * - mm:ss 形式の大きな数字。
 * - 残り 30 秒以下で赤色に強調。
 * - チームスコア（red / blue）を左右に表示。
 * - カウントダウン中は中央に大きな数字を表示。
 */
export function MatchTimer(): JSX.Element {
  const remainingMs = useMatchTimeRemainingMs();
  const teamKills = useTeamKills();
  const countdown = useCountdownSecondsLeft();

  const [view, setView] = useState({ remainingMs, teamKills, countdown });

  useEffect(() => {
    const handle = setInterval(() => {
      setView({ remainingMs, teamKills, countdown });
    }, DEBUG_PANEL_UPDATE_MS);
    return () => clearInterval(handle);
  }, [remainingMs, teamKills, countdown]);

  const totalSec = Math.max(0, Math.ceil(view.remainingMs / 1000));
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  const warn = totalSec <= 30;
  // 残り 10 秒以下で点滅アニメーション
  const blinkClass = totalSec > 0 && totalSec <= 10 ? 'timer-blink' : undefined;

  return (
    <>
      {/* 点滅アニメ用スタイル（残り 10 秒以下） */}
      {blinkClass && (
        <style>{`
          @keyframes timer-blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          .timer-blink {
            animation: timer-blink 0.9s ease-in-out infinite;
          }
        `}</style>
      )}
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 18px',
          background: 'rgba(0,0,0,0.55)',
          borderRadius: 8,
          color: '#fff',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <span
          style={{
            color: '#ff6b5e',
            fontSize: 18,
            fontWeight: 700,
            minWidth: 28,
            textAlign: 'right',
          }}
        >
          {view.teamKills.red}
        </span>
        <span
          className={blinkClass}
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: warn ? '#ff6b5e' : '#fff',
            minWidth: 90,
            textAlign: 'center',
            letterSpacing: 2,
          }}
        >
          {mm}:{ss}
        </span>
        <span
          style={{
            color: '#5ea0ff',
            fontSize: 18,
            fontWeight: 700,
            minWidth: 28,
            textAlign: 'left',
          }}
        >
          {view.teamKills.blue}
        </span>
      </div>

      {view.countdown !== null && view.countdown > 0 ? (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 140,
            fontWeight: 800,
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            userSelect: 'none',
            lineHeight: 1,
          }}
        >
          {view.countdown}
        </div>
      ) : null}
    </>
  );
}
