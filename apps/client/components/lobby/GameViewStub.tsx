'use client';

/**
 * renderer agent の `<GameView/>` が未実装、または import 失敗時のフォールバック。
 * 接続自体はロビー側 useConnection で維持されている前提なので、ここでは
 * 「描画レイヤーが未着」というステータスだけ表示する。
 */
export function GameViewStub() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-ink-950 text-center text-ink-300">
      <div>
        <p className="font-display text-xs tracking-[0.6em] text-ink-400">RENDERER</p>
        <p className="mt-2 font-display text-3xl tracking-widest text-ink-100">
          描画レイヤー読み込み中…
        </p>
        <p className="mt-3 text-xs text-ink-500">
          renderer agent が <code className="text-ink-300">apps/client/game/GameView.tsx</code> を出力すると差し替わります。
        </p>
      </div>
    </div>
  );
}
