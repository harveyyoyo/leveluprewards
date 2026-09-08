import { describe, expect, it } from 'vitest';
import {
  LIBRARY_LATE_RESPONSES,
  LIBRARY_LATE_SOUNDS,
  LIBRARY_ON_TIME_RESPONSES,
  LIBRARY_ON_TIME_SOUNDS,
  resolveLibraryReturnFeedback,
} from './libraryAudio';

describe('libraryAudio metadata', () => {
  it('defines sound effect options with labels and icons', () => {
    expect(LIBRARY_ON_TIME_SOUNDS.length).toBeGreaterThanOrEqual(5);
    expect(LIBRARY_LATE_SOUNDS.length).toBeGreaterThanOrEqual(5);

    expect(LIBRARY_ON_TIME_SOUNDS.some((s) => s.id === 'chime_bright')).toBe(true);
    expect(LIBRARY_LATE_SOUNDS.some((s) => s.id === 'gentle_warning')).toBe(true);
    expect(LIBRARY_ON_TIME_SOUNDS.some((s) => s.id === 'none')).toBe(true);
    expect(LIBRARY_LATE_SOUNDS.some((s) => s.id === 'none')).toBe(true);
  });

  it('defines response templates for on-time and late returns', () => {
    expect(LIBRARY_ON_TIME_RESPONSES.some((r) => r.id === 'cheerful')).toBe(true);
    expect(LIBRARY_ON_TIME_RESPONSES.some((r) => r.id === 'academic')).toBe(true);
    expect(LIBRARY_LATE_RESPONSES.some((r) => r.id === 'gentle')).toBe(true);
    expect(LIBRARY_LATE_RESPONSES.some((r) => r.id === 'informative')).toBe(true);
    expect(LIBRARY_LATE_RESPONSES.some((r) => r.id === 'motivational')).toBe(true);
  });
});

describe('resolveLibraryReturnFeedback', () => {
  it('formats on-time return with default cheerful message and sound', () => {
    const feedback = resolveLibraryReturnFeedback({
      isOverdue: false,
      bookTitle: 'Charlotte’s Web',
    });

    expect(feedback.tone).toBe('success');
    expect(feedback.badgeText).toBe('On Time');
    expect(feedback.soundId).toBe('chime_bright');
    expect(feedback.message).toContain('Thank you for returning on time');
  });

  it('formats on-time return with custom school message', () => {
    const feedback = resolveLibraryReturnFeedback({
      isOverdue: false,
      bookTitle: 'The Hobbit',
      settings: {
        libraryReturnSoundOnTime: 'gentle_bell',
        libraryReturnResponseOnTimeMode: 'custom',
        libraryReturnResponseOnTimeCustom: 'High five! "{title}" returned on schedule!',
      },
    });

    expect(feedback.tone).toBe('success');
    expect(feedback.soundId).toBe('gentle_bell');
    expect(feedback.message).toBe('High five! "The Hobbit" returned on schedule!');
  });

  it('formats late return with default gentle warning and sound', () => {
    const feedback = resolveLibraryReturnFeedback({
      isOverdue: true,
      daysOverdue: 4,
      bookTitle: 'Hatchet',
    });

    expect(feedback.tone).toBe('warning');
    expect(feedback.badgeText).toBe('4 days late');
    expect(feedback.soundId).toBe('gentle_warning');
    expect(feedback.message).toContain('Please try to return on time next time');
  });

  it('formats late return with informative template replacing days', () => {
    const feedback = resolveLibraryReturnFeedback({
      isOverdue: true,
      daysOverdue: 7,
      bookTitle: 'Matilda',
      settings: {
        libraryReturnSoundLate: 'buzzer_retro',
        libraryReturnResponseLateMode: 'informative',
      },
    });

    expect(feedback.tone).toBe('warning');
    expect(feedback.badgeText).toBe('7 days late');
    expect(feedback.soundId).toBe('buzzer_retro');
    expect(feedback.message).toContain('7 day(s) overdue');
  });

  it('formats late return with custom school message template', () => {
    const feedback = resolveLibraryReturnFeedback({
      isOverdue: true,
      daysOverdue: 3,
      bookTitle: 'Dune',
      settings: {
        libraryReturnSoundLate: 'reminder_tone',
        libraryReturnResponseLateMode: 'custom',
        libraryReturnResponseLateCustom: 'Alert: "{title}" is {days} days overdue. Please see Ms. Smith.',
      },
    });

    expect(feedback.tone).toBe('warning');
    expect(feedback.soundId).toBe('reminder_tone');
    expect(feedback.message).toBe('Alert: "Dune" is 3 days overdue. Please see Ms. Smith.');
  });
});
