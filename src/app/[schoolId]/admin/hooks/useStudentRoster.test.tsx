import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Student } from '@/lib/types';
import { useStudentRoster } from './useStudentRoster';

/**
 * Minimal `Student` factory — keeps tests focused on the fields the hook
 * actually touches (names, nickname, nfcId, classId, points, createdAt)
 * without making us hand-build the full type every time.
 */
function makeStudent(overrides: Partial<Student> & { id: string; firstName: string; lastName: string }): Student {
  return {
    nfcId: '',
    points: 0,
    ...overrides,
  } as Student;
}

const alice = makeStudent({ id: '1', firstName: 'Alice', lastName: 'Adams', classId: 'a', lifetimePoints: 10, createdAt: 1 });
const bob = makeStudent({ id: '2', firstName: 'Bob', lastName: 'Baker', classId: 'b', lifetimePoints: 30, nickname: 'Bobby', createdAt: 3 });
const carol = makeStudent({ id: '3', firstName: 'Carol', lastName: 'Clark', classId: 'a', lifetimePoints: 20, nfcId: 'NFC-CLR', createdAt: 2 });
const ALL = [alice, bob, carol];

describe('useStudentRoster', () => {
  it('returns students sorted by last name ascending by default', () => {
    const { result } = renderHook(() => useStudentRoster(ALL));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['1', '2', '3']);
  });

  it('handles a null/undefined input gracefully', () => {
    const { result: empty } = renderHook(() => useStudentRoster(null));
    expect(empty.current.filteredStudents).toEqual([]);
    expect(empty.current.isAllFilteredSelected).toBe(false);

    const { result: undef } = renderHook(() => useStudentRoster(undefined));
    expect(undef.current.filteredStudents).toEqual([]);
  });

  it('filters by case-insensitive search term across name, nickname and nfcId', () => {
    const { result } = renderHook(() => useStudentRoster(ALL));

    act(() => result.current.setStudentSearchTerm('bobby'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['2']);

    act(() => result.current.setStudentSearchTerm('nfc-clr'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['3']);

    act(() => result.current.setStudentSearchTerm('ADAMS'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['1']);
  });

  it('filters by class id (with "all" as the pass-through sentinel)', () => {
    const { result } = renderHook(() => useStudentRoster(ALL));

    act(() => result.current.setStudentFilterClass('a'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['1', '3']);

    act(() => result.current.setStudentFilterClass('b'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['2']);

    act(() => result.current.setStudentFilterClass('all'));
    expect(result.current.filteredStudents).toHaveLength(3);
  });

  it('re-sorts when the sort option changes', () => {
    const { result } = renderHook(() => useStudentRoster(ALL));

    act(() => result.current.setStudentSortOption('pointsDesc'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['2', '3', '1']);

    act(() => result.current.setStudentSortOption('firstNameDesc'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['3', '2', '1']);

    act(() => result.current.setStudentSortOption('createdAtAsc'));
    expect(result.current.filteredStudents.map((s) => s.id)).toEqual(['1', '3', '2']);
  });

  describe('toggleSelectAllFiltered', () => {
    it('selects everything currently visible and leaves unrelated selections alone', () => {
      const { result } = renderHook(() => useStudentRoster(ALL));

      // Pre-seed an unrelated selection to make sure we don't stomp it.
      act(() => result.current.setSelectedStudentIds(new Set(['off-list'])));

      act(() => result.current.setStudentFilterClass('a'));
      act(() => result.current.toggleSelectAllFiltered());

      expect(Array.from(result.current.selectedStudentIds).sort()).toEqual(['1', '3', 'off-list']);
      expect(result.current.isAllFilteredSelected).toBe(true);
    });

    it('deselects only the currently visible rows on second call', () => {
      const { result } = renderHook(() => useStudentRoster(ALL));

      act(() => result.current.setSelectedStudentIds(new Set(['1', '2', '3', 'off-list'])));
      act(() => result.current.setStudentFilterClass('a'));

      // Visible set is {1, 3}; toggling should drop just those two.
      act(() => result.current.toggleSelectAllFiltered());
      expect(Array.from(result.current.selectedStudentIds).sort()).toEqual(['2', 'off-list']);
      expect(result.current.isAllFilteredSelected).toBe(false);
    });

    it('is a no-op when the filtered list is empty', () => {
      const { result } = renderHook(() => useStudentRoster(ALL));
      act(() => result.current.setSelectedStudentIds(new Set(['1'])));
      act(() => result.current.setStudentSearchTerm('zzzzzzz'));
      expect(result.current.filteredStudents).toHaveLength(0);

      act(() => result.current.toggleSelectAllFiltered());
      expect(Array.from(result.current.selectedStudentIds)).toEqual(['1']);
    });
  });

  it('reports isAllFilteredSelected correctly across filter changes', () => {
    const { result } = renderHook(() => useStudentRoster(ALL));
    expect(result.current.isAllFilteredSelected).toBe(false);

    act(() => result.current.setSelectedStudentIds(new Set(['1', '3'])));
    expect(result.current.isAllFilteredSelected).toBe(false); // '2' still visible

    act(() => result.current.setStudentFilterClass('a'));
    expect(result.current.isAllFilteredSelected).toBe(true); // only {1,3} visible, both selected
  });
});
