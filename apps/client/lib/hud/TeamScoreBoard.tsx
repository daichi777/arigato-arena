'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { useTeamKills, useYourPlayerId } from '../../game/store/selectors';
import type { RemotePlayerVisual } from '../../game/types';
import type { PlayerId } from '@arigato/shared';

interface Props {
  /** 自プレイヤーのチーム判定に使用 */
  visuals?: Map<PlayerId, RemotePlayerVisual>;
}

/**
 * チームスコア大型表示（画面上部中央付近）。
 *
 * - MatchTimer と並んで上部に表示。
 * - "RED N : N BLUE" 形式、自チームを強調。
 * - 自チームの下に三角マーカー。
 * - 250ms 間隔で更新。
 */
export function TeamScoreBoard({ visuals }: Props): JSX.Element {
  const teamKills = useTeamKills();
  const yourId = useYourPlayerId();

  const [view, setView] = useState({ teamKills, yourId });

  useEffect(() => {
    const handle = setInterval(() => {
      setView({ teamKills, yourId });
    }, 250);
    return () => clearInterval(handle);
  }, [teamKills, yourId]);

  // 自チームを visuals から判定
  const myTeam = view.yourId ? visuals?.get(view.yourId)?.team : undefined;

  const redKills = view.teamKills.red;
  const blueKills = view.teamKills.blue;

  const redIsMe = myTeam === 'red';
  const blueIsMe = myTeam === 'blue';

  return (
    <div
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      {/* RED 側 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: redIsMe ? 48 : 36,
            fontWeight: 800,
            color: '#ff6b5e',
            lineHeight: 1,
            transition: 'font-size 0.15s',
            textShadow: redIsMe ? '0 0 16px rgba(255,80,60,0.6)' : undefined,
          }}
        >
          {redKills}
        </span>
        {/* 自チームマーカー */}
        {redIsMe && (
          <span
            style={{
              color: '#ff6b5e',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ▲
          </span>
        )}
      </div>

      {/* セパレータ */}
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          lineHeight: 1,
        }}
      >
        :
      </span>

      {/* BLUE 側 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: blueIsMe ? 48 : 36,
            fontWeight: 800,
            color: '#5ea0ff',
            lineHeight: 1,
            transition: 'font-size 0.15s',
            textShadow: blueIsMe ? '0 0 16px rgba(60,140,255,0.6)' : undefined,
          }}
        >
          {blueKills}
        </span>
        {blueIsMe && (
          <span
            style={{
              color: '#5ea0ff',
              fontSize: 12,
              lineHeight: 1,
            }}
          >
            ▲
          </span>
        )}
      </div>
    </div>
  );
}
