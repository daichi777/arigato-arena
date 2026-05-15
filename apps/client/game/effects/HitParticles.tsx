'use client';

import { useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Points,
} from 'three';
import type { RecentHit } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';

/** ヒットスパークの寿命（ms） */
const SPARK_LIFETIME_MS = 220;
/** 1 ヒットあたりのパーティクル数 */
const SPARKS_PER_HIT = 6;
/** 同時パーティクル最大数 */
const MAX_PARTICLES = 256;

interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  startedAt: number;
}

/**
 * ヒット位置のスパーク（小さなパーティクル）。
 *
 * - 新規 ServerHitEvent ごとに hitPoint 周辺に 6 個のスパークを生成し、寿命 220ms で消える。
 * - state は使わず、`BufferAttribute` を毎フレーム更新。
 */
export function HitParticles(): JSX.Element {
  const pointsRef = useRef<Points>(null);
  const particlesRef = useRef<Spark[]>([]);
  const consumedRef = useRef<Set<string>>(new Set());

  const positionsRef = useRef<Float32Array>(new Float32Array(MAX_PARTICLES * 3));

  useFrame((_state, delta) => {
    const p = pointsRef.current;
    if (!p) return;

    // 未消費の hit を消費してパーティクルを湧かせる
    const recent = useGameStore.getState().recentHits;
    for (const h of recent) {
      if (consumedRef.current.has(h.shotId + ':sparks')) continue;
      consumedRef.current.add(h.shotId + ':sparks');
      spawnSparks(particlesRef.current, h);
      while (particlesRef.current.length > MAX_PARTICLES) {
        particlesRef.current.shift();
      }
    }

    // 物理更新（簡易、重力少なめ）
    const dt = Math.min(0.05, delta);
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const alive: Spark[] = [];
    for (const s of particlesRef.current) {
      if (now - s.startedAt >= SPARK_LIFETIME_MS) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.vy += -6 * dt; // 軽い重力
      alive.push(s);
    }
    particlesRef.current = alive;

    // バッファ反映
    const arr = positionsRef.current;
    arr.fill(0);
    let i = 0;
    for (const s of alive) {
      arr[i++] = s.x;
      arr[i++] = s.y;
      arr[i++] = s.z;
      if (i >= arr.length) break;
    }
    const geo = p.geometry as BufferGeometry;
    const attr = geo.getAttribute('position') as BufferAttribute | undefined;
    if (attr) attr.needsUpdate = true;
    geo.setDrawRange(0, alive.length);
  });

  return (
    <points ref={pointsRef} renderOrder={19}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
          count={MAX_PARTICLES}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffd86b"
        transparent
        opacity={0.95}
        blending={AdditiveBlending}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function spawnSparks(out: Spark[], h: RecentHit): void {
  const now =
    typeof performance !== 'undefined' ? performance.now() : Date.now();
  for (let i = 0; i < SPARKS_PER_HIT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 1.5 + Math.random() * 2.0;
    const vx = speed * Math.sin(phi) * Math.cos(theta);
    const vy = speed * Math.cos(phi);
    const vz = speed * Math.sin(phi) * Math.sin(theta);
    out.push({
      x: h.hitPoint.x,
      y: h.hitPoint.y,
      z: h.hitPoint.z,
      vx,
      vy,
      vz,
      startedAt: now,
    });
  }
}
