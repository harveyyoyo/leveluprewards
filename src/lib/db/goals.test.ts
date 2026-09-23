import { describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'goal-ref'),
  collection: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteField: vi.fn(() => 'delete-field'),
}));
vi.mock('@/firebase/error-emitter', () => ({ reportFirestorePermissionError: vi.fn() }));

import { updateDoc } from 'firebase/firestore';
import { updateGoal } from './goals';

describe('editing goals', () => {
  it('removes cleared optional values without changing the goal status or owner', async () => {
    await updateGoal({} as Firestore, 'school', 'goal', {
      title: 'Updated title', clearFields: ['endDate', 'bonusPointsReward', 'studentId'], classId: 'class',
    });
    expect(updateDoc).toHaveBeenCalledWith('goal-ref', {
      title: 'Updated title', endDate: 'delete-field', bonusPointsReward: 'delete-field', studentId: 'delete-field', classId: 'class',
    });
  });
});
