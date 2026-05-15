'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import {
  useHp,
  useAmmoInMag,
  useCurrentWeapon,
  useMatchTimeRemainingMs,
  useTeamKills,
  useLastSnapshotTick,
  useLastSnapshotIntervalMs,
} from '../../game/store/selectors';
import { DEBUG_PANEL_UPDATE_MS } from '../../game/constants';

/**
 * 開発者向けデバッグパネル。
 * - HP / 弾薬 / 現在武器 / 試合時間 / チームスコア / 受信 tick / 受信間隔。
 * - 250ms ごとに自前で再描画タイミングを区切り、HUD のリレンダコストを抑える。
 */
export function DebugPanel(): JSX.Element {
  const hp = useHp();
  const ammo = useAmmoInMag();
  const weapon = useCurrentWeapon();
  const remainingMs = useMatchTimeRemainingMs();
  const teamKills = useTeamKills();
  const tick = useLastSnapshotTick();
  const intervalMs = useLastSnapshotIntervalMs();

  // 250ms ごとに「現在表示すべき値」のスナップショットを取る
  const [view, setView] = useState({
    hp,
    ammo,
    weapon,
    remainingMs,
    teamKills,
    tick,
    intervalMs,
  });

  useEffect(() => {
    const handle = setInterval(() => {
      setView({ hp, ammo, weapon, remainingMs, teamKills, tick, intervalMs });
    }, DEBUG_PANEL_UPDATE_MS);
    return () => clearInterval(handle);
  }, [hp, ammo, weapon, remainingMs, teamKills, tick, intervalMs]);

  const secondsLeft = Math.max(0, Math.floor(view.remainingMs / 1000));

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.55)',
        color: '#fff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        lineHeight: 1.4,
        borderRadius: 6,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div>HP: {view.hp}</div>
      <div>WPN: {view.weapon.toUpperCase()} ({view.ammo})</div>
      <div>TIME: {secondsLeft}s</div>
      <div>
        SCORE red {view.teamKills.red} / blue {view.teamKills.blue}
      </div>
      <div style={{ marginTop: 4, opacity: 0.7 }}>
        tick {view.tick} · interval {view.intervalMs}ms
      </div>
    </div>
  );
}
