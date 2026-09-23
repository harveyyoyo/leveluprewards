import confetti from 'canvas-confetti';
import type { GoalSyncEvent } from '@/lib/goalsProgress';
import type { GoalsOptions } from '@/lib/goals/goalsOptions';
import { resolveGoalsOptions } from '@/lib/goals/goalsOptions';

type ToastFn = (args: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}) => void;

type PlaySoundFn = (name: string) => void;

/**
 * Show staff/student feedback for goal sync events. Keeps UI calm: one toast per batch,
 * extra confetti for class finishes when party mode is on.
 */
export function presentGoalSyncEvents(
  events: GoalSyncEvent[] | undefined | null,
  args: {
    options?: Partial<GoalsOptions> | null;
    toast: ToastFn;
    playSound?: PlaySoundFn;
    /** Student-facing wording */
    forStudent?: boolean;
  },
): void {
  // Goals staff chose to keep off student pages don't cheer on student screens either.
  if (args.forStudent) events = events?.filter((e) => !e.hiddenFromStudents);
  if (!events?.length) return;
  const opts = resolveGoalsOptions(args.options);
  const completed = events.filter((e) => e.kind === 'completed');
  const almost = events.filter((e) => e.kind === 'almost_there');

  if (completed.length && opts.celebrateOnAward) {
    // Shared class and whole-school goals always get the bigger celebration.
    const classHit = completed.some((e) => e.type === 'class' || e.type === 'school');
    confetti({ particleCount: classHit ? 160 : 90, spread: classHit ? 100 : 70, origin: { y: 0.6 } });
    args.playSound?.('success');
    const first = completed[0]!;
    if (args.forStudent) {
      args.toast({
        title: classHit ? 'Team goal party!' : 'You did it!',
        description:
          completed.length === 1
            ? `"${first.title}" is finished.`
            : `${completed.length} goals finished — amazing!`,
      });
    } else {
      args.toast({
        title: classHit ? 'Team goal finished!' : 'Goal finished!',
        description:
          completed.length === 1
            ? `"${first.title}" is done.`
            : `${completed.length} goals just finished.`,
      });
    }
    return; // Prefer finish message over almost-there in the same batch
  }

  if (almost.length && opts.teacherAlmostThereNudge && !args.forStudent) {
    const first = almost[0]!;
    args.toast({
      title: 'Almost there!',
      description:
        almost.length === 1
          ? `"${first.title}" is getting close — a few more points could finish it.`
          : `${almost.length} students are close to a goal.`,
    });
  } else if (almost.length && args.forStudent && opts.celebrateOnAward) {
    const first = almost[0]!;
    args.toast({
      title: 'Almost there!',
      description: `"${first.title}" is so close — keep going!`,
    });
  }
}

/** After awarding points, sync goals for each student and present events. */
export async function syncAndPresentGoalsForStudents(
  firestore: unknown,
  schoolId: string,
  studentIds: string[],
  args: {
    options?: Partial<GoalsOptions> | null;
    toast: ToastFn;
    playSound?: PlaySoundFn;
    enabled: boolean;
  },
): Promise<void> {
  if (!args.enabled || !firestore || !schoolId || studentIds.length === 0) return;
  const opts = resolveGoalsOptions(args.options);
  if (!opts.celebrateOnAward && !opts.teacherAlmostThereNudge) return;

  try {
    const { syncGoalsForStudent } = await import('@/lib/goalsProgress');
    const unique = [...new Set(studentIds)].slice(0, 40);
    const allEvents: GoalSyncEvent[] = [];
    for (const id of unique) {
      const ev = await syncGoalsForStudent(firestore as never, schoolId, id);
      allEvents.push(...ev);
    }
    presentGoalSyncEvents(allEvents, {
      options: opts,
      toast: args.toast,
      playSound: args.playSound,
      forStudent: false,
    });
  } catch {
    // Non-blocking — awarding already succeeded.
  }
}
