'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useHp, useIsAlive, useIsInvincible } from '../../game/store/selectors';
import { DEBUG_PANEL_UPDATE_MS } from '../../game/constants';

/**
 * HP バー（DOM）。
 *
 * - 左下に表示。数値と色付きバーをセットで描画。
 * - 250ms ごとに反映（リレンダコスト抑制）。
 * - HP 30 未満で赤色、それ以上で緑〜黄のグラデーション。
 * - 無敵中は淡い光彩を付ける。
 */
export function HpBar(): JSX.Element {
  const hp = useHp();
  const isAlive = useIsAlive();
  const isInvincible = useIsInvincible();

  const [view, setView] = useState({ hp, isAlive, isInvincible });

  useEffect(() => {
    const handle = setInterval(() => {
      setView({ hp, isAlive, isInvincible });
    }, DEBUG_PANEL_UPDATE_MS);
    return () => clearInterval(handle);
  }, [hp, isAlive, isInvincible]);

  const ratio = Math.max(0, Math.min(1, view.hp / 100));
  // 30未満で赤、70未満で黄、それ以上で緑
  const barColor =
    view.hp < 30 ? '#e44848' : view.hp < 70 ? '#e0b840' : '#48d672';

  return (
    <div
      style={{
        width: 240,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.55)',
        borderRadius: 6,
        color: '#fff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        pointerEvents: 'none',
        userSelect: 'none',
        boxShadow: view.isInvincible
          ? '0 0 12px 2px rgba(180, 220, 255, 0.6)'
          : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <span style={{ opacity: 0.7 }}>HP</span>
        <span style={{ fontWeight: 700 }}>
          {Math.round(view.hp)}
          {!view.isAlive ? ' (DOWN)' : view.isInvincible ? ' (INV)' : ''}
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: 8,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            background: barColor,
            transition: 'width 120ms linear, background-color 120ms linear',
          }}
        />
      </div>
    </div>
  );
}
