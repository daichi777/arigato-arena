'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import type { Group } from 'three';
import type { PlayerId } from '@arigato/shared';
import { RemotePlayer } from './RemotePlayer';
import { useFrameInterpolation } from '../hooks/useFrameInterpolation';
import type { SnapshotBuffer } from '../net/snapshotBuffer';
import type { RemotePlayerVisual } from '../types';

interface Props {
  buffer: SnapshotBuffer;
  /** 自プレイヤー ID（描画対象から除外する） */
  selfId: PlayerId | null;
  /** 表示メタ情報（lobby agent から RoomState を受け取って渡す想定） */
  visuals: Map<PlayerId, RemotePlayerVisual>;
}

/**
 * 他プレイヤー一覧の描画。
 *
 * 設計:
 * - snapshot から「現在描画対象に含まれる id 集合」を 200ms 間隔で setState 同期する
 *   （マウント・アンマウントの頻度を抑える）。
 * - 位置・回転の更新は useFrameInterpolation 内で Object3D を直接 mutate（再レンダ無し）。
 */
export function RemotePlayers({ buffer, selfId, visuals }: Props): JSX.Element {
  const [knownIds, setKnownIds] = useState<readonly PlayerId[]>([]);
  const knownIdsRef = useRef<readonly PlayerId[]>(knownIds);
  knownIdsRef.current = knownIds;

  const groupRefs = useRef<Map<PlayerId, Group>>(new Map());

  const onMount = useCallback((id: PlayerId, g: Group | null) => {
    if (g) groupRefs.current.set(id, g);
    else groupRefs.current.delete(id);
  }, []);

  // 補間描画。位置と yaw を Object3D に直接書き込む（React 再レンダ無し）。
  useFrameInterpolation(buffer, (id, frame) => {
    if (id === selfId) return;
    const g = groupRefs.current.get(id);
    if (!g) return; // 初登場 → 次の id 同期周期でマウントされる
    g.position.set(frame.position.x, frame.position.y, frame.position.z);
    g.rotation.y = frame.yaw;
  });

  // 「最新 next snapshot に含まれる id 集合」を 200ms ごとに同期（マウント差分）
  useEffect(() => {
    const handle = setInterval(() => {
      const latest = buffer.latestServerTimeMs();
      if (latest == null) return;
      const pair = buffer.findPair(latest - 100);
      const nextPlayers = pair?.next.players;
      if (!nextPlayers) return;
      const nextIds = Array.from(nextPlayers.keys()).filter(
        (id): id is PlayerId => id !== selfId,
      );
      const current = knownIdsRef.current;
      const sameLength = nextIds.length === current.length;
      const sameSet =
        sameLength && nextIds.every((id) => current.includes(id));
      if (!sameSet) {
        setKnownIds(nextIds);
      }
    }, 200);
    return () => clearInterval(handle);
  }, [buffer, selfId]);

  return (
    <group name="RemotePlayers">
      {knownIds.map((id) => {
        const v = visuals.get(id);
        return (
          <RemotePlayer
            key={id}
            playerId={id}
            name={v?.name}
            team={v?.team}
            onMount={onMount}
          />
        );
      })}
    </group>
  );
}
