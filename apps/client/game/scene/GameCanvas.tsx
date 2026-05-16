'use client';

import { Suspense } from 'react';
import type { JSX } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import type { PlayerId, Team } from '@arigato/shared';
import { PLAYER_PHYSICS } from '@arigato/shared';
import { MapScene } from './MapScene';
import { LocalPlayerController } from './LocalPlayerController';
import { RemotePlayers } from './RemotePlayers';
import { WeaponViewModel } from './WeaponViewModel';
import { MuzzleFlash } from '../effects/MuzzleFlash';
import { TracerLine } from '../effects/TracerLine';
import { HitParticles } from '../effects/HitParticles';
import type { KeyState, LookRef, RemotePlayerVisual } from '../types';
import type { SnapshotBuffer } from '../net/snapshotBuffer';

interface Props {
  keysRef: React.MutableRefObject<KeyState>;
  lookRef: React.MutableRefObject<LookRef>;
  snapshotBuffer: SnapshotBuffer;
  selfId: PlayerId | null;
  team: Team;
  visuals: Map<PlayerId, RemotePlayerVisual>;
}

/**
 * R3F <Canvas> ルート。
 *
 * - DOM 側の HUD（HudOverlay）は親（GameView）で別ツリーに描く。
 * - SSR では描画しない前提（GameView 側で `next/dynamic` の ssr:false でラップ）。
 */
export function GameCanvas({
  keysRef,
  lookRef,
  snapshotBuffer,
  selfId,
  team,
  visuals,
}: Props): JSX.Element {
  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 200, position: [0, PLAYER_PHYSICS.headHeight, 0] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      shadows
    >
      {/* スカイ背景＋遠景フォグで「黒い闇」を抹消 */}
      <color attach="background" args={['#3a4a5e']} />
      <fog attach="fog" args={['#3a4a5e', 60, 120]} />
      <Suspense fallback={null}>
        <Physics gravity={[0, PLAYER_PHYSICS.gravity, 0]} timeStep={1 / 60}>
          <MapScene />
          <LocalPlayerController keysRef={keysRef} lookRef={lookRef} team={team} />
          <RemotePlayers buffer={snapshotBuffer} selfId={selfId} visuals={visuals} />

          {/* 一人称武器ビューモデル（Phase 3 追加） */}
          <WeaponViewModel />

          {/* エフェクト（state 駆動せず、useFrame 内で ref/Object3D を直接 mutate） */}
          <MuzzleFlash keysRef={keysRef} />
          <TracerLine />
          <HitParticles />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
