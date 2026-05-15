'use client';

import type { ReactNode } from 'react';

/**
 * クライアントツリーのプロバイダ層。
 * 現状は store/context を渡す必要が無い（Zustand はモジュールローカル）が、
 * Theme / Toast / ErrorBoundary を追加する際の足場として残す。
 */
export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
