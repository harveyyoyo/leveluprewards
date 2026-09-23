import { describe, expect, it } from 'vitest';
import type { OfficeNavId } from '@/lib/office/officeNav';
import { applyOfficeMenuOrder, moveOfficeMenuItem } from '@/lib/office/useOfficeMenuOrder';

const items = (ids: string[]) => ids.map((id) => ({ id: id as OfficeNavId }));
const ids = (list: { id: OfficeNavId }[]) => list.map((i) => i.id);

describe('applyOfficeMenuOrder', () => {
  it('keeps the usual order when nothing is saved', () => {
    expect(ids(applyOfficeMenuOrder(items(['home', 'students', 'billing']), []))).toEqual(['home', 'students', 'billing']);
  });

  it('follows the saved order and puts new sections after it', () => {
    const saved = ['billing', 'home'] as OfficeNavId[];
    expect(ids(applyOfficeMenuOrder(items(['home', 'students', 'grades', 'billing']), saved))).toEqual([
      'billing',
      'home',
      'students',
      'grades',
    ]);
  });
});

describe('moveOfficeMenuItem', () => {
  const list = ['home', 'students', 'grades', 'billing'] as OfficeNavId[];

  it('moves an item down to where it was dropped', () => {
    expect(moveOfficeMenuItem(list, 'students', 'billing')).toEqual(['home', 'grades', 'billing', 'students']);
  });

  it('moves an item up to where it was dropped', () => {
    expect(moveOfficeMenuItem(list, 'billing', 'students')).toEqual(['home', 'billing', 'students', 'grades']);
  });

  it('does nothing when dropped on itself', () => {
    expect(moveOfficeMenuItem(list, 'grades', 'grades')).toBe(list);
  });
});
