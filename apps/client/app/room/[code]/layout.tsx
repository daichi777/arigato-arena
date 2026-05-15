import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { normalizeRoomCode } from '@/lib/lobby/room-code';

interface Props {
  children: ReactNode;
  params: Promise<{ code: string }>;
}

/**
 * /room/[code] 共通レイアウト。
 * - URL の code を大文字正規化
 * - 不正フォーマットなら 404
 * - 試合中の WebSocket シングルトンは page.tsx 側 hook で開く
 */
export default async function RoomLayout({ children, params }: Props) {
  const { code: raw } = await params;
  const code = normalizeRoomCode(raw);
  if (!code) {
    notFound();
  }
  return <div data-room-code={code}>{children}</div>;
}
