'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { PlayerSnapshot, Vec3 } from '@arigato/shared';
import { MAP_BOUNDS } from '@arigato/shared';
import { useGameStore } from '../../game/store/gameStore';
import type { RemotePlayerVisual } from '../../game/types';

interface Props {
  /** lobby agent から渡される表示メタ（チーム色判定に必要） */
  visuals?: Map<string, RemotePlayerVisual>;
}

/** 自チームのマップ色（自分と同じ色を青、敵を赤に統一する慣例） */
function teamColor(
  myTeam: 'red' | 'blue' | undefined,
  theirTeam: 'red' | 'blue' | undefined,
): string {
  if (!myTeam || !theirTeam) return '#bbb';
  return myTeam === theirTeam ? '#5ea0ff' : '#ff6b5e';
}

/**
 * ミニマップ（右下、SVG）。
 *
 * - マップ範囲: MAP_BOUNDS（X[-30,30], Z[-20,20]）→ SVG 内 viewBox に変換。
 * - 100ms ごとに store から playersForMinimap をスナップショット取得。
 * - 自分 = 白い丸 + 向き矢印。
 * - 同チーム = 青、敵 = 赤。死亡中 (isAlive=false) は薄表示。
 */
export function Minimap({ visuals }: Props): JSX.Element {
  // 100ms 間隔の DOM 再描画
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handle = setInterval(() => setTick((n) => n + 1), 100);
    return () => clearInterval(handle);
  }, []);
  void tick;

  // store を都度 getState() で読む（subscribe しない→低頻度コンポーネント）
  const state = useGameStore.getState();
  const players: PlayerSnapshot[] = state.playersForMinimap;
  const selfId = state.yourPlayerId;
  const myTeam = selfId
    ? visuals?.get(selfId)?.team
    : undefined;

  // SVG 描画パラメータ
  const widthPx = 150;
  const mapW = MAP_BOUNDS.maxX - MAP_BOUNDS.minX; // 60
  const mapH = MAP_BOUNDS.maxZ - MAP_BOUNDS.minZ; // 40
  const heightPx = (widthPx * mapH) / mapW; // 100

  return (
    <div
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        padding: 6,
        background: 'rgba(0,0,0,0.55)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 6,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <svg
        width={widthPx}
        height={heightPx}
        viewBox={`${MAP_BOUNDS.minX} ${MAP_BOUNDS.minZ} ${mapW} ${mapH}`}
        style={{ display: 'block' }}
      >
        {/* マップ枠 */}
        <rect
          x={MAP_BOUNDS.minX}
          y={MAP_BOUNDS.minZ}
          width={mapW}
          height={mapH}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={0.4}
        />

        {/* プレイヤードット */}
        {players.map((p) => {
          const isSelf = p.id === selfId;
          const theirTeam = visuals?.get(p.id)?.team;
          const fill = isSelf
            ? '#ffffff'
            : teamColor(myTeam, theirTeam);
          const opacity = p.isAlive ? 1 : 0.35;
          return (
            <g key={p.id} opacity={opacity}>
              <circle
                cx={p.position.x}
                // SVG の y 軸は下が +。Three の Z は奥が -。今回は「Z→y にそのまま使う」ことで、
                // ゲーム内 +Z（北）が画面上方に来るような視覚的回転は別途要件次第。
                // ここでは「Z をそのまま画面 Y にする」シンプルマッピング。
                cy={p.position.z}
                r={isSelf ? 1.2 : 0.9}
                fill={fill}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={0.15}
              />
              {isSelf ? renderHeadingArrow(p.position, p.yaw) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function renderHeadingArrow(pos: Vec3, yaw: number): JSX.Element {
  // 矢印長 2m。yaw=0 は -Z 方向（カメラ前方）。
  // SVG 上では +Z 方向が下。
  const len = 2.5;
  const dx = -Math.sin(yaw) * len;
  const dz = -Math.cos(yaw) * len;
  return (
    <line
      x1={pos.x}
      y1={pos.z}
      x2={pos.x + dx}
      y2={pos.z + dz}
      stroke="#ffffff"
      strokeWidth={0.35}
      strokeLinecap="round"
    />
  );
}
