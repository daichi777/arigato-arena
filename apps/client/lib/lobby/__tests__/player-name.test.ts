import { describe, expect, it } from 'vitest';
import { NAME_MAX_LENGTH } from '@arigato/shared';
import { normalizePlayerName } from '../player-name';

describe('normalizePlayerName', () => {
  it('通常の名前を受け入れる', () => {
    expect(normalizePlayerName('k2')).toBe('k2');
    expect(normalizePlayerName('ひょうが')).toBe('ひょうが');
  });

  it('前後の空白を除去する', () => {
    expect(normalizePlayerName('  shuto  ')).toBe('shuto');
  });

  it('空文字は null', () => {
    expect(normalizePlayerName('')).toBeNull();
    expect(normalizePlayerName('   ')).toBeNull();
  });

  it(`${NAME_MAX_LENGTH} 文字以下を受け入れる`, () => {
    const name = 'a'.repeat(NAME_MAX_LENGTH);
    expect(normalizePlayerName(name)).toBe(name);
  });

  it(`${NAME_MAX_LENGTH + 1} 文字以上は null`, () => {
    const name = 'a'.repeat(NAME_MAX_LENGTH + 1);
    expect(normalizePlayerName(name)).toBeNull();
  });
});
