'use client';

import { useRef } from 'react';
import type { JSX } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type LineSegments,
} from 'three';
import type { RecentHit } from '../store/gameStore';
import { useGameStore } from '../store/gameStore';

/** 弾道の生存時間（ms） */
const TRACER_LIFETIME_MS = 300;
/** 同時表示できる弾道の最大数 */
const MAX_TRACERS = 32;

interface Tracer {
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
  startedAt: number;
}

/**
 * 弾道の一瞬の線。
 *
 * - サーバーからの ServerHitEvent（store.recentHits）の前回未消費分について、
 *   shooter の現在位置（または直近スナップショット位置）→ hitPoint まで線を引く。
 * - state を使わず、useFrame 内で `BufferGeometry` の position attribute を直接 mutate。
 * - shooterId が自分の場合のみ「カメラ位置」から、それ以外は store の playersForMinimap から取得。
 */
export function TracerLine(): JSX.Element {
  const segmentsRef = useRef<LineSegments>(null);
  const tracersRef = useRef<Tracer[]>([]);
  const consumedShotIdsRef = useRef<Set<string>>(new Set());

  // 容量固定の position バッファ（2 vertices × 3 coords × MAX_TRACERS）
  const positionsRef = useRef<Float32Array>(new Float32Array(MAX_TRACERS * 2 * 3));

  useFrame(() => {
    const ls = segmentsRef.current;
    if (!ls) return;

    // store の recentHits から、まだ消費していない shotId を取り出して tracer に変換
    const state = useGameStore.getState();
    const consumed = consumedShotIdsRef.current;
    const selfId = state.yourPlayerId;
    const players = state.playersForMinimap;

    for (const h of state.recentHits) {
      if (consumed.has(h.shotId)) continue;
      consumed.add(h.shotId);
      const from = resolveShooterPosition(h, selfId, players);
      if (!from) continue;
      tracersRef.current.push({
        from,
        to: { x: h.hitPoint.x, y: h.hitPoint.y, z: h.hitPoint.z },
        startedAt:
          typeof performance !== 'undefined' ? performance.now() : Date.now(),
      });
      if (tracersRef.current.length > MAX_TRACERS) {
        tracersRef.current.shift();
      }
    }

    // 寿命切れを除去
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    tracersRef.current = tracersRef.current.filter(
      (t) => now - t.startedAt < TRACER_LIFETIME_MS,
    );

    // 全 vertex 数 = tracers.length * 2
    const arr = positionsRef.current;
    arr.fill(0);
    let i = 0;
    for (const t of tracersRef.current) {
      arr[i++] = t.from.x;
      arr[i++] = t.from.y;
      arr[i++] = t.from.z;
      arr[i++] = t.to.x;
      arr[i++] = t.to.y;
      arr[i++] = t.to.z;
      if (i >= arr.length) break;
    }

    const geo = ls.geometry as BufferGeometry;
    const attr = geo.getAttribute('position') as BufferAttribute | undefined;
    if (attr) {
      attr.needsUpdate = true;
    }
    geo.setDrawRange(0, tracersRef.current.length * 2);
  });

  return (
    <lineSegments ref={segmentsRef} renderOrder={19}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionsRef.current, 3]}
          count={MAX_TRACERS * 2}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#fff2a8"
        transparent
        opacity={0.7}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function resolveShooterPosition(
  h: RecentHit,
  selfId: string | null,
  players: import('@arigato/shared').PlayerSnapshot[],
): { x: number; y: number; z: number } | null {
  const p = players.find((pp) => pp.id === h.shooterId);
  if (p) {
    return { x: p.position.x, y: p.position.y + 1.5, z: p.position.z };
  }
  // 見つからない（自分のスナップショットがまだない、または相手）。スキップ。
  void selfId;
  return null;
}
