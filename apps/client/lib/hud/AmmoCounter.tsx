'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { WEAPONS } from '@arigato/shared';
import {
  useAmmoInMag,
  useCurrentWeapon,
  useIsReloading,
} from '../../game/store/selectors';
import { DEBUG_PANEL_UPDATE_MS } from '../../game/constants';

/**
 * 弾薬カウンタ（左下、HP バーの下）。
 *
 * - 大きな数字で現在弾薬 / マガジン容量を表示。
 * - 武器名も併記。
 * - リロード中は数字を半透明＋"RELOADING" 表記。
 */
export function AmmoCounter(): JSX.Element {
  const ammo = useAmmoInMag();
  const weapon = useCurrentWeapon();
  const reloading = useIsReloading();

  const [view, setView] = useState({ ammo, weapon, reloading });

  useEffect(() => {
    const handle = setInterval(() => {
      setView({ ammo, weapon, reloading });
    }, DEBUG_PANEL_UPDATE_MS);
    return () => clearInterval(handle);
  }, [ammo, weapon, reloading]);

  const cfg = WEAPONS[view.weapon];

  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        minWidth: 240,
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.55)',
        borderRadius: 6,
        color: '#fff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        opacity: view.reloading ? 0.7 : 1,
      }}
    >
      <div style={{ fontSize: 13, opacity: 0.7, letterSpacing: 1 }}>
        {view.weapon.toUpperCase()}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
          {view.ammo}
        </span>
        <span style={{ fontSize: 14, opacity: 0.5 }}>/ {cfg.magSize}</span>
      </div>
      {view.reloading ? (
        <div
          style={{
            position: 'absolute',
            top: -18,
            left: 0,
            fontSize: 11,
            color: '#e0b840',
            letterSpacing: 1,
          }}
        >
          RELOADING…
        </div>
      ) : null}
    </div>
  );
}
