export function buildClassroomRandomPickSequence(
  studentIds: string[],
  random: () => number = Math.random,
): { steps: string[]; winner: string } | null {
  const unique = [...new Set(studentIds.filter(Boolean))];
  if (!unique.length) return null;
  const winner = unique[Math.floor(random() * unique.length)]!;
  if (unique.length === 1) return { steps: [winner], winner };

  const hops = Math.min(14, Math.max(8, unique.length + 2));
  const steps: string[] = [];
  let last = '';
  for (let i = 0; i < hops - 1; i += 1) {
    let next = unique[Math.floor(random() * unique.length)]!;
    if (next === last) {
      next = unique[(unique.indexOf(next) + 1) % unique.length]!;
    }
    steps.push(next);
    last = next;
  }
  steps.push(winner);
  return { steps, winner };
}

export function classroomRandomPickStepDelayMs(stepIndex: number, totalSteps: number): number {
  const remaining = totalSteps - stepIndex;
  if (remaining <= 2) return 280;
  if (remaining <= 4) return 180;
  if (remaining <= 6) return 120;
  return 80;
}
