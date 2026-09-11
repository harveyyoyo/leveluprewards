import { describe, expect, it } from 'vitest';
import type { StudentTheme } from '@/lib/types';
import {
  formatLibraryStudentName,
  resolveLibraryStudentNameMode,
  resolveLibraryStudentThemeMark,
} from './libraryStudentDisplay';

const alex = { firstName: 'Alexander', lastName: 'Rivera', nickname: 'Alex' };
const noNick = { firstName: 'Sam', lastName: 'Lee' };
const theme: StudentTheme = {
  primary: '#2563eb',
  cardBackground: '#eff6ff',
  accent: '#93c5fd',
  emoji: '🦊',
};

describe('libraryStudentDisplay', () => {
  it('defaults to preferred name + last name', () => {
    expect(resolveLibraryStudentNameMode(undefined, 'preferred_only')).toBe('preferred_full');
    expect(formatLibraryStudentName(alex)).toBe('Alex Rivera');
  });

  it('can show preferred name only or legal names', () => {
    expect(formatLibraryStudentName(alex, 'preferred_only')).toBe('Alex');
    expect(formatLibraryStudentName(alex, 'legal_full')).toBe('Alexander Rivera');
    expect(formatLibraryStudentName(noNick, 'preferred_full')).toBe('Sam Lee');
  });

  it('follows school leaderboard privacy when asked', () => {
    expect(resolveLibraryStudentNameMode('follow_school', 'preferred_only')).toBe('preferred_only');
    expect(resolveLibraryStudentNameMode('follow_school', 'full')).toBe('preferred_full');
    expect(formatLibraryStudentName(undefined, 'preferred_full')).toBe('Unknown student');
  });

  it('shows theme emoji and color by default, and can turn them off', () => {
    const on = resolveLibraryStudentThemeMark({ theme }, {});
    expect(on.emoji).toBe('🦊');
    expect(on.color).toMatch(/^#[0-9a-f]{6}$/i);

    const emojiOnly = resolveLibraryStudentThemeMark({ theme }, { display: 'emoji' });
    expect(emojiOnly.emoji).toBe('🦊');
    expect(emojiOnly.color).toBeUndefined();

    expect(resolveLibraryStudentThemeMark({ theme }, { display: 'off' })).toEqual({});
    expect(resolveLibraryStudentThemeMark({ theme }, { studentThemesEnabled: false })).toEqual({});
  });

  it('prefers a custom sticker image over the theme emoji', () => {
    const mark = resolveLibraryStudentThemeMark(
      { theme, customEmojiUrl: 'https://example.com/sticker.png' },
      { display: 'emoji_and_color' },
    );
    expect(mark.emojiUrl).toBe('https://example.com/sticker.png');
    expect(mark.emoji).toBeUndefined();
    expect(mark.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
