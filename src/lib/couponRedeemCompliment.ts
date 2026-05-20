import { studentAgeYearsFromBirthday } from '@/lib/studentAiFunAge';

export type CouponRedeemComplimentFetchAuth = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const GENERIC_COMPLIMENTS = [
  'You earned this — great job!',
  'Nice work! Keep it up!',
  'Way to go — you deserved those points!',
  'Awesome effort today!',
];

const CATEGORY_COMPLIMENTS: Array<{ match: RegExp; lines: string[] }> = [
  {
    match: /good\s*behavior|behavior|respect|kindness|citizenship/i,
    lines: [
      'You earned this — keep up the good behavior!',
      'Your good choices really show. Well done!',
      'That kind of behavior deserves a reward!',
    ],
  },
  {
    match: /academic|homework|study|reading|math|science|writing|spelling/i,
    lines: [
      'Great work — your effort in class really shows!',
      'You deserved this for working hard academically!',
      'Keep up that awesome learning momentum!',
    ],
  },
  {
    match: /help|helper|assist|service|volunteer/i,
    lines: [
      'Thank you for being such a helpful classmate!',
      'Your helpful spirit makes a difference!',
      'You earned this for going out of your way to help!',
    ],
  },
  {
    match: /participat|effort|try|focus|attention/i,
    lines: [
      'Your effort and focus really paid off!',
      'Great participation — keep bringing that energy!',
      'You showed up and tried hard. Well done!',
    ],
  },
  {
    match: /leadership|leader|responsible|responsibility/i,
    lines: [
      'Strong leadership — you earned this!',
      'You handled responsibility like a pro!',
      'Great job stepping up as a leader!',
    ],
  },
  {
    match: /team|cooperat|collaborat|group/i,
    lines: [
      'Awesome teamwork — you deserved this!',
      'You work so well with others. Keep it up!',
      'Great collaboration today!',
    ],
  },
];

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function fallbackCouponRedeemCompliment(category: string, seed = Date.now()): string {
  const cat = category.trim() || 'Coupon';
  const bucket =
    CATEGORY_COMPLIMENTS.find((entry) => entry.match.test(cat))?.lines ?? GENERIC_COMPLIMENTS;
  return bucket[hashSeed(`${cat}:${seed}`) % bucket.length];
}

export async function requestCouponRedeemCompliment(
  authFetch: CouponRedeemComplimentFetchAuth,
  opts: {
    schoolId: string;
    category: string;
    points?: number;
    firstName?: string;
    birthday?: string | null;
    signal?: AbortSignal;
    /** Max wait before using a local fallback (ms). */
    timeoutMs?: number;
  },
): Promise<string> {
  const category = opts.category.trim() || 'Coupon';
  const timeoutMs = opts.timeoutMs ?? 1400;
  const ageYears = studentAgeYearsFromBirthday(opts.birthday);

  const fetchCompliment = async (): Promise<string | null> => {
    try {
      const res = await authFetch('/api/coupon-redeem-compliment', {
        method: 'POST',
        signal: opts.signal,
        body: JSON.stringify({
          schoolId: opts.schoolId,
          category,
          points: typeof opts.points === 'number' ? opts.points : undefined,
          firstName: opts.firstName?.trim() || undefined,
          ageYears,
        }),
      });
      const j = (await res.json()) as { error?: string; compliment?: string };
      if (!res.ok) return null;
      const text = typeof j.compliment === 'string' ? j.compliment.trim() : '';
      return text.length >= 6 ? text : null;
    } catch {
      return null;
    }
  };

  const raced = await Promise.race([
    fetchCompliment(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);

  return raced ?? fallbackCouponRedeemCompliment(category, Date.now());
}

export const COUPON_TRASH_REMINDER = '🗑️ Toss your coupon in the trash — thanks!';

export function couponRedeemStudentMessage(opts: {
  points?: number;
  compliment?: string | null;
  includeTrashReminder?: boolean;
}): string {
  const parts: string[] = [];
  if (typeof opts.points === 'number' && opts.points > 0) {
    parts.push(`You gained ${opts.points} points.`);
  }
  const compliment = opts.compliment?.trim();
  if (compliment) parts.push(compliment);
  if (opts.includeTrashReminder !== false) parts.push(COUPON_TRASH_REMINDER);
  return parts.join(' ');
}
