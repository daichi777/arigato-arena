'use client';

import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  CapsuleCollider,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
type RapierContext = ReturnType<typeof useRapier>;
type RapierWorld = RapierContext['world'];
type RapierModule = RapierContext['rapier'];
import { Vector3 } from 'three';
import { PLAYER_PHYSICS, SPAWN_POINTS } from '@arigato/shared';
import type { Team } from '@arigato/shared';
import {
  CAPSULE_HALF_HEIGHT,
  EYE_HEIGHT_FROM_FEET,
  GROUND_CHECK_RAY_LENGTH,
} from '../constants';
import type { KeyState, LookRef } from '../types';
import { computeHorizontalVelocity, jumpImpulse } from '../physics/movement';
import { useGameStore } from '../store/gameStore';

interface Props {
  keysRef: React.MutableRefObject<KeyState>;
  lookRef: React.MutableRefObject<LookRef>;
  /** スポーン地点を決めるためのチーム。未指定なら red */
  team?: Team;
}

/**
 * 自プレイヤーのキャラ + カメラ制御。
 *
 * Day2-C 追加:
 * - `isAlive===false` の間はカメラ操作ロック・移動 disable。
 * - リスポーンしたら直前 snapshot 位置に強制スナップ。
 */
export function LocalPlayerController({ keysRef, lookRef, team = 'red' }: Props): JSX.Element {
  const bodyRef = useRef<RapierRigidBody>(null);
  const camera = useThree((s) => s.camera);
  const rapierCtx = useRapier();

  // useFrame ホット路で new しないよう一時 Vector3 を保持
  const tmpVel = useRef(new Vector3());
  // 前フレームの isAlive。死→生 の遷移検知用。
  const prevAliveRef = useRef<boolean>(true);

  // 初期スポーン位置
  useEffect(() => {
    const spawns = SPAWN_POINTS[team];
    const sp = spawns[0] ?? { x: 0, y: 1, z: 0 };
    const body = bodyRef.current;
    if (!body) return;
    body.setTranslation({ x: sp.x, y: sp.y + 1.5, z: sp.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    lookRef.current.yaw = team === 'red' ? 0 : Math.PI;
    lookRef.current.pitch = 0;
  }, [team, lookRef]);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;
    const keys = keysRef.current;
    const look = lookRef.current;

    // store から最新の死亡状態と snapshot 位置を取る（毎フレーム getState）
    const state = useGameStore.getState();
    const isAlive = state.isAlive;
    const selfPos = state.selfPosition;

    // 復活: 死→生 で snapshot 位置にスナップ
    if (!prevAliveRef.current && isAlive && selfPos) {
      body.setTranslation(
        { x: selfPos.x, y: selfPos.y + 1.0, z: selfPos.z },
        true,
      );
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    prevAliveRef.current = isAlive;

    if (!isAlive) {
      // 死亡中: 操作完全ロック。物理は地面に落ちる重力のみに任せ、入力エッジは消費。
      body.setLinvel({ x: 0, y: body.linvel().y, z: 0 }, true);
      keys.jumpEdge = false;

      // カメラを「死亡位置」を見下ろす形で固定（snapshot 位置の少し上）。
      if (selfPos) {
        camera.position.set(selfPos.x, selfPos.y + 2.0, selfPos.z + 1.5);
        camera.lookAt(selfPos.x, selfPos.y + 0.5, selfPos.z);
      }
      return;
    }

    // --- 接地判定（カプセル底から下方向に短いレイ） ---
    const t = body.translation();
    const bottomY = t.y - CAPSULE_HALF_HEIGHT - PLAYER_PHYSICS.capsuleRadius;
    const grounded = castGroundRay(
      rapierCtx.world,
      rapierCtx.rapier,
      { x: t.x, y: bottomY + 0.02, z: t.z },
      { x: 0, y: -1, z: 0 },
      GROUND_CHECK_RAY_LENGTH,
      body,
    );

    // --- 水平移動入力 ---
    const moveX = clamp11((keys.right ? 1 : 0) - (keys.left ? 1 : 0));
    const moveZ = clamp11((keys.forward ? 1 : 0) - (keys.backward ? 1 : 0));
    const horiz = computeHorizontalVelocity(moveX, moveZ, look.yaw, keys.sprint, grounded);

    const linvel = body.linvel();
    tmpVel.current.set(horiz.x, linvel.y, horiz.z);

    // --- ジャンプ ---
    if (keys.jumpEdge && grounded) {
      tmpVel.current.y = jumpImpulse();
      keys.jumpEdge = false;
    } else if (!grounded) {
      keys.jumpEdge = false;
    }

    body.setLinvel({ x: tmpVel.current.x, y: tmpVel.current.y, z: tmpVel.current.z }, true);

    // --- カメラ位置・回転をカプセル基準に追従 ---
    const center = body.translation();
    camera.position.set(
      center.x,
      center.y + (EYE_HEIGHT_FROM_FEET - PLAYER_PHYSICS.capsuleHeight / 2),
      center.z,
    );
    camera.rotation.order = 'YXZ';
    camera.rotation.x = look.pitch;
    camera.rotation.y = look.yaw;
    camera.rotation.z = 0;
  });

  const initial = SPAWN_POINTS[team][0] ?? { x: 0, y: 0, z: 0 };

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      lockRotations
      enabledRotations={[false, false, false]}
      mass={1}
      friction={0.0}
      restitution={0}
      position={[initial.x, initial.y + 1.5, initial.z]}
      name="LocalPlayer"
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, PLAYER_PHYSICS.capsuleRadius]} />
    </RigidBody>
  );
}

function clamp11(v: number): number {
  if (v < -1) return -1;
  if (v > 1) return 1;
  return v;
}

/**
 * Rapier World に対して下方向レイを飛ばし、距離内に衝突があれば true。
 */
function castGroundRay(
  world: RapierWorld,
  rapier: RapierModule,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  maxToi: number,
  excludeBody: RapierRigidBody,
): boolean {
  const ray = new rapier.Ray(origin, dir);
  const hit = world.castRay(
    ray,
    maxToi,
    true,
    undefined,
    undefined,
    undefined,
    excludeBody,
  );
  return hit !== null;
}
