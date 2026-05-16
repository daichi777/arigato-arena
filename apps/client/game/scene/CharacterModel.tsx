'use client';

import { Component, Suspense } from 'react';
import type { JSX, ReactNode, ErrorInfo } from 'react';
import { useGLTF } from '@react-three/drei';
import { PLAYER_PHYSICS } from '@arigato/shared';
import { CAPSULE_HALF_HEIGHT } from '../constants';

interface Props {
  characterId: string;
  team?: 'red' | 'blue';
}

// ---- カプセルフォールバック ----

interface FallbackProps {
  team?: 'red' | 'blue';
}

function CapsuleFallback({ team }: FallbackProps): JSX.Element {
  const color = team === 'red' ? '#c0443a' : team === 'blue' ? '#3a7ec0' : '#888';
  return (
    <mesh
      castShadow
      position={[0, PLAYER_PHYSICS.capsuleHeight / 2, 0]}
    >
      <capsuleGeometry args={[PLAYER_PHYSICS.capsuleRadius, CAPSULE_HALF_HEIGHT * 2, 4, 8]} />
      <meshStandardMaterial color={color} transparent opacity={1} />
    </mesh>
  );
}

// ---- GLTFModel（GLB の実ロード、Suspense 内でのみ使う） ----

interface GLTFModelProps {
  id: string;
}

function GLTFModel({ id }: GLTFModelProps): JSX.Element {
  const url = `/assets/characters/${id}.glb`;
  const { scene } = useGLTF(url);
  return (
    // キャラモデルは足元が原点の想定でスケール調整
    <primitive
      object={scene.clone()}
      position={[0, 0, 0]}
      scale={[1, 1, 1]}
    />
  );
}

// ---- ErrorBoundary（React クラスコンポーネント）----
// GLB 404 時に Suspense が解決しないケースも ErrorBoundary で補足する

interface ErrorBoundaryState {
  hasError: boolean;
}

class CharacterErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getDerivedStateFromError(_err: unknown): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // GLB ロード失敗は開発時のみ warn（本番では静音化）
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[CharacterModel] GLB ロード失敗（カプセルにフォールバック）:', error, info);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ---- エクスポート：CharacterModel ----

/**
 * キャラクターモデル描画コンポーネント。
 *
 * - GLB が存在すれば useGLTF で読み込む（Suspense / ErrorBoundary でラップ）。
 * - GLB が 404 でも、エラーが発生してもカプセルにフォールバックしてクラッシュしない。
 * - useGLTF.preload は使わない（404 ノイズ回避）。
 */
export function CharacterModel({ characterId, team }: Props): JSX.Element {
  const fallback = <CapsuleFallback team={team} />;
  return (
    <CharacterErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLTFModel id={characterId} />
      </Suspense>
    </CharacterErrorBoundary>
  );
}
