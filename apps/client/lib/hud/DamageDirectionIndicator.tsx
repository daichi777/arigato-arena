'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useGameStore } from '../../game/store/gameStore';
import { calcDamageAngle } from './util/damageDirection';

/** インジケータのフェード時間 */
const INDICATOR_FADE_MS = 700;
/** インジケータの有効時間（フェードを含む） */
const INDICATOR_TTL_MS = 800;

interface ActiveIndicator {
  id: string;
  angle: number; // ラジアン
  createdAt: number; // performance.now
}

/**
 * 被弾方向インジケータ。
 *
 * - `gameStore.recentHits` から自分が victim のエントリを取得。
 * - shooter 位置と自分位置から相対角度を計算。
 * - 画面端の弧アロー（SVG）を DOM に描画、500-800ms でフェードアウト。
 * - 100ms ポーリングで DOM 更新（useFrame 不要）。
 */
export function DamageDirectionIndicator(): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeIndicatorsRef = useRef<ActiveIndicator[]>([]);
  const processedShotIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handle = setInterval(() => {
      const now = performance.now();
      const state = useGameStore.getState();
      const yourId = state.yourPlayerId;
      if (!yourId) return;

      const selfPos = state.selfPosition;
      const selfYaw = state.selfYaw;
      if (!selfPos) return;

      // 新しいヒットイベントを確認して被弾方向を追加
      const recentHits = state.recentHits;
      for (const hit of recentHits) {
        if (hit.victimId !== yourId) continue;
        if (processedShotIdsRef.current.has(hit.shotId)) continue;
        processedShotIdsRef.current.add(hit.shotId);

        // shooter の位置を playersForMinimap から取得
        const shooterSnapshot = state.playersForMinimap.find((p) => p.id === hit.shooterId);
        if (!shooterSnapshot) continue;

        const angle = calcDamageAngle(
          { x: selfPos.x, z: selfPos.z },
          { x: shooterSnapshot.position.x, z: shooterSnapshot.position.z },
          selfYaw,
        );
        if (angle === null) continue;

        activeIndicatorsRef.current.push({
          id: hit.shotId,
          angle,
          createdAt: now,
        });
      }

      // TTL 切れをパージ
      activeIndicatorsRef.current = activeIndicatorsRef.current.filter(
        (ind) => now - ind.createdAt < INDICATOR_TTL_MS,
      );

      // processedShotIds のキャッシュが大きくなりすぎないように 100 件以上は捨てる
      if (processedShotIdsRef.current.size > 100) {
        processedShotIdsRef.current.clear();
      }

      // DOM を直接 mutate して描画更新
      renderIndicators(containerRef.current, activeIndicatorsRef.current, now);
    }, 100);

    return () => clearInterval(handle);
  }, []);

  return (
    <div
      ref={(el) => { containerRef.current = el; }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  );
}

// ---- DOM 直接更新（React 再レンダ回避） ----

function renderIndicators(
  container: HTMLDivElement | null,
  indicators: ActiveIndicator[],
  now: number,
): void {
  if (!container) return;

  // 既存 SVG を全削除して再構築（要素数が少ないので問題なし）
  container.innerHTML = '';

  for (const ind of indicators) {
    const age = now - ind.createdAt;
    const fadeStart = INDICATOR_FADE_MS;
    const opacity =
      age < fadeStart ? 1 : 1 - (age - fadeStart) / (INDICATOR_TTL_MS - fadeStart);
    if (opacity <= 0) continue;

    const svg = buildArrowSvg(ind.angle, opacity);
    container.appendChild(svg);
  }
}

/**
 * 方向を示す弧アロー SVG を生成する。
 * 画面中央から半径 120px の位置に配置。
 */
function buildArrowSvg(angle: number, opacity: number): SVGSVGElement {
  const size = 300; // SVG のサイズ（中央に配置するための幅・高さ）
  const r = 120; // 中心からの距離
  const arcSpan = Math.PI / 6; // 弧の幅（30 度）
  const cx = size / 2;
  const cy = size / 2;

  // 弧の始点・終点（angle が前方 = 上）
  // SVG 上では Y 軸が下方向なので、角度は time π/2 オフセットが必要
  // angle=0（前方）→ 上（-Y 方向）、angle=π/2（右）→ 右（+X 方向）
  const svgAngleOffset = -Math.PI / 2;
  const a1 = angle + svgAngleOffset - arcSpan / 2;
  const a2 = angle + svgAngleOffset + arcSpan / 2;

  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);

  // 矢印の先端（弧の中点）
  const aMid = angle + svgAngleOffset;
  const tipR = r + 14;
  const tipX = cx + tipR * Math.cos(aMid);
  const tipY = cy + tipR * Math.sin(aMid);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.style.position = 'absolute';
  svg.style.left = `calc(50% - ${size / 2}px)`;
  svg.style.top = `calc(50% - ${size / 2}px)`;
  svg.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  svg.style.pointerEvents = 'none';

  // 弧パス
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const d = `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  arc.setAttribute('d', d);
  arc.setAttribute('stroke', '#ff4444');
  arc.setAttribute('stroke-width', '4');
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke-linecap', 'round');
  svg.appendChild(arc);

  // 矢印の三角形（先端）
  const triSize = 8;
  const perpAngle = aMid + Math.PI / 2;
  const tx1 = tipX + triSize * Math.cos(perpAngle);
  const ty1 = tipY + triSize * Math.sin(perpAngle);
  const tx2 = tipX - triSize * Math.cos(perpAngle);
  const ty2 = tipY - triSize * Math.sin(perpAngle);
  const tx3 = tipX + triSize * 1.5 * Math.cos(aMid);
  const ty3 = tipY + triSize * 1.5 * Math.sin(aMid);

  const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  tri.setAttribute('points', `${tx1},${ty1} ${tx2},${ty2} ${tx3},${ty3}`);
  tri.setAttribute('fill', '#ff4444');
  svg.appendChild(tri);

  return svg;
}
