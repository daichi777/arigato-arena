'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/**
 * /play 画面で pointer lock を要求するためのゲート。
 * - ロビーでは pointer lock しない（lobby agent.md 92行目）
 * - 初回クリックで request、Escape で解除
 * - renderer agent が画面内で他のクリックを必要とする場合は children 側で実装する
 */
export function PointerLockGate({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const handler = () => {
      setLocked(document.pointerLockElement === rootRef.current);
    };
    document.addEventListener('pointerlockchange', handler);
    return () => document.removeEventListener('pointerlockchange', handler);
  }, []);

  const requestLock = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    try {
      el.requestPointerLock();
    } catch {
      // 非対応ブラウザ
    }
  }, []);

  return (
    <div ref={rootRef} className="relative h-full w-full">
      {children}
      {!locked && (
        <button
          type="button"
          onClick={requestLock}
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/80 text-center text-ink-100 backdrop-blur"
        >
          <p className="font-display text-xs tracking-[0.6em] text-ink-300">CLICK TO PLAY</p>
          <p className="font-display text-3xl tracking-widest">マウスで視点 / WASDで移動</p>
          <p className="text-xs text-ink-400">Esc で一時停止</p>
        </button>
      )}
    </div>
  );
}
