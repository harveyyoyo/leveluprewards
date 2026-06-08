export const SCHOOL_COMPLIMENTS = [
  'Your effort makes this school stronger.',
  'Thank you for choosing kindness today.',
  'You are growing every time you try again.',
  'Your good choices help others feel welcome.',
  'A calm reset is a strong choice.',
  'You bring something valuable to your class.',
  'Your focus today can become progress tomorrow.',
];

export const LEARNING_QUOTES = [
  'Small steps count when you keep taking them.',
  'Mistakes are information. Use them and keep going.',
  'Practice turns hard things into familiar things.',
  'Good questions are a sign of strong thinking.',
  'Respect makes learning easier for everyone.',
  'The best time to start is the next right moment.',
  'Listen well, speak kindly, work honestly.',
];

export const FOCUS_SKILLS = [
  'Pause, breathe once, then begin.',
  'Choose one task and give it your full attention.',
  'Ask for help early and listen to the answer.',
  'Use kind words, even when the work is hard.',
  'Check your work before you call it finished.',
  'Include someone who needs a place.',
  'Celebrate progress, then take the next step.',
];

export function safeTimeZone(timeZone: string | undefined) {
  if (!timeZone) return undefined;
  try {
    Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return undefined;
  }
}

export function formatSmartScreenDate(now: Date, timeZone?: string) {
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
}

export function formatSmartScreenTime(now: Date, timeZone?: string) {
  return now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

export function hourInTimeZone(now: Date, timeZone?: string) {
  const value = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).format(now);
  return Number(value) || now.getHours();
}

export function timeGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function dayIndex(now: Date, length: number) {
  if (length <= 0) return 0;
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const day = Math.floor(diff / 86400000);
  return day % length;
}

export function birthdayMatchesToday(birthday: string | undefined, now: Date) {
  if (!birthday) return false;
  const parts = birthday.trim().split('-');
  if (parts.length < 3) return false;
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return parts[1] === mm && parts[2] === dd;
}
