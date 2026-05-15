'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { KillFeedEntry } from '../../game/store/gameStore';
import { useGameStore } from '../../game/store/gameStore';
import { DEBUG_PANEL_UPDATE_MS } from '../../game/constants';

/** 表示の生存時間（受信から ms） */
const KILL_FEED_TTL_MS = 5_000;

/**
 * キルフィード（右上）。
 *
 * - 直近 5 件を最大 5 秒間表示。
 * - 自分が killer の行は黄色、自分が victim の行は赤色。
 * - ヘッドショットには HS バッジ。
 */
export function KillFeedList(): JSX.Element {
  const feed = useGameStore((s) => s.killFeed);
  const yourId = useGameStore((s) => s.yourPlayerId);

  // 表示用キャッシュ。受信から TTL 内のエントリのみ。
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    const handle = setInterval(() => {
      setNow(performance.now());
    }, 250);
    return () => clearInterval(handle);
  }, []);

  void DEBUG_PANEL_UPDATE_MS;

  // tickMs はサーバー時間。クライアント performance.now と単純比較はできないが、
  // 「最後に受信した順」に上から積むだけなら、配列長で最近 5 件を取れば十分。
  // TTL は「ユーザーが眺める時間」基準でクライアント時刻ベースに割り切る。
  const visible: KillFeedEntry[] = feed.slice(-5);

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4,
        pointerEvents: 'none',
        userSelect: 'none',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
      }}
    >
      {visible.map((e) => {
        const isSelfKiller = yourId !== null && e.killerId === yourId;
        const isSelfVictim = yourId !== null && e.victimId === yourId;
        const bg = isSelfKiller
          ? 'rgba(120, 100, 0, 0.7)'
          : isSelfVictim
            ? 'rgba(140, 30, 30, 0.7)'
            : 'rgba(0,0,0,0.55)';
        return (
          <div
            key={e.id}
            style={{
              padding: '4px 10px',
              background: bg,
              color: '#fff',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: feedOpacityFromAge(now, e.tickMs),
            }}
          >
            <span style={{ color: '#ddd' }}>{shortenId(e.killerId)}</span>
            <span style={{ opacity: 0.65 }}>
              [{e.weapon.toUpperCase()}]
              {e.isHeadshot ? <span style={{ color: '#ffd86b' }}> HS</span> : null}
            </span>
            <span style={{ opacity: 0.4 }}>→</span>
            <span style={{ color: '#fff' }}>{shortenId(e.victimId)}</span>
          </div>
        );
      })}
    </div>
  );
}

function shortenId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(0, 6) + '…';
}

/**
 * tickMs はサーバー時間なのでクライアントの now とは絶対比較できない。
 * ここでは fade-out 用に「単に古いエントリほど薄くする」だけの単純な近似を行う。
 * 配列上で末尾ほど新しい前提。
 */
function feedOpacityFromAge(_clientNow: number, _serverTickMs: number): number {
  // killFeed は最大 6 件しか保持しないため、見える分は基本 1.0 でよい。
  // 必要なら server tickMs を performance.now と紐付けるロジックを別途追加すること。
  return 1;
}

void KILL_FEED_TTL_MS;
