/**
 * Library Return Audio Synthesizer and Response Message Formatter.
 * Provides custom client-side audio chimes and customizable feedback responses
 * for on-time and late/overdue library returns.
 */

export type LibraryReturnSoundOnTimeId =
  | 'chime_bright'
  | 'arcade_success'
  | 'gentle_bell'
  | 'synth_sparkle'
  | 'cheerful_pop'
  | 'none';

export type LibraryReturnSoundLateId =
  | 'gentle_warning'
  | 'buzzer_retro'
  | 'reminder_tone'
  | 'clock_tick'
  | 'subtle_thud'
  | 'none';

export type LibraryReturnResponseOnTimeMode =
  | 'cheerful'
  | 'academic'
  | 'arcade'
  | 'minimal'
  | 'custom';

export type LibraryReturnResponseLateMode =
  | 'gentle'
  | 'informative'
  | 'firm'
  | 'motivational'
  | 'custom';

export interface SoundOption<T extends string> {
  id: T;
  label: string;
  tagline: string;
  icon: string;
  description: string;
}

export const LIBRARY_ON_TIME_SOUNDS: SoundOption<LibraryReturnSoundOnTimeId>[] = [
  {
    id: 'chime_bright',
    label: 'Bright Chime & Fanfare',
    tagline: 'Celebratory major arpeggio',
    icon: '🔔',
    description: 'Crisp ascending major chord with a pleasant harmonic finish.',
  },
  {
    id: 'arcade_success',
    label: 'Retro Arcade Winner',
    tagline: '8-bit victory cascade',
    icon: '👾',
    description: 'Nostalgic chiptune coin and award chime from classic games.',
  },
  {
    id: 'gentle_bell',
    label: 'Quiet Reading Bell',
    tagline: 'Peaceful collegiate chime',
    icon: '📖',
    description: 'Soft, polite single-tone bell chime crafted for quiet library spaces.',
  },
  {
    id: 'synth_sparkle',
    label: 'Cosmic Sparkle',
    tagline: 'Shimmering synth notes',
    icon: '✨',
    description: 'Modern, high-energy three-note shimmer that excites students.',
  },
  {
    id: 'cheerful_pop',
    label: 'Marimba Pop',
    tagline: 'Warm organic bounce',
    icon: '🎶',
    description: 'Playful acoustic marimba double-tap with a friendly bounce.',
  },
  {
    id: 'none',
    label: 'Muted (Silent)',
    tagline: 'No audio chime',
    icon: '🔇',
    description: 'Complete silence on on-time return; visual message only.',
  },
];

export const LIBRARY_LATE_SOUNDS: SoundOption<LibraryReturnSoundLateId>[] = [
  {
    id: 'gentle_warning',
    label: 'Gentle Minor Alert',
    tagline: 'Polite descending notes',
    icon: '⚠️',
    description: 'Soft minor tone pair that alerts the student without embarrassing them.',
  },
  {
    id: 'buzzer_retro',
    label: 'Arcade Buzzer',
    tagline: '8-bit warning buzz',
    icon: '🚨',
    description: 'Classic arcade low-frequency buzz indicating overdue status.',
  },
  {
    id: 'reminder_tone',
    label: 'Notice Chime',
    tagline: 'Double sine notification',
    icon: '⏰',
    description: 'Two quick clear tones reminiscent of calendar reminders.',
  },
  {
    id: 'clock_tick',
    label: 'Clock Warning',
    tagline: 'Time expired alert',
    icon: '⏳',
    description: 'Subtle clock-tick alert hinting that the due date has expired.',
  },
  {
    id: 'subtle_thud',
    label: 'Muted Thud',
    tagline: 'Low-frequency bump',
    icon: '🛑',
    description: 'Understated low-end pulse that is barely audible to other readers.',
  },
  {
    id: 'none',
    label: 'Muted (Silent)',
    tagline: 'No audio alert',
    icon: '🔇',
    description: 'Complete silence on late return; visual message only.',
  },
];

export interface ResponseTemplateOption<T extends string> {
  id: T;
  label: string;
  tagline: string;
  defaultText: string;
}

export const LIBRARY_ON_TIME_RESPONSES: ResponseTemplateOption<LibraryReturnResponseOnTimeMode>[] = [
  {
    id: 'cheerful',
    label: 'Cheerful & Encouraging',
    tagline: 'Praise and enthusiasm',
    defaultText: 'Thank you for returning on time! Keep up the great reading adventure!',
  },
  {
    id: 'academic',
    label: 'Academic & Scholastic',
    tagline: 'Formal library etiquette',
    defaultText: 'Book returned on time in good order. Thank you for respecting our library.',
  },
  {
    id: 'arcade',
    label: 'Arcade Champion',
    tagline: 'High energy gamified praise',
    defaultText: 'Awesome return! On-time streak active and bonus rewards preserved!',
  },
  {
    id: 'minimal',
    label: 'Minimalist',
    tagline: 'Clean & concise notice',
    defaultText: 'Returned on time.',
  },
  {
    id: 'custom',
    label: 'Custom School Message',
    tagline: 'Enter your own message',
    defaultText: 'Thank you for returning "{title}" on time! Have a wonderful day.',
  },
];

export const LIBRARY_LATE_RESPONSES: ResponseTemplateOption<LibraryReturnResponseLateMode>[] = [
  {
    id: 'gentle',
    label: 'Gentle Reminder',
    tagline: 'Kind and non-punitive',
    defaultText: 'Thanks for bringing this back! Please try to return on time next time so other students can read it.',
  },
  {
    id: 'informative',
    label: 'Informative Overdue Notice',
    tagline: 'Reports exact days late',
    defaultText: 'Returned {days} day(s) overdue. Please remember to check your due dates in the future.',
  },
  {
    id: 'firm',
    label: 'Formal Library Policy',
    tagline: 'Official policy reminder',
    defaultText: 'Overdue return ({days} days late). A late fee or classroom reminder may be recorded on your account.',
  },
  {
    id: 'motivational',
    label: 'Better Late Than Never',
    tagline: 'Welcoming book return',
    defaultText: 'Better late than never! We are glad "{title}" is safely back on the library shelves.',
  },
  {
    id: 'custom',
    label: 'Custom School Message',
    tagline: 'Enter your own message',
    defaultText: '"{title}" was returned {days} day(s) late. Please return books on time!',
  },
];

/**
 * Client-side Web Audio synthesizer for playing library return chimes.
 */
export function playLibraryReturnAudio(
  soundId: LibraryReturnSoundOnTimeId | LibraryReturnSoundLateId,
  options?: { volume?: number },
): void {
  if (typeof window === 'undefined' || soundId === 'none') return;

  try {
    if (!(window as any).__libraryAudioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      (window as any).__libraryAudioCtx = new AudioCtx();
    }

    const ctx: AudioContext = (window as any).__libraryAudioCtx;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const baseVolume = options?.volume ?? 0.08;

    const note = (
      freq: number,
      start: number,
      dur: number,
      type: OscillatorType = 'sine',
      gainFactor = 1.0,
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(baseVolume * gainFactor, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    switch (soundId) {
      // —— On-time return sounds ——
      case 'chime_bright':
        // C5, E5, G5, C6 ascending major arpeggio
        note(523.25, now, 0.12, 'sine', 0.8);
        note(659.25, now + 0.08, 0.12, 'sine', 0.85);
        note(783.99, now + 0.16, 0.14, 'sine', 0.9);
        note(1046.5, now + 0.24, 0.45, 'sine', 1.0);
        break;

      case 'arcade_success':
        // Classic 8-bit coin/triumph
        note(440, now, 0.08, 'square', 0.4);
        note(554.37, now + 0.06, 0.08, 'square', 0.4);
        note(659.25, now + 0.12, 0.1, 'square', 0.45);
        note(880, now + 0.18, 0.35, 'triangle', 0.6);
        break;

      case 'gentle_bell':
        // Soft collegiate library chime at 880Hz with soft overtone
        note(880, now, 0.45, 'sine', 0.7);
        note(1760, now, 0.35, 'sine', 0.25);
        break;

      case 'synth_sparkle':
        // Cosmic shimmer
        note(1174.66, now, 0.08, 'triangle', 0.6);
        note(1396.91, now + 0.06, 0.09, 'triangle', 0.6);
        note(1760.0, now + 0.12, 0.32, 'sine', 0.8);
        break;

      case 'cheerful_pop':
        // Marimba double bounce
        note(587.33, now, 0.1, 'sine', 0.9);
        note(880.0, now + 0.09, 0.25, 'sine', 0.95);
        break;

      // —— Late / overdue return sounds ——
      case 'gentle_warning':
        // Soft minor descending note pair: F4 (349Hz) -> D4 (293Hz)
        note(349.23, now, 0.16, 'sine', 0.8);
        note(293.66, now + 0.13, 0.35, 'sine', 0.75);
        break;

      case 'buzzer_retro':
        // Arcade sawtooth warning buzz
        note(164.81, now, 0.16, 'sawtooth', 0.5);
        note(146.83, now + 0.12, 0.28, 'sawtooth', 0.6);
        break;

      case 'reminder_tone':
        // Two quick notification beeps: 440Hz -> 392Hz
        note(440, now, 0.1, 'sine', 0.7);
        note(392, now + 0.12, 0.25, 'sine', 0.7);
        break;

      case 'clock_tick':
        // Double tick warning
        note(800, now, 0.05, 'triangle', 0.6);
        note(400, now + 0.08, 0.18, 'triangle', 0.65);
        break;

      case 'subtle_thud':
        // Low discreet thump
        note(110, now, 0.25, 'sine', 0.8);
        break;

      default:
        break;
    }
  } catch (err) {
    // Audio synthesis failure should never crash application
    console.warn('Could not synthesize library return audio:', err);
  }
}

export interface LibraryReturnFeedback {
  title: string;
  message: string;
  badgeText: string;
  tone: 'success' | 'warning';
  soundId: LibraryReturnSoundOnTimeId | LibraryReturnSoundLateId;
}

/**
 * Resolves the return feedback response message and metadata based on school settings.
 */
export function resolveLibraryReturnFeedback(
  options: {
    isOverdue: boolean;
    daysOverdue?: number;
    bookTitle?: string;
    studentName?: string;
    settings?: Record<string, any>;
  },
  settingsArg?: Record<string, any>,
): LibraryReturnFeedback {
  const { isOverdue, daysOverdue = 0, bookTitle = 'Book' } = options;
  const settings = options.settings || settingsArg || {};
  const days = Math.max(1, daysOverdue);
  const cleanTitle = bookTitle.trim() || 'Book';

  if (isOverdue) {
    const soundId: LibraryReturnSoundLateId =
      settings.libraryReturnSoundLate || 'gentle_warning';
    const mode: LibraryReturnResponseLateMode =
      settings.libraryReturnResponseLateMode || 'gentle';

    let rawText = '';
    if (mode === 'custom' && settings.libraryReturnResponseLateCustom?.trim()) {
      rawText = settings.libraryReturnResponseLateCustom.trim();
    } else {
      const found = LIBRARY_LATE_RESPONSES.find((r) => r.id === mode);
      rawText = found ? found.defaultText : LIBRARY_LATE_RESPONSES[0].defaultText;
    }

    const message = rawText
      .replace(/\{days\}/g, String(days))
      .replace(/\{title\}/g, cleanTitle);

    return {
      title: 'Book Returned (Overdue)',
      message,
      badgeText: `${days} day${days === 1 ? '' : 's'} late`,
      tone: 'warning',
      soundId,
    };
  }

  // On-time return
  const soundId: LibraryReturnSoundOnTimeId =
    settings.libraryReturnSoundOnTime || 'chime_bright';
  const mode: LibraryReturnResponseOnTimeMode =
    settings.libraryReturnResponseOnTimeMode || 'cheerful';

  let rawText = '';
  if (mode === 'custom' && settings.libraryReturnResponseOnTimeCustom?.trim()) {
    rawText = settings.libraryReturnResponseOnTimeCustom.trim();
  } else {
    const found = LIBRARY_ON_TIME_RESPONSES.find((r) => r.id === mode);
    rawText = found ? found.defaultText : LIBRARY_ON_TIME_RESPONSES[0].defaultText;
  }

  const message = rawText
    .replace(/\{days\}/g, '0')
    .replace(/\{title\}/g, cleanTitle);

  return {
    title: 'Book Returned On Time!',
    message,
    badgeText: 'On Time',
    tone: 'success',
    soundId,
  };
}
