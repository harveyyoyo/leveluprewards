'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Student } from '@/lib/types';

export type StudentSortOption =
  | 'lastNameAsc'
  | 'lastNameDesc'
  | 'firstNameAsc'
  | 'firstNameDesc'
  | 'pointsAsc'
  | 'pointsDesc'
  | 'createdAtAsc'
  | 'createdAtDesc';

function sortStudents(list: Student[], option: string): Student[] {
  return [...list].sort((a, b) => {
    switch (option) {
      case 'lastNameAsc':
        return a.lastName.localeCompare(b.lastName);
      case 'lastNameDesc':
        return b.lastName.localeCompare(a.lastName);
      case 'firstNameAsc':
        return a.firstName.localeCompare(b.firstName);
      case 'firstNameDesc':
        return b.firstName.localeCompare(a.firstName);
      case 'pointsDesc':
        return (b.lifetimePoints || b.points || 0) - (a.lifetimePoints || a.points || 0);
      case 'pointsAsc':
        return (a.lifetimePoints || a.points || 0) - (b.lifetimePoints || b.points || 0);
      case 'createdAtDesc':
        return (b.createdAt || 0) - (a.createdAt || 0);
      case 'createdAtAsc':
        return (a.createdAt || 0) - (b.createdAt || 0);
      default:
        return 0;
    }
  });
}

/**
 * Owns the admin-dashboard student list UI state: search term, class filter,
 * sort option, and the multi-select set. Returns a derived `filteredStudents`
 * list plus helpers that keep the component free of roster bookkeeping.
 */
export function useStudentRoster(students: Student[] | null | undefined) {
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSortOption, setStudentSortOption] = useState<string>('lastNameAsc');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(true);
  const [studentFilterClass, setStudentFilterClass] = useState<string>('all');

  const filteredStudents = useMemo(() => {
    const term = studentSearchTerm.toLowerCase();
    const list = (students || []).filter((s) => {
      const computedName = `${s.firstName} ${s.lastName} ${s.nickname || ''}`.toLowerCase();
      const matchesSearch = computedName.includes(term) || (s.nfcId || '').toLowerCase().includes(term);
      const matchesClass = studentFilterClass === 'all' || s.classId === studentFilterClass;
      return matchesSearch && matchesClass;
    });
    return sortStudents(list, studentSortOption);
  }, [students, studentSearchTerm, studentFilterClass, studentSortOption]);

  const isAllFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.has(s.id));

  const toggleSelectAllFiltered = useCallback(() => {
    if (filteredStudents.length === 0) return;
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredStudents.every((s) => next.has(s.id));
      if (allSelected) {
        // Deselect only what's currently in the filtered search results.
        for (const s of filteredStudents) next.delete(s.id);
      } else {
        // Select everything currently visible (additive — preserves other selections).
        for (const s of filteredStudents) next.add(s.id);
      }
      return next;
    });
  }, [filteredStudents]);

  return {
    studentSearchTerm,
    setStudentSearchTerm,
    studentSortOption,
    setStudentSortOption,
    studentFilterClass,
    setStudentFilterClass,
    selectionMode,
    setSelectionMode,
    selectedStudentIds,
    setSelectedStudentIds,
    filteredStudents,
    isAllFilteredSelected,
    toggleSelectAllFiltered,
  } as const;
}
