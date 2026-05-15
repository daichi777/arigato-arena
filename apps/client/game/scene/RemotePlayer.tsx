'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Html } from '@react-three/drei';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { PLAYER_PHYSICS } from '@arigato/shared';
import { CAPSULE_HALF_HEIGHT } from '../constants';
import { useGameStore } from '../store/gameStore';

interface Props {
  playerId: string;
  /** 表示名（未確定なら空文字） */
  name?: string;
  team?: 'red' | 'blue';
  /** scene Group の ref を返す（親で Object3D mutate するため） */
  onMount?: (id: string, group: Group | null) => void;
}

/**
 * 他プレイヤー描画。
 *
 * - Day1午後はカプセル + 名前ラベル。Day2 で GLB に置き換える。
 * - 位置 / 回転の更新は useFrameInterpolation 内で Object3D.position/rotation を直接 mutate する。
 * - 死亡中（store.playersForMinimap で isAlive=false）は半透明 + 名前ラベル非表示。
 */
export function RemotePlayer({ playerId, name, team, onMount }: Props): JSX.Element {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const labelDeadnessRef = useRef<HTMLElement | null>(null);

  // チーム色（既存の cosmetic）：MVP は単色マテリアル
  const color = team === 'red' ? '#c0443a' : team === 'blue' ? '#3a7ec0' : '#888';

  // store の playersForMinimap から isAlive をポーリングして半透明化／表示切替する。
  // 頻度は 200ms 程度で十分（被弾フィードは別エフェクト）。
  useEffect(() => {
    const handle = setInterval(() => {
      const players = useGameStore.getState().playersForMinimap;
      const me = players.find((p) => p.id === playerId);
      if (!me) return;
      const mesh = meshRef.current;
      if (!mesh) return;
      const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
      const setOpacity = (m: MeshStandardMaterial): void => {
        m.transparent = true;
        m.opacity = me.isAlive ? 1 : 0.18;
      };
      if (Array.isArray(mat)) mat.forEach(setOpacity);
      else setOpacity(mat);

      // 死亡中は名前ラベルも薄くする
      if (labelDeadnessRef.current) {
        labelDeadnessRef.current.style.opacity = me.isAlive ? '1' : '0.3';
      }
    }, 200);
    return () => clearInterval(handle);
  }, [playerId]);

  return (
    <group
      ref={(g) => {
        groupRef.current = g;
        onMount?.(playerId, g);
      }}
    >
      <mesh
        ref={meshRef}
        castShadow
        position={[0, PLAYER_PHYSICS.capsuleHeight / 2, 0]}
      >
        <capsuleGeometry args={[PLAYER_PHYSICS.capsuleRadius, CAPSULE_HALF_HEIGHT * 2, 4, 8]} />
        <meshStandardMaterial color={color} transparent opacity={1} />
      </mesh>

      <Html
        position={[0, PLAYER_PHYSICS.capsuleHeight + 0.3, 0]}
        center
        distanceFactor={8}
        occlude={false}
        style={{
          pointerEvents: 'none',
          color: '#fff',
          fontSize: '14px',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          ref={(el) => {
            labelDeadnessRef.current = el;
          }}
        >
          {name ?? playerId.slice(0, 6)}
        </span>
      </Html>
    </group>
  );
}
