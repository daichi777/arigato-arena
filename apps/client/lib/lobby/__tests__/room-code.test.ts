import { describe, expect, it } from 'vitest';
import { ROOM_CODE_LENGTH } from '@arigato/shared';
import { ROOM_CODE_ALPHABET, generateRoomCode, normalizeRoomCode } from '../room-code';

describe('generateRoomCode', () => {
  it('既定長 6 桁を返す', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(ROOM_CODE_LENGTH);
  });

  it('アルファベット内の文字のみを含む', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(ROOM_CODE_ALPHABET.includes(ch)).toBe(true);
      }
    }
  });

  it('0/O/1/I などの紛らわしい文字を含まない', () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateRoomCode();
      expect(/[0OI1]/.test(code)).toBe(false);
    }
  });

  it('連続生成で十分なばらつきがある', () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      set.add(generateRoomCode());
    }
    expect(set.size).toBeGreaterThan(95);
  });
});

describe('normalizeRoomCode', () => {
  it('小文字を大文字化して受け入れる', () => {
    expect(normalizeRoomCode('abcd23')).toBe('ABCD23');
  });

  it('前後空白を除去する', () => {
    expect(normalizeRoomCode('  AB23CD  ')).toBe('AB23CD');
  });

  it('長さ不一致は null', () => {
    expect(normalizeRoomCode('AB23')).toBeNull();
    expect(normalizeRoomCode('AB23CDX')).toBeNull();
  });

  it('英数大文字以外を含むと null', () => {
    expect(normalizeRoomCode('AB-23X')).toBeNull();
    expect(normalizeRoomCode('AB@23X')).toBeNull();
  });

  it('空文字列は null', () => {
    expect(normalizeRoomCode('')).toBeNull();
  });
});
