'use client';

import type { JSX } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { MAP_BOUNDS } from '@arigato/shared';

/**
 * Day1午後の仮マップ。
 *
 * - GLB は asset agent 完成待ち。プリミティブ Box で 3 レーン構造を模す。
 * - 床（中レーン）+ 高所足場（上レーン）+ 屋内通路の側壁を最低限配置。
 * - 名前 `Collider_*` 等は GLB 切替時の規約に揃えるが、Day1午後はメッシュ生成のみで判定。
 * - Y-up、1unit=1m、原点中央。
 */
export function MapScene(): JSX.Element {
  const widthX = MAP_BOUNDS.maxX - MAP_BOUNDS.minX; // 60
  const depthZ = MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ; // 40

  return (
    <group>
      {/* 床: 中レーン */}
      <RigidBody type="fixed" colliders={false} name="Collider_Floor">
        <mesh receiveShadow position={[0, -0.05, 0]}>
          <boxGeometry args={[widthX, 0.1, depthZ]} />
          <meshStandardMaterial color="#2a2a30" />
        </mesh>
        <CuboidCollider args={[widthX / 2, 0.05, depthZ / 2]} position={[0, -0.05, 0]} />
      </RigidBody>

      {/* 上レーン足場（Red 側） */}
      <RigidBody type="fixed" colliders={false} name="Collider_UpperLane_Red">
        <mesh castShadow receiveShadow position={[-15, 3, -10]}>
          <boxGeometry args={[10, 0.4, 4]} />
          <meshStandardMaterial color="#4a4a55" />
        </mesh>
        <CuboidCollider args={[5, 0.2, 2]} position={[-15, 3, -10]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} name="Collider_UpperLane_Red2">
        <mesh castShadow receiveShadow position={[15, 3, -10]}>
          <boxGeometry args={[10, 0.4, 4]} />
          <meshStandardMaterial color="#4a4a55" />
        </mesh>
        <CuboidCollider args={[5, 0.2, 2]} position={[15, 3, -10]} />
      </RigidBody>

      {/* 上レーン足場（Blue 側） */}
      <RigidBody type="fixed" colliders={false} name="Collider_UpperLane_Blue">
        <mesh castShadow receiveShadow position={[-15, 3, 10]}>
          <boxGeometry args={[10, 0.4, 4]} />
          <meshStandardMaterial color="#4a4a55" />
        </mesh>
        <CuboidCollider args={[5, 0.2, 2]} position={[-15, 3, 10]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} name="Collider_UpperLane_Blue2">
        <mesh castShadow receiveShadow position={[15, 3, 10]}>
          <boxGeometry args={[10, 0.4, 4]} />
          <meshStandardMaterial color="#4a4a55" />
        </mesh>
        <CuboidCollider args={[5, 0.2, 2]} position={[15, 3, 10]} />
      </RigidBody>

      {/* 中レーン障害物 */}
      <RigidBody type="fixed" colliders={false} name="Collider_CenterBlock_1">
        <mesh castShadow receiveShadow position={[0, 1, 0]}>
          <boxGeometry args={[3, 2, 1]} />
          <meshStandardMaterial color="#6a5a40" />
        </mesh>
        <CuboidCollider args={[1.5, 1, 0.5]} position={[0, 1, 0]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} name="Collider_CenterBlock_2">
        <mesh castShadow receiveShadow position={[-8, 1, 0]}>
          <boxGeometry args={[1, 2, 3]} />
          <meshStandardMaterial color="#6a5a40" />
        </mesh>
        <CuboidCollider args={[0.5, 1, 1.5]} position={[-8, 1, 0]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} name="Collider_CenterBlock_3">
        <mesh castShadow receiveShadow position={[8, 1, 0]}>
          <boxGeometry args={[1, 2, 3]} />
          <meshStandardMaterial color="#6a5a40" />
        </mesh>
        <CuboidCollider args={[0.5, 1, 1.5]} position={[8, 1, 0]} />
      </RigidBody>

      {/* 下レーン通路の側壁（屋内通路風） */}
      <RigidBody type="fixed" colliders={false} name="Collider_LowerLane_Wall_N">
        <mesh receiveShadow position={[0, 1.5, -6]}>
          <boxGeometry args={[30, 3, 0.5]} />
          <meshStandardMaterial color="#3a3a40" />
        </mesh>
        <CuboidCollider args={[15, 1.5, 0.25]} position={[0, 1.5, -6]} />
      </RigidBody>

      <RigidBody type="fixed" colliders={false} name="Collider_LowerLane_Wall_S">
        <mesh receiveShadow position={[0, 1.5, 6]}>
          <boxGeometry args={[30, 3, 0.5]} />
          <meshStandardMaterial color="#3a3a40" />
        </mesh>
        <CuboidCollider args={[15, 1.5, 0.25]} position={[0, 1.5, 6]} />
      </RigidBody>

      {/* マップ外壁（落下防止） */}
      <RigidBody type="fixed" colliders={false} name="Collider_OuterWall_N">
        <CuboidCollider args={[widthX / 2, 10, 0.5]} position={[0, 10, MAP_BOUNDS.minZ - 0.5]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} name="Collider_OuterWall_S">
        <CuboidCollider args={[widthX / 2, 10, 0.5]} position={[0, 10, MAP_BOUNDS.maxZ + 0.5]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} name="Collider_OuterWall_W">
        <CuboidCollider args={[0.5, 10, depthZ / 2]} position={[MAP_BOUNDS.minX - 0.5, 10, 0]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} name="Collider_OuterWall_E">
        <CuboidCollider args={[0.5, 10, depthZ / 2]} position={[MAP_BOUNDS.maxX + 0.5, 10, 0]} />
      </RigidBody>

      {/* 環境光・指向性ライト */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </group>
  );
}
