import type { Prize } from '@/lib/types';
import { canonicalAiSurpriseText, type AiSurpriseKind } from '@/lib/prizes/prizeAiFunClientStorage';
import { buildFallbackAcrostic } from '@/lib/prizes/prizeAiFunAcrostic';

export type PrizeSurprise = { kind: AiSurpriseKind; text: string; answer?: string };

const FALLBACK_PRIZE_SURPRISES: Record<'joke' | 'riddle' | 'fortune', PrizeSurprise[]> = {
  joke: [
    { kind: 'joke', text: 'Why did the student bring a ladder to school? Because they wanted to go to high school!' },
    { kind: 'joke', text: 'Why was the math book so good at telling stories? It had a lot of problems to solve.' },
    { kind: 'joke', text: 'What did one pencil say to the other? You are looking sharp today!' },
    { kind: 'joke', text: 'Why did the crayon win an award? It drew the biggest crowd.' },
    { kind: 'joke', text: 'Why did the notebook go to the doctor? It had too many notes.' },
    { kind: 'joke', text: 'Why did the clock do well in class? It was always on time.' },
    { kind: 'joke', text: "What is a teacher's favorite kind of music? Class-ical." },
    { kind: 'joke', text: 'Why did the student bring a spoon to class? They heard learning was sweet.' },
  ],
  riddle: [
    { kind: 'riddle', text: 'I get bigger the more you take away. What am I?', answer: 'A hole' },
    { kind: 'riddle', text: 'What has pages, tells stories, and never speaks out loud?', answer: 'A book' },
    { kind: 'riddle', text: 'What can you catch but never throw?', answer: 'A cold' },
    { kind: 'riddle', text: 'What has hands but cannot clap?', answer: 'A clock' },
    { kind: 'riddle', text: 'What has many teeth but cannot bite?', answer: 'A comb' },
  ],
  fortune: [
    { kind: 'fortune', text: 'A bright surprise is waiting in your next reward moment.' },
    { kind: 'fortune', text: 'Your next brave try may turn into your best win yet.' },
    { kind: 'fortune', text: 'A kind choice today will come back as a smile.' },
    { kind: 'fortune', text: 'Small steps are quietly building something awesome.' },
    { kind: 'fortune', text: 'Good effort has a way of opening new doors.' },
  ],
};

export function fallbackPrizeSurprise(
  mode: Prize['aiFunReward'],
  prizeName: string,
  previousText?: string,
  firstName?: string,
): PrizeSurprise {
  const roll =
    mode === 'random'
      ? (['joke', 'riddle', 'fortune', 'acrostic'] as const)[Math.floor(Math.random() * 4)]
      : mode === 'picker'
        ? 'joke'
        : mode === 'riddle' || mode === 'fortune' || mode === 'acrostic'
          ? mode
          : 'joke';
  const kind = roll;
  if (kind === 'acrostic') {
    return buildFallbackAcrostic(firstName || 'Star');
  }
  const options = FALLBACK_PRIZE_SURPRISES[kind];
  const prevCanon = previousText ? canonicalAiSurpriseText(previousText) : '';
  const freshOptions = prevCanon
    ? options.filter((item) => canonicalAiSurpriseText(item.text) !== prevCanon)
    : options;
  const selected = (freshOptions.length ? freshOptions : options)[
    Math.floor(Math.random() * (freshOptions.length || options.length))
  ];
  if (kind === 'fortune' && prizeName) {
    return {
      ...selected,
      text: selected.text.replace('reward moment', `${prizeName} moment`),
    };
  }
  return selected;
}
