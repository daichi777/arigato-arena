'use client';

import { useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Vector3, Euler } from 'three';
import type { WeaponType } from '@arigato/shared';
import { useGameStore } from '../store/gameStore';

/**
 * 一人称武器ビューモデル（Phase 3 新規）。
 *
 * - カメラから固定オフセットで武器形状を描画する
 * - pitch 追従しない（カメラ位置+ローカル右下オフセット）
 * - 武器種別に応じて形状切替（AR/SG/SMG）
 * - リロード中は銃を下に傾ける（X軸 -0.6rad）
 * - useFrame 内で ref を直接 mutate（state 使用なし）
 */

/** カメラからの固定オフセット（右・下・前） */
const OFFSET_RIGHT = 0.22;
const OFFSET_DOWN = -0.16;
const OFFSET_FORWARD = 0.45;

/** リロード中の傾き */
const RELOAD_TILT_X = -0.5;

interface WeaponShape {
  /** 銃身の長さ (m) */
  barrelLength: number;
  /** 銃身の横幅 */
  barrelWidth: number;
  /** 銃身の高さ */
  barrelHeight: number;
  /** グリップ高さ */
  gripHeight: number;
  /** 銃口の先端オフセット（銃身の半分） */
  muzzleOffset: number;
}

const WEAPON_SHAPES: Record<WeaponType, WeaponShape> = {
  ar: {
    barrelLength: 0.55,
    barrelWidth: 0.05,
    barrelHeight: 0.06,
    gripHeight: 0.12,
    muzzleOffset: 0.275,
  },
  sg: {
    barrelLength: 0.40,
    barrelWidth: 0.07,
    barrelHeight: 0.08,
    gripHeight: 0.10,
    muzzleOffset: 0.20,
  },
  smg: {
    barrelLength: 0.45,
    barrelWidth: 0.04,
    barrelHeight: 0.05,
    gripHeight: 0.11,
    muzzleOffset: 0.225,
  },
};

interface Props {
  /** リコイルによる追加 pitch（rad）。useRecoil から受け取る */
  recoilPitch?: React.MutableRefObject<number>;
}

/**
 * WeaponViewModel コンポーネント。
 * GameCanvas から直接マウントする。
 */
export function WeaponViewModel({ recoilPitch }: Props): JSX.Element {
  const groupRef = useRef<Group>(null);
  const camera = useThree((s) => s.camera);

  // 一時ベクタ（useFrame 内 alloc 回避）
  const tmpRight = useRef(new Vector3());
  const tmpUp = useRef(new Vector3());
  const tmpDir = useRef(new Vector3());

  // 現在の武器とリロード状態は毎フレーム getState で取得（subscribe しない）
  // React re-render は不要なので useMemo は形状のみ

  // 武器ごとの形状データを useMemo でプリビルド
  const shapes = useMemo(
    () =>
      ({
        ar: WEAPON_SHAPES.ar,
        sg: WEAPON_SHAPES.sg,
        smg: WEAPON_SHAPES.smg,
      }) as Record<WeaponType, WeaponShape>,
    [],
  );

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const state = useGameStore.getState();
    const weapon = state.currentWeapon;
    const isReloading = state.isReloading;
    const isAlive = state.isAlive;

    if (!isAlive) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // カメラの右・上・前方向ベクトルを取得
    tmpRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    tmpUp.current.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.getWorldDirection(tmpDir.current);

    // 武器グループ位置: カメラ + オフセット
    group.position
      .copy(camera.position)
      .addScaledVector(tmpRight.current, OFFSET_RIGHT)
      .addScaledVector(tmpUp.current, OFFSET_DOWN)
      .addScaledVector(tmpDir.current, OFFSET_FORWARD);

    // 武器回転: カメラの yaw のみ追従（pitch 追従なし→水平に保つ）
    // カメラ quaternion から yaw 成分だけ抽出
    group.quaternion.copy(camera.quaternion);

    // リロード中: 銃を前方下に傾ける
    const targetTiltX = isReloading ? RELOAD_TILT_X : 0;
    const currentEuler = new Euler().setFromQuaternion(group.quaternion, 'YXZ');
    // リコイル加算
    const recoilAdd = recoilPitch ? recoilPitch.current : 0;
    currentEuler.x = targetTiltX + recoilAdd;
    group.quaternion.setFromEuler(currentEuler);

    // 子メッシュの visible を武器種別で切替
    // 子は ar=index0, sg=index1, smg=index2
    const children = group.children;
    const weaponIndex = weapon === 'ar' ? 0 : weapon === 'sg' ? 1 : 2;
    for (let i = 0; i < children.length; i++) {
      children[i]!.visible = i === weaponIndex;
    }

    // muzzleLocalPos 更新は不要（MuzzleFlash はカメラオフセットで独立計算）
    void shapes;
  });

  return (
    <group ref={groupRef}>
      {/* AR: 細長い箱 + グリップ */}
      <group visible={true}>
        {/* 銃身 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry
            args={[
              WEAPON_SHAPES.ar.barrelWidth,
              WEAPON_SHAPES.ar.barrelHeight,
              WEAPON_SHAPES.ar.barrelLength,
            ]}
          />
          <meshStandardMaterial
            color="#222222"
            emissive="#222222"
            emissiveIntensity={0.05}
            roughness={0.8}
            metalness={0.9}
          />
        </mesh>
        {/* グリップ */}
        <mesh position={[0, -0.09, 0.08]}>
          <boxGeometry args={[0.04, WEAPON_SHAPES.ar.gripHeight, 0.05]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.9}
            metalness={0.3}
          />
        </mesh>
      </group>

      {/* SG: 短い太い箱 + ポンプ */}
      <group visible={false}>
        {/* 銃身 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry
            args={[
              WEAPON_SHAPES.sg.barrelWidth,
              WEAPON_SHAPES.sg.barrelHeight,
              WEAPON_SHAPES.sg.barrelLength,
            ]}
          />
          <meshStandardMaterial
            color="#1c1c1c"
            emissive="#1c1c1c"
            emissiveIntensity={0.05}
            roughness={0.7}
            metalness={0.85}
          />
        </mesh>
        {/* ポンプ（フォアエンド） */}
        <mesh position={[0, -0.04, 0.05]}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
          <meshStandardMaterial color="#2a2a1a" roughness={0.9} metalness={0.2} />
        </mesh>
      </group>

      {/* SMG: 細い箱 + マガジン */}
      <group visible={false}>
        {/* 銃身 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry
            args={[
              WEAPON_SHAPES.smg.barrelWidth,
              WEAPON_SHAPES.smg.barrelHeight,
              WEAPON_SHAPES.smg.barrelLength,
            ]}
          />
          <meshStandardMaterial
            color="#252525"
            emissive="#252525"
            emissiveIntensity={0.05}
            roughness={0.75}
            metalness={0.88}
          />
        </mesh>
        {/* マガジン */}
        <mesh position={[0, -0.1, 0.06]}>
          <boxGeometry args={[0.035, 0.13, 0.04]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.8} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
