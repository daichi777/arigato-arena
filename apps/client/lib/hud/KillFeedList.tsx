'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { PlayerId } from '@arigato/shared';
import type { KillFeedEntry } from '../../game/store/gameStore';
import { useGameStore } from '../../game/store/gameStore';
import { DEBUG_PANEL_UPDATE_MS } from '../../game/constants';
import type { RemotePlayerVisual } from '../../game/types';
import { findCharacter } from '../lobby/characters';

/** 表示の生存時間（受信から ms） */
const KILL_FEED_TTL_MS = 5_000;

interface Props {
  /** lobby agent 経由のプレイヤー表示メタ（名前 / characterId 参照に使用） */
  visuals?: Map<PlayerId, RemotePlayerVisual>;
}

/**
 * キルフィード（右上）。
 *
 * - 直近 5 件を表示。
 * - 自分が killer の行は黄色、自分が victim の行は赤色。
 * - ヘッドショットには HS バッジ（黄色光彩 + スケールアニメ）。
 * - killer / victim 両方のアバター画像（24x24）と名前を表示。
 */
export function KillFeedList({ visuals }: Props): JSX.Element {
  const feed = useGameStore((s) => s.killFeed);
  const yourId = useGameStore((s) => s.yourPlayerId);

  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    const handle = setInterval(() => {
      setNow(performance.now());
    }, 250);
    return () => clearInterval(handle);
  }, []);

  void DEBUG_PANEL_UPDATE_MS;

  // TTL を過ぎたエントリは表示しない（store からは即時に消さず、表示側で filter）
  const visible: KillFeedEntry[] = feed
    .filter((e) => now - e.receivedAt < KILL_FEED_TTL_MS)
    .slice(-5);

  return (
    <>
      {/* HS バッジアニメ用スタイルシート */}
      <style>{`
        @keyframes hs-badge-pop {
          0% { transform: scale(1.2); }
          100% { transform: scale(1.0); }
        }
        .hs-badge {
          display: inline-block;
          background: rgba(255, 200, 0, 0.15);
          border: 1px solid #ffd86b;
          color: #ffd86b;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          box-shadow: 0 0 6px 1px rgba(255, 220, 50, 0.5);
          animation: hs-badge-pop 0.3s ease-out forwards;
        }
      `}</style>
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          pointerEvents: 'none',
          userSelect: 'none',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: 13,
        }}
      >
        {visible.map((e) => {
          const isSelfKiller = yourId !== null && e.killerId === yourId;
          const isSelfVictim = yourId !== null && e.victimId === yourId;
          const bg = isSelfKiller
            ? 'rgba(120, 100, 0, 0.75)'
            : isSelfVictim
              ? 'rgba(140, 30, 30, 0.75)'
              : 'rgba(0,0,0,0.6)';

          const killerMeta = visuals?.get(e.killerId);
          const victimMeta = visuals?.get(e.victimId);
          const killerChar = findCharacter(killerMeta?.characterId);
          const victimChar = findCharacter(victimMeta?.characterId);
          const killerName = killerMeta?.name ?? shortenId(e.killerId);
          const victimName = victimMeta?.name ?? shortenId(e.victimId);

          return (
            <div
              key={e.id}
              style={{
                padding: '4px 10px',
                background: bg,
                color: '#fff',
                borderRadius: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                border: '1px solid rgba(255,255,255,0.12)',
                opacity: feedOpacityFromAge(now, e.receivedAt),
              }}
            >
              {/* Killer アバター + 名前 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <PlayerAvatar
                  imagePath={killerChar?.imagePath}
                  displayName={killerChar?.displayName}
                />
                <span style={{ color: isSelfKiller ? '#ffd86b' : '#e8e8e8', fontWeight: 600 }}>
                  {killerName}
                </span>
                {killerChar && (
                  <span style={{ color: '#999', fontSize: 10 }}>
                    {killerChar.displayName}
                  </span>
                )}
              </div>

              {/* 武器 + HS バッジ */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ opacity: 0.65, fontSize: 11 }}>
                  [{e.weapon.toUpperCase()}]
                </span>
                {e.isHeadshot && (
                  <span className="hs-badge">HS</span>
                )}
              </div>

              <span style={{ opacity: 0.4 }}>→</span>

              {/* Victim アバター + 名前 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <PlayerAvatar
                  imagePath={victimChar?.imagePath}
                  displayName={victimChar?.displayName}
                />
                <span style={{ color: isSelfVictim ? '#ff8a8a' : '#ccc' }}>
                  {victimName}
                </span>
                {victimChar && (
                  <span style={{ color: '#999', fontSize: 10 }}>
                    {victimChar.displayName}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---- 補助コンポーネント ----

interface PlayerAvatarProps {
  imagePath?: string;
  displayName?: string;
}

function PlayerAvatar({ imagePath, displayName }: PlayerAvatarProps): JSX.Element {
  if (!imagePath) {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <img
      src={imagePath}
      alt={displayName ?? ''}
      width={24}
      height={24}
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        border: '1px solid rgba(255,255,255,0.3)',
        flexShrink: 0,
      }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
      }}
    />
  );
}

function shortenId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(0, 6) + '…';
}

/**
 * クライアント受信からの経過時間 (ms) に応じた表示 opacity。
 * - 0〜(TTL-1000)ms: opacity 1
 * - (TTL-1000)〜TTL ms: 1 → 0 へリニアフェード
 * - TTL ms 超: 0（ただし表示側でも filter で除外）
 */
function feedOpacityFromAge(clientNow: number, receivedAt: number): number {
  const age = clientNow - receivedAt;
  if (age >= KILL_FEED_TTL_MS) return 0;
  const fadeStart = KILL_FEED_TTL_MS - 1_000;
  if (age <= fadeStart) return 1;
  return Math.max(0, (KILL_FEED_TTL_MS - age) / 1_000);
}
