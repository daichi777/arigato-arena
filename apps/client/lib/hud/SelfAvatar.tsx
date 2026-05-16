'use client';

import type { JSX } from 'react';
import type { PlayerId } from '@arigato/shared';
import type { RemotePlayerVisual } from '../../game/types';
import { useGameStore } from '../../game/store/gameStore';
import { findCharacter } from '../lobby/characters';

interface Props {
  visuals?: Map<PlayerId, RemotePlayerVisual>;
}

/**
 * 自キャラアバター（HpBar 左側）。
 *
 * - 48x48 のキャラ webp 画像。
 * - チーム色枠（赤 / 青）。
 * - 画像未配置でも枠のみ表示でクラッシュしない。
 */
export function SelfAvatar({ visuals }: Props): JSX.Element {
  const yourId = useGameStore((s) => s.yourPlayerId);
  const selfVisual = yourId ? visuals?.get(yourId) : undefined;
  const charMeta = findCharacter(selfVisual?.characterId);
  const team = selfVisual?.team;
  const borderColor = team === 'red' ? '#ff6b5e' : team === 'blue' ? '#5ea0ff' : '#aaa';

  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        border: `2.5px solid ${borderColor}`,
        overflow: 'hidden',
        background: 'rgba(0,0,0,0.5)',
        flexShrink: 0,
        boxShadow: `0 0 8px 1px ${borderColor}55`,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {charMeta?.imagePath ? (
        <img
          src={charMeta.imagePath}
          alt={charMeta.displayName}
          width={48}
          height={48}
          style={{ objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `${borderColor}33`,
          }}
        />
      )}
    </div>
  );
}
