'use client';

import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import GameView from '../GameView';
import { StubServerConnection } from '../net/stubServer';
import { STUB_SELF_ID, buildStubVisuals } from './stubFixtures';

/**
 * サーバー無しで renderer 全体を駆動する Dev Story。
 *
 * 想定用途:
 * - lobby agent の page 実装を待たずに、`apps/client/game/__dev__/StubScene.tsx` を
 *   任意のページから動的 import すれば描画動作を確認できる。
 * - 自プレイヤーは LocalPlayerController がローカルで動かし、
 *   他プレイヤーは StubServerConnection が偽 snapshot で配信。
 */
export default function StubScene(): JSX.Element {
  const connection = useMemo(() => new StubServerConnection(STUB_SELF_ID), []);
  const visuals = useMemo(() => buildStubVisuals(), []);

  useEffect(() => {
    connection.start();
    return () => connection.stop();
  }, [connection]);

  return <GameView connection={connection} team="red" playerVisuals={visuals} />;
}
