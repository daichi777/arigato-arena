'use client';

import { useEffect, useRef, useState } from 'react';
import type { JSX, ChangeEvent } from 'react';
import { audioManager } from './AudioManager';

const STORAGE_KEY = 'arena.masterVolume';
const DEFAULT_VOLUME = 0.7;

/**
 * 音量設定スライダー（HUD 左下に常設）。
 *
 * - localStorage `arena.masterVolume` で永続化（default 0.7）。
 * - マウント時に保存値を読み込んで AudioManager に適用。
 * - pointer lock 中はスライダーの操作は無視される（マウスがロックされているため）が、
 *   pointer lock 解除中に操作可能。
 */
export function VolumeSettings(): JSX.Element {
  const [volume, setVolume] = useState<number>(DEFAULT_VOLUME);
  const initialized = useRef(false);

  // マウント時: localStorage から読み込んで適用
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const v = parseFloat(stored);
        if (isFinite(v) && v >= 0 && v <= 1) {
          setVolume(v);
          audioManager.setMasterVolume(v);
        }
      } else {
        // 初期値を保存
        localStorage.setItem(STORAGE_KEY, String(DEFAULT_VOLUME));
        audioManager.setMasterVolume(DEFAULT_VOLUME);
      }
    } catch {
      // localStorage が使えない環境（プライベートブラウズ等）は無視
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    audioManager.setMasterVolume(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // 無視
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'auto', // スライダーは操作可能
        userSelect: 'none',
      }}
    >
      <span
        style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          whiteSpace: 'nowrap',
        }}
      >
        VOL
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={handleChange}
        style={{
          width: 72,
          cursor: 'pointer',
          accentColor: '#5ea0ff',
          height: 4,
        }}
        aria-label="マスター音量"
      />
      <span
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: 10,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          minWidth: 26,
          textAlign: 'right',
        }}
      >
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}
