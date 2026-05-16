'use client';

import { useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, type Mesh, type PointLight, Vector3 } from 'three';
import type { KeyState } from '../types';

/**
 * コア閃光の寿命（ms）。
 * 0-25ms はピーク維持、25-90ms はフェード+スケール拡大。
 */
const FLASH_LIFETIME_MS = 90;
/** PointLight の寿命（ms）。壁・障害物を照らす演出。 */
const LIGHT_LIFETIME_MS = 70;

interface Props {
  keysRef: React.MutableRefObject<KeyState>;
}

/**
 * 自プレイヤーの銃口閃光（Phase 3 全面刷新版）。
 *
 * 改善点:
 * - PointLight (intensity 8, distance 12) で周囲を一瞬照らす
 * - スプライト多重化: コア閃光 + グレアの 2 枚
 * - 寿命カーブ: 0-25ms ピーク維持、25-90ms フェード+拡大
 * - サイズ大幅増加（従来比 2 倍以上）
 */
export function MuzzleFlash({ keysRef }: Props): JSX.Element {
  const coreMeshRef = useRef<Mesh>(null);
  const glareMeshRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const lifetimeStartRef = useRef<number | null>(null);
  const prevFireRef = useRef(false);
  const camera = useThree((s) => s.camera);

  // useFrame 内 alloc 回避用の一時ベクタ
  const tmpDir = useRef(new Vector3());
  const tmpRight = useRef(new Vector3());
  const tmpUp = useRef(new Vector3());
  const tmpPos = useRef(new Vector3());

  useFrame(() => {
    const core = coreMeshRef.current;
    const glare = glareMeshRef.current;
    const light = lightRef.current;
    if (!core || !glare || !light) return;

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
    const elapsed = start == null ? Infinity : nowMs - start;

    if (elapsed >= FLASH_LIFETIME_MS) {
      core.visible = false;
      glare.visible = false;
      light.visible = false;
      return;
    }

    // 銃口位置計算（カメラ右下オフセット）
    camera.getWorldDirection(tmpDir.current);
    // 右ベクトル = カメラ右方向
    tmpRight.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    // 上ベクトル = カメラ上方向
    tmpUp.current.set(0, 1, 0).applyQuaternion(camera.quaternion);

    // 銃口位置: カメラ 1.2m 前 + 右 0.28m + 下 0.18m
    tmpPos.current
      .copy(camera.position)
      .addScaledVector(tmpDir.current, 1.2)
      .addScaledVector(tmpRight.current, 0.28)
      .addScaledVector(tmpUp.current, -0.18);

    // ---------- 寿命カーブ ----------
    // 0-25ms: ピーク (k=1)
    // 25-90ms: フェード (k: 1→0) + スケール拡大 (1.0→1.2)
    const PEAK_MS = 25;
    let k: number;
    let scaleMult: number;
    if (elapsed < PEAK_MS) {
      k = 1.0;
      scaleMult = 1.0;
    } else {
      const t = (elapsed - PEAK_MS) / (FLASH_LIFETIME_MS - PEAK_MS);
      k = 1.0 - t;
      scaleMult = 1.0 + t * 0.2; // 1.0→1.2 に拡大
    }

    // ランダムゆらぎ（毎フレーム少し揺らす）
    const jitter = 0.9 + Math.random() * 0.2;

    // ---------- コア閃光 ----------
    const coreBaseScale = 0.18;
    core.visible = true;
    core.position.copy(tmpPos.current);
    core.lookAt(camera.position);
    core.scale.setScalar(coreBaseScale * scaleMult * jitter);
    const coreMat = core.material;
    if (!Array.isArray(coreMat) && 'opacity' in coreMat) {
      coreMat.opacity = k;
    }

    // ---------- グレア（大きく薄く） ----------
    const glareBaseScale = 0.45;
    glare.visible = true;
    glare.position.copy(tmpPos.current);
    glare.lookAt(camera.position);
    glare.scale.setScalar(glareBaseScale * scaleMult * jitter);
    const glareMat = glare.material;
    if (!Array.isArray(glareMat) && 'opacity' in glareMat) {
      glareMat.opacity = k * 0.6;
    }

    // ---------- PointLight ----------
    if (elapsed < LIGHT_LIFETIME_MS) {
      // 70ms 以内は点灯
      const lightFade = 1.0 - elapsed / LIGHT_LIFETIME_MS;
      light.visible = true;
      light.position.copy(tmpPos.current);
      light.intensity = 8.0 * lightFade;
    } else {
      light.visible = false;
    }
  });

  return (
    <group>
      {/* PointLight: 周囲の壁・障害物を一瞬照らす */}
      <pointLight
        ref={lightRef}
        visible={false}
        color="#ffd070"
        intensity={0}
        distance={12}
        decay={2}
        castShadow={false}
      />

      {/* コア閃光: 白っぽい小さな強い輝点 */}
      <mesh ref={coreMeshRef} visible={false} renderOrder={21}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#fffbe0"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* グレア: オレンジ寄りの大きな発光ブロブ */}
      <mesh ref={glareMeshRef} visible={false} renderOrder={20}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#ffb83a"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}
