'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Vector3 } from 'three';
import { PLAYER_PHYSICS } from '@arigato/shared';
import { CAPSULE_HALF_HEIGHT } from '../constants';
import { useGameStore } from '../store/gameStore';
import { CharacterModel } from './CharacterModel';
import { findCharacter } from '../../lib/lobby/characters';

interface Props {
  playerId: string;
  /** 表示名（未確定なら空文字） */
  name?: string;
  team?: 'red' | 'blue';
  /** characterId（GLB 読み込みと名前ラベル用） */
  characterId?: string;
  /** 自プレイヤーID（チーム色判定に使用） */
  selfId?: string | null;
  /** selfId のチーム（チーム色判定に使用） */
  selfTeam?: 'red' | 'blue';
  /** scene Group の ref を返す（親で Object3D mutate するため） */
  onMount?: (id: string, group: Group | null) => void;
}

/**
 * 他プレイヤー描画。
 *
 * - CharacterModel（GLB or カプセルフォールバック）で描画。
 * - 名前ラベル: アバター webp + 表示名 + キャラ名 + チーム色枠。
 * - 距離フェード: 30m 以上は非表示、15m 以上は opacity 0.6。
 * - 位置 / 回転の更新は useFrameInterpolation 内で Object3D.position/rotation を直接 mutate する。
 */
export function RemotePlayer({ playerId, name, team, characterId, selfId, selfTeam, onMount }: Props): JSX.Element {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const labelContainerRef = useRef<HTMLDivElement | null>(null);

  // キャラクターメタ情報
  const charMeta = findCharacter(characterId);

  // チーム色判定（自チームなら青枠、敵なら赤枠）
  const isSameTeam = selfTeam && team ? selfTeam === team : undefined;
  const borderColor =
    isSameTeam === true ? '#5ea0ff' :
    isSameTeam === false ? '#ff6b5e' :
    team === 'red' ? '#ff6b5e' :
    team === 'blue' ? '#5ea0ff' : '#aaa';

  // メッシュ半透明化（死亡状態）を 200ms 間隔でポーリング
  useEffect(() => {
    const handle = setInterval(() => {
      const players = useGameStore.getState().playersForMinimap;
      const me = players.find((p) => p.id === playerId);
      if (!me) return;
      const mesh = meshRef.current;
      if (mesh) {
        const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
        const setOpacity = (m: MeshStandardMaterial): void => {
          m.transparent = true;
          m.opacity = me.isAlive ? 1 : 0.18;
        };
        if (Array.isArray(mat)) mat.forEach(setOpacity);
        else setOpacity(mat);
      }
    }, 200);
    return () => clearInterval(handle);
  }, [playerId]);

  // 距離フェード: useFrame 内で ref から距離計算 → DOM を直接 mutate（state 禁止）
  const selfPosRef = useRef<Vector3>(new Vector3());
  useFrame(() => {
    if (!groupRef.current || !labelContainerRef.current) return;
    // 自分の位置を store から読む（getState 使用、subscribe しない）
    const selfPos = useGameStore.getState().selfPosition;
    if (selfPos) {
      selfPosRef.current.set(selfPos.x, selfPos.y, selfPos.z);
    }
    const dist = groupRef.current.position.distanceTo(selfPosRef.current);
    const el = labelContainerRef.current;
    if (dist > 30) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
      el.style.opacity = dist > 15 ? '0.6' : '1';
    }
  });

  return (
    <group
      ref={(g) => {
        groupRef.current = g;
        onMount?.(playerId, g);
      }}
    >
      {/* キャラクターモデル（GLB or カプセルフォールバック） */}
      <CharacterModel characterId={characterId ?? 'k2'} team={team} />

      {/* カプセル（hitbox 用透明メッシュ、フォールバック可視化は CharacterModel が担う） */}
      <mesh
        ref={meshRef}
        visible={false}
        position={[0, PLAYER_PHYSICS.capsuleHeight / 2, 0]}
      >
        <capsuleGeometry args={[PLAYER_PHYSICS.capsuleRadius, CAPSULE_HALF_HEIGHT * 2, 4, 8]} />
        <meshStandardMaterial transparent opacity={0} />
      </mesh>

      {/* 名前ラベル */}
      <Html
        position={[0, PLAYER_PHYSICS.capsuleHeight + 0.4, 0]}
        center
        distanceFactor={8}
        occlude={false}
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={(el) => { labelContainerRef.current = el; }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'rgba(0,0,0,0.65)',
            border: `2px solid ${borderColor}`,
            borderRadius: 6,
            padding: '3px 7px 3px 4px',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {/* アバター画像（webp） */}
          {charMeta?.imagePath ? (
            <img
              src={charMeta.imagePath}
              alt={charMeta.displayName}
              width={24}
              height={24}
              style={{
                borderRadius: '50%',
                border: `1.5px solid ${borderColor}`,
                objectFit: 'cover',
                flexShrink: 0,
              }}
              onError={(e) => {
                // 画像未配置でも img タグを消さず透明化するのみ
                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
              }}
            />
          ) : (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: borderColor,
                flexShrink: 0,
              }}
            />
          )}

          {/* テキスト部分 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              lineHeight: 1.2,
            }}
          >
            {/* 表示名（PlayerState.name） */}
            <span
              style={{
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                textShadow: '0 0 4px rgba(0,0,0,0.9)',
              }}
            >
              {name ?? playerId.slice(0, 6)}
            </span>
            {/* キャラ表示名（CHARACTERS テーブルの displayName） */}
            {charMeta && (
              <span
                style={{
                  color: borderColor,
                  fontSize: 10,
                  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                  opacity: 0.85,
                }}
              >
                {charMeta.displayName}
              </span>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}
