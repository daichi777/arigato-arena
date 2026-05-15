// renderer agent ローカル定数。
// `@arigato/shared` の凍結定数を補完する描画固有の値だけをここに置く。

import { PLAYER_PHYSICS } from '@arigato/shared';

/** クライアント入力送信レート（20Hz） */
export const INPUT_SEND_INTERVAL_MS = 50;

/** マウス感度（rad / px） */
export const MOUSE_SENSITIVITY = 0.0022;

/** カメラの目線高さ（カプセル底からのオフセット） */
export const EYE_HEIGHT_FROM_FEET = PLAYER_PHYSICS.headHeight;

/**
 * Rapier カプセルは中心が原点。
 * カプセル全長 = 2*halfHeight + 2*radius。
 * `capsuleHeight` は全長として扱う前提で halfHeight を計算する。
 */
export const CAPSULE_HALF_HEIGHT = Math.max(
  0.01,
  (PLAYER_PHYSICS.capsuleHeight - 2 * PLAYER_PHYSICS.capsuleRadius) / 2,
);

/** マップの GLB URL（asset agent が出力するまではプリミティブで仮実装） */
export const MAP_GLB_URL = '/assets/maps/arena_v1.glb';

/** キャラクター GLB URL */
export function characterGlbUrl(characterId: string): string {
  return `/assets/characters/${characterId}.glb`;
}

/** デバッグパネル更新間隔（ms） */
export const DEBUG_PANEL_UPDATE_MS = 250;

/** 補間バッファに保持する snapshot の最大数（古いものは捨てる） */
export const SNAPSHOT_BUFFER_MAX = 32;

/** 接地判定の許容下方向距離（カプセル底からのレイ長 m） */
export const GROUND_CHECK_RAY_LENGTH = 0.15;
