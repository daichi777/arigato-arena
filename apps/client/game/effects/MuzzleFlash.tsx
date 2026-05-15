'use client';

import { useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, type Mesh, Vector3 } from 'three';
import { PLAYER_PHYSICS } from '@arigato/shared';
import type { KeyState } from '../types';

/** 1 発の閃光の生存時間（ms） */
const FLASH_LIFETIME_MS = 60;

interface Props {
  /** ローカル fire ref。立ち上がりエッジを検出する */
  keysRef: React.MutableRefObject<KeyState>;
}

/**
 * 自プレイヤーの銃口閃光。
 *
 * - 自分の fire の立ち上がりエッジで点灯し、`FLASH_LIFETIME_MS` で消える。
 * - カメラ前方に小さな発光プレートを描画（カメラに追従）。
 * - state は使わず、material.opacity と scale を useFrame 内で直接 mutate。
 */
export function MuzzleFlash({ keysRef }: Props): JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const lifetimeStartRef = useRef<number | null>(null);
  const prevFireRef = useRef(false);
  const camera = useThree((s) => s.camera);

  // useFrame 内で使う一時 Vec
  const tmp = useRef(new Vector3());

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // 立ち上がりエッジ検出
    const fire = keysRef.current.fire;
    const prev = prevFireRef.current;
    if (fire && !prev) {
      lifetimeStartRef.current =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    prevFireRef.current = fire;

    const start = lifetimeStartRef.current;
    const nowMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const t = start == null ? Infinity : nowMs - start;

    if (t >= FLASH_LIFETIME_MS) {
      mesh.visible = false;
      return;
    }

    // フェード: 60ms かけて opacity 1→0
    const k = 1 - t / FLASH_LIFETIME_MS;
    mesh.visible = true;

    // 銃口位置: カメラ位置 + 前方 0.6m + 右下に少しオフセット
    camera.getWorldDirection(tmp.current);
    mesh.position
      .copy(camera.position)
      .addScaledVector(tmp.current, 0.6)
      // カメラ右にオフセット（簡易：右ベクトル = カメラ右）
      .add(_cameraRight(camera, 0.18))
      .add(_cameraUp(camera, -0.12));
    mesh.lookAt(camera.position);

    // ランダムで微妙にサイズ揺らぎ
    const baseScale = 0.18 + 0.08 * k;
    mesh.scale.setScalar(baseScale * (0.9 + Math.random() * 0.2));

    const mat = mesh.material;
    if (Array.isArray(mat)) return;
    if ('opacity' in mat) {
      mat.opacity = k;
    }
  });

  return (
    <mesh ref={meshRef} visible={false} renderOrder={20}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={'#fff2a8'}
        transparent
        opacity={0}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// PLAYER_PHYSICS import を「使用済み」にしておく（将来 head 高で補正する想定）
void PLAYER_PHYSICS;

// カメラ右ベクトル（World 空間）。tmp 不使用にするため小さい new Vector3 を返す。
function _cameraRight(
  camera: import('three').Camera,
  scale: number,
): Vector3 {
  const v = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  return v.multiplyScalar(scale);
}

function _cameraUp(
  camera: import('three').Camera,
  scale: number,
): Vector3 {
  const v = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  return v.multiplyScalar(scale);
}
