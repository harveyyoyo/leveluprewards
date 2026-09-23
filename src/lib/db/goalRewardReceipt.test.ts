import { beforeEach, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';

const fake = vi.hoisted(() => ({
  receipts: new Set<string>(),
  update: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => args.slice(1).join('/'),
  collection: (...args: unknown[]) => args.slice(1).join('/'),
  runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<void>) => callback({
    get: async (ref: string) => ref.includes('/activities/')
      ? { exists: () => fake.receipts.has(ref) }
      : { exists: () => true, data: () => ({ points: 10, lifetimePoints: 10 }) },
    update: fake.update,
    set: (ref: string) => fake.receipts.add(ref),
  }),
}));
vi.mock('@/firebase/error-emitter', () => ({ reportFirestorePermissionError: vi.fn() }));
vi.mock('./helpers', () => ({
  applyPointsByPeriod: () => ({}),
  applyCategoryPointsByPeriod: () => ({}),
  applyAchievementsAndBadges: () => ({ bonusTotal: 0, earnedAchievements: [], earnedBadges: [] }),
}));
vi.mock('./housePoints', () => ({}));
vi.mock('./lookup', () => ({ lookupStudentId: vi.fn() }));
import { awardPointsToStudent } from './students';

beforeEach(() => { fake.receipts.clear(); fake.update.mockClear(); });

it('a repeated goal award updates the balance only once per student', async () => {
  const award = () => awardPointsToStudent({} as Firestore, 'school', 'student', 5, 'Goal reward', [], [], [], { skipGoalSync: true, goalRewardId: 'goal' });
  expect((await award()).success).toBe(true);
  expect((await award()).success).toBe(true);
  expect(fake.update).toHaveBeenCalledTimes(1);
  expect(fake.update).toHaveBeenCalledWith('schools/school/students/student', expect.objectContaining({ points: 15, lifetimePoints: 15 }));
});
