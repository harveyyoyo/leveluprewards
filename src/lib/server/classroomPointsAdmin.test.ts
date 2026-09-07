import { describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import type { Firestore as ClientFirestore } from 'firebase/firestore';
import { applyClassroomPointsToStudents, applyRewardsPointsToStudents } from '../db/classroomPoints';

vi.mock('firebase/firestore', () => {
  let generatedId = 0;
  const reference = (base: any, ...parts: string[]) => {
    const path = [base.path, ...parts].filter(Boolean).join('/');
    return { path, id: path.split('/').at(-1) };
  };
  return {
    collection: reference,
    doc: (base: any, ...parts: string[]) => reference(base, ...(parts.length ? parts : [`auto-${++generatedId}`])),
    runTransaction: (db: any, callback: any) => db.runTransaction(callback, true),
  };
});
import { applyClassroomPointsAdmin, applyRewardsPointsAdmin } from './classroomPointsAdmin';

const meta = { teacherId: 't1', teacherName: 'Teacher' };

function database(students: Record<string, Record<string, unknown>>, failAfterWrites = Infinity) {
  const state: Record<string, Record<string, any>> = Object.fromEntries(
    Object.entries(students).map(([id, data]) => [`schools/demo/students/${id}`, structuredClone(data)]),
  );
  state['schools/demo/houses/h1'] = { points: 100, lifetimePoints: 100 };
  let generatedId = 0;
  let transactions = 0;
  function ref(path: string): any {
    return { path, collection: (name: string) => ({ doc: (id = `auto-${++generatedId}`) => ref(`${path}/${name}/${id}`) }) };
  }
  const db = {
    collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
    runTransaction: async (callback: (tx: any) => Promise<number>, client = false) => {
      transactions++;
      const pending: [string, Record<string, unknown>][] = [];
      function write(r: any, data: Record<string, unknown>) {
        pending.push([r.path, data]);
        if (pending.length > failAfterWrites) throw new Error('simulated write failure');
      }
      const result = await callback({
        get: async (r: any) => {
          if (pending.length) throw new Error('Reads must precede writes');
          return { ref: r, id: r.id, exists: client ? () => Boolean(state[r.path]) : Boolean(state[r.path]), data: () => state[r.path] };
        },
        update: write, set: write,
      });
      for (const [path, data] of pending) state[path] = { ...state[path], ...data };
      return result;
    },
  } as unknown as Firestore;
  return { db, state, transactions: () => transactions };
}

describe.each(['server', 'client'] as const)('%s', (transport) => {
  describe.each(['rewards', 'classroom'] as const)('%s atomic classroom awards', (mode) => {
    const award = (db: Firestore, ids: string[], delta: number) => transport === 'client'
      ? mode === 'rewards'
        ? applyRewardsPointsToStudents(db as unknown as ClientFirestore, 'demo', ids, delta, 'Effort', meta, { rollupHousePoints: true })
        : applyClassroomPointsToStudents(db as unknown as ClientFirestore, 'demo', ids, delta, 'Effort', meta)
      : mode === 'rewards'
      ? applyRewardsPointsAdmin(db, 'demo', ids, delta, 'Effort', meta, { rollupHousePoints: true })
      : applyClassroomPointsAdmin(db, 'demo', ids, delta, 'Effort', meta);
    const balance = mode === 'rewards' ? 'points' : 'classroomPoints';

    it('awards 120 students in a single transaction', async () => {
      const students = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [`s${i}`, { [balance]: 0 }]));
      const { db, state, transactions } = database(students);
      const result = await award(db, Object.keys(students), 5);
      expect(result.count).toBe(120);
      expect(transactions()).toBe(1);
      for (const id of Object.keys(students)) expect(state[`schools/demo/students/${id}`][balance]).toBe(5);
    });

    it('leaves all balances unchanged when a later write fails', async () => {
      const students = Object.fromEntries(Array.from({ length: 81 }, (_, i) => [`s${i}`, { [balance]: 7 }]));
      const { db, state } = database(students, 240);
      if (transport === 'server') {
        await expect(award(db, Object.keys(students), 5)).rejects.toThrow('simulated write failure');
      } else {
        expect(await award(db, Object.keys(students), 5)).toMatchObject({ success: false, count: 0 });
      }
      for (const id of Object.keys(students)) expect(state[`schools/demo/students/${id}`][balance]).toBe(7);
      expect(Object.keys(state).some((key) => key.includes('/activities/'))).toBe(false);
    });

    it('records only the available balance when a deduction reaches zero', async () => {
      const { db, state } = database({ s1: { [balance]: 3, houseId: 'h1' } });
      await award(db, ['s1'], -10);
      expect(state['schools/demo/students/s1'][balance]).toBe(0);
      const activity = Object.entries(state).find(([key]) => key.includes('/activities/'))![1];
      const audit = Object.entries(state).find(([key]) => key.includes('/classroomAwards/'))![1];
      expect(activity.amount).toBe(-3);
      expect(audit.points).toBe(-3);
      expect(state['schools/demo/houses/h1'].points).toBe(mode === 'rewards' ? 97 : 100);
    });

    it('rejects oversized awards before any transaction starts', async () => {
      const { db, transactions } = database({});
      const result = await award(db, Array.from({ length: 121 }, (_, i) => `s${i}`), 5);
      expect(result.success).toBe(false);
      expect(transactions()).toBe(0);
    });
  });
});
