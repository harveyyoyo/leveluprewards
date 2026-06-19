/** Fun decoy questions to ask before revealing a student's house (sorting ceremony). */
export const HOUSE_SORTING_FAKE_QUESTIONS: readonly string[] = [
  'If you could talk to any animal, which one would you choose?',
  'What is your favorite subject in school?',
  'Which season feels most like you — summer, fall, winter, or spring?',
  'Pick a superpower: flying, invisibility, or super strength.',
  'What color best matches your personality today?',
  'Would you rather explore the ocean or outer space?',
  'What is one thing you are proud of this year?',
  'If your house had a mascot, what would it be?',
  'Sweet or salty snacks — which team are you on?',
  'What song would play when you walk into the room?',
];

export function pickRandomSortingQuestion(exclude?: string): string {
  const pool = exclude
    ? HOUSE_SORTING_FAKE_QUESTIONS.filter((q) => q !== exclude)
    : [...HOUSE_SORTING_FAKE_QUESTIONS];
  if (pool.length === 0) return HOUSE_SORTING_FAKE_QUESTIONS[0]!;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
