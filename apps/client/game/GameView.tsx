'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import dynamic from 'next/dynamic';
import type { PlayerId, Team, Vec3 } from '@arigato/shared';
import { HudOverlay } from '../lib/hud/HudOverlay';
import { useKeyboard } from './input/useKeyboard';
import { useMouseLook } from './input/useMouseLook';
import { usePointerLock } from './input/usePointerLock';
import { buildPlayerInput } from './input/buildPlayerInput';
import { SnapshotBuffer } from './net/snapshotBuffer';
import type { GameConnection, GameServerMessage } from './net/gameMessages';
import { InputSender } from './net/inputSender';
import { ShootSender } from './net/shootSender';
import { useFixedRateLoop } from './hooks/useFixedRateLoop';
import { useGameStore } from './store/gameStore';
import { INPUT_SEND_INTERVAL_MS } from './constants';
import type { RemotePlayerVisual } from './types';
import { useAudioInit } from '../lib/audio/useAudioInit';
import { audioManager } from '../lib/audio/AudioManager';

// GameCanvas は WebGL を必要とするため SSR を切る。
const GameCanvas = dynamic(() => import('./scene/GameCanvas.js').then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a10',
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'sans-serif',
      }}
    >
      Loading scene…
    </div>
  ),
});

export interface GameViewProps {
  /** lobby agent が用意する WebSocket 接続抽象。スタブ時はモック実装。 */
  connection: GameConnection;
  /** 自プレイヤーが所属するチーム（スポーン地点決定に使用）。 */
  team: Team;
  /**
   * lobby agent 側で保持する RoomState 由来の表示メタ。
   * 他プレイヤーの名前 / チーム / characterId を引くために使用。
   */
  playerVisuals?: Map<PlayerId, RemotePlayerVisual>;
}

/**
 * 試合画面ルート。Next.js App Router 配下の page から使う想定。
 *
 * - SSR禁止。`"use client"` で client-only。
 * - HUD は DOM、3D は <GameCanvas/>（dynamic で ssr:false）。
 * - WebSocket 接続は持たない。`connection` prop で受け取る。
 */
export default function GameView({
  connection,
  team,
  playerVisuals,
}: GameViewProps): JSX.Element {
  const keysRef = useKeyboard();
  const lookRef = useMouseLook();
  const { locked, request } = usePointerLock();
  const { initAudio } = useAudioInit();

  // Snapshot バッファは GameView の生存期間中安定参照
  const snapshotBuffer = useMemo(() => new SnapshotBuffer(), []);

  // 視覚メタは props 由来。未指定なら空マップ。
  const visuals = useMemo(
    () => playerVisuals ?? new Map<PlayerId, RemotePlayerVisual>(),
    [playerVisuals],
  );

  // ShootSender が参照する「自分の現在位置」ref。
  // 受信 snapshot から自分の position を毎回書き写す（useFrame ホットパス回避）。
  const localPositionRef = useRef<Vec3 | null>(null);
  // ShootSender が参照する「現在武器」を返す関数。
  // Store の selector ベースだと最新値が取れないので、ref に書き写す。
  const currentWeaponRef = useRef<'ar' | 'sg' | 'smg'>('ar');

  // 受信メッセージ → snapshot バッファ + store 更新
  const lastSnapshotAtRef = useRef<number>(0);

  useEffect(() => {
    const unsub = connection.subscribe((msg: GameServerMessage) => {
      switch (msg.type) {
        case 'snapshot': {
          const now =
            typeof performance !== 'undefined' ? performance.now() : Date.now();
          snapshotBuffer.push(msg, now);
          const prev = lastSnapshotAtRef.current;
          lastSnapshotAtRef.current = now;
          const intervalMs = prev > 0 ? Math.round(now - prev) : 0;
          const store = useGameStore.getState();
          store.setMatchTime(msg.matchTimeRemainingMs);
          store.setTeamKills(msg.teamKills);
          store.setSnapshotMeta(msg.tick, intervalMs);
          store.setAllPlayersForMinimap(msg.players);

          // 自分の PlayerSnapshot から HUD 用ステート（HP / 弾薬 / 死亡 etc.）を反映
          const selfId = connection.getYourPlayerId();
          if (selfId) {
            const me = msg.players.find((p) => p.id === selfId);
            if (me) {
              store.applySelfSnapshot(me);
              localPositionRef.current = me.position;
              currentWeaponRef.current = me.currentWeapon;
            }
          }
          break;
        }
        case 'hit':
          // 旧 API（互換）と新 API の両方を呼ぶ：エフェクト用に記録する。
          useGameStore.getState().pushHitEvent(msg);
          useGameStore.getState().recordHit(msg);
          break;
        case 'kill_feed':
          useGameStore.getState().pushKillFeed(msg);
          break;
        case 'countdown':
          useGameStore.getState().setCountdown(msg.secondsLeft);
          break;
        case 'match_end':
          useGameStore.getState().setMatchEnded(true);
          break;
        default: {
          // 網羅性チェック（never）
          const _exhaustive: never = msg;
          void _exhaustive;
        }
      }
    });

    // 自身の PlayerId が確定したら store に反映（lobby agent 側で welcome 後に値が入る）
    const syncSelfId = setInterval(() => {
      const id = connection.getYourPlayerId();
      const cur = useGameStore.getState().yourPlayerId;
      if (id !== cur) useGameStore.getState().setYourPlayerId(id);
    }, 200);

    return () => {
      unsub();
      clearInterval(syncSelfId);
    };
  }, [connection, snapshotBuffer]);

  // 20Hz 入力送信
  const inputTickRef = useRef(0);
  const senderRef = useRef<InputSender | null>(null);
  useEffect(() => {
    senderRef.current = new InputSender(
      connection,
      (tick) => {
        inputTickRef.current = tick;
        const input = buildPlayerInput(tick, keysRef.current, lookRef.current);
        // weaponSwitch / reloadEdge は送信時にも残るとサーバー側で重複処理になり得るので、
        // クライアント側で「送ったら一度消費」する。
        keysRef.current.weaponSwitch = null;
        keysRef.current.reloadEdge = false;
        return input;
      },
      INPUT_SEND_INTERVAL_MS,
    );
    senderRef.current.start();
    return () => {
      senderRef.current?.stop();
      senderRef.current = null;
    };
  }, [connection, keysRef, lookRef]);

  // 発砲送信（fire 立ち上がりエッジ + 武器 fireIntervalMs スロットリング）
  const shootSenderRef = useRef<ShootSender | null>(null);
  useEffect(() => {
    const sender = new ShootSender(
      connection,
      keysRef,
      lookRef,
      localPositionRef,
      () => currentWeaponRef.current,
      undefined, // isPointerLocked: デフォルト
      undefined, // now: デフォルト
      undefined, // uuid: デフォルト
      // B2: 発砲成功時に発砲音を再生
      (weapon) => {
        audioManager.play(`${weapon}_fire`, { volume: 0.8 });
      },
    );
    shootSenderRef.current = sender;
    sender.start();
    return () => {
      sender.stop();
      shootSenderRef.current = null;
    };
  }, [connection, keysRef, lookRef]);

  // pointer lock 解除中は HUD が薄暗くなる（クリック誘導）
  // ユーザーのクリックジェスチャで AudioContext も初期化（autoplay policy 対策）
  const onClickOverlay = useCallback(() => {
    void initAudio();
    request();
  }, [initAudio, request]);

  // 接続切断時のフォールバック UI
  useFixedRateLoop(
    () => {
      // 接続切断の積極的な検査は lobby agent 側に委ねる
    },
    1000,
    true,
  );

  const selfId = useGameStore((s) => s.yourPlayerId);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        background: '#000',
        cursor: locked ? 'none' : 'crosshair',
      }}
    >
      <GameCanvas
        keysRef={keysRef}
        lookRef={lookRef}
        snapshotBuffer={snapshotBuffer}
        selfId={selfId}
        team={team}
        visuals={visuals}
      />
      <HudOverlay visuals={visuals} />
      {!locked && (
        <button
          type="button"
          onClick={onClickOverlay}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontSize: 24,
            fontFamily: 'sans-serif',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          クリックでプレイ開始（マウスロックします）
        </button>
      )}
    </div>
  );
}
