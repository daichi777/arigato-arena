import type { RoomState, ServerMatchEnd, ServerMessage } from '@arigato/shared';

/**
 * finished フェーズ確定後に呼ばれ、ServerMatchEnd を enqueue する。
 *
 * state.finalResult は transitionToFinished の段階で埋められている前提。
 * 万が一 null のときは呼び出し側に通知不可、何もせず戻る。
 */
export function buildMatchEndMessage(state: RoomState): ServerMatchEnd | null {
  if (!state.finalResult) return null;
  return {
    type: 'match_end',
    result: state.finalResult,
  };
}

/**
 * 既存の broadcast キューに ServerMatchEnd を積むヘルパ。
 */
export function enqueueMatchEnd(state: RoomState, enqueueBroadcast: (msg: ServerMessage) => void): void {
  const msg = buildMatchEndMessage(state);
  if (msg) enqueueBroadcast(msg);
}
