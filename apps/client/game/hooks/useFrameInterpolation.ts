'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { CLIENT_INTERPOLATION_MS } from '@arigato/shared';
import type { SnapshotBuffer } from '../net/snapshotBuffer';
import { makePair, interpolatePlayer } from '../net/interpolate';
import type { InterpolatedFrame } from '../types';

/**
 * 補間描画ティック。
 *
 * - useFrame 内で SnapshotBuffer を参照し、現在描画時刻に対応する prev/next を取得。
 * - 各 playerId について `apply(id, frame)` を呼び出す。
 * - React state は触らない（呼び出し側で Object3D を mutate）。
 *
 * 描画時刻 = `latestServerTimeMs() - CLIENT_INTERPOLATION_MS`
 */
export function useFrameInterpolation(
  buffer: SnapshotBuffer,
  apply: (playerId: string, frame: InterpolatedFrame) => void,
): void {
  // SnapshotBuffer は安定参照を期待。useMemo はリスナー再構築抑制のためのフック呼び出し統一目的。
  const _ = useMemo(() => buffer, [buffer]);
  void _;

  useFrame(() => {
    const latest = buffer.latestServerTimeMs();
    if (latest == null) return;
    const renderTime = latest - CLIENT_INTERPOLATION_MS;

    const pairRaw = buffer.findPair(renderTime);
    if (!pairRaw) return;

    const pair = makePair(pairRaw.prev, pairRaw.next, renderTime);

    // next 側に含まれる全プレイヤーを反復（prev だけにいる切断済みは描画から除外）
    pair.next.players.forEach((_p, id) => {
      const result = interpolatePlayer(pair, id);
      if (!result) return;
      apply(id, {
        position: result.position,
        yaw: result.yaw,
        pitch: result.pitch,
        velocity: result.velocity,
      });
    });
  });
}
