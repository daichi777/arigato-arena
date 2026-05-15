import type { PlayerId } from '@arigato/shared';
import type { RemotePlayerVisual } from '../types';

/**
 * StubScene 用のテスト fixture。lobby agent が完成するまでの暫定。
 */
export const STUB_SELF_ID: PlayerId = 'self-stub';

export function buildStubVisuals(): Map<PlayerId, RemotePlayerVisual> {
  const m = new Map<PlayerId, RemotePlayerVisual>();
  m.set('bot-red-1', { id: 'bot-red-1', name: 'Bot Red 1', team: 'red' });
  m.set('bot-blue-1', { id: 'bot-blue-1', name: 'Bot Blue 1', team: 'blue' });
  m.set('bot-blue-2', { id: 'bot-blue-2', name: 'Bot Blue 2', team: 'blue' });
  return m;
}
