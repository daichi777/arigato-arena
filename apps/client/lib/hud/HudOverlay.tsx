'use client';

import type { JSX } from 'react';
import type { PlayerId } from '@arigato/shared';
import { Crosshair } from './Crosshair';
import { DebugPanel } from './DebugPanel';
import { HpBar } from './HpBar';
import { AmmoCounter } from './AmmoCounter';
import { MatchTimer } from './MatchTimer';
import { KillFeedList } from './KillFeedList';
import { Minimap } from './Minimap';
import { ReloadGauge } from './ReloadGauge';
import { RespawnOverlay } from './RespawnOverlay';
import { DamageFlash } from '../../game/effects/DamageFlash';
import type { RemotePlayerVisual } from '../../game/types';

interface Props {
  /** lobby agent から渡される表示メタ。Minimap のチーム色判定に使用。 */
  visuals?: Map<PlayerId, RemotePlayerVisual>;
}

/**
 * 試合中の DOM HUD ルート。
 *
 * - R3F Canvas の外側、絶対配置で重ねる。
 * - 各サブコンポーネントは selector ベースで購読し、`pointer-events: none` で透過。
 */
export function HudOverlay({ visuals }: Props): JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      {/* 中央 */}
      <Crosshair />

      {/* 上部 */}
      <MatchTimer />
      <KillFeedList />

      {/* 左下 */}
      <HpBar />
      <AmmoCounter />

      {/* 右下 */}
      <Minimap visuals={visuals} />

      {/* 中央下 */}
      <ReloadGauge />

      {/* 左上 dev only */}
      {process.env.NODE_ENV !== 'production' ? <DebugPanel /> : null}

      {/* フルスクリーン系（オーバーレイ） */}
      <DamageFlash />
      <RespawnOverlay />
    </div>
  );
}
