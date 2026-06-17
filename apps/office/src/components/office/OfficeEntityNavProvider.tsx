'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { OfficeStudentSheet } from '@/components/office/OfficeStudentSheet';
import { OfficeTeacherSheet } from '@/components/office/OfficeTeacherSheet';
import { OfficeClassSheet } from '@/components/office/OfficeClassSheet';
import { useOfficePortalData } from '@/components/office/OfficePortalGate';
import { useOfficeSharedData } from '@/lib/office/useOfficeSharedData';
import { useOfficeTerm } from '@/lib/office/useOfficeTerm';
import type { OfficeClass, OfficeStudent, OfficeTeacher } from '@/lib/office/types';

type OfficeEntityNavContextValue = {
  openStudent: (target: OfficeStudent | string) => void;
  openTeacher: (target: OfficeTeacher | string) => void;
  openClass: (target: OfficeClass | string) => void;
  closeAll: () => void;
  selectedStudentId: string | null;
  selectedTeacherId: string | null;
  selectedClassId: string | null;
};

const OfficeEntityNavContext = createContext<OfficeEntityNavContextValue | null>(null);

export function useOfficeEntityNav(): OfficeEntityNavContextValue {
  const ctx = useContext(OfficeEntityNavContext);
  if (!ctx) {
    throw new Error('useOfficeEntityNav must be used within OfficeEntityNavProvider');
  }
  return ctx;
}

type OfficeEntityNavProviderProps = {
  schoolId: string;
  children: ReactNode;
};

export function OfficeEntityNavProvider({ schoolId, children }: OfficeEntityNavProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shared = useOfficeSharedData(schoolId, true);
  const { gradeEntries, billingAccounts } = useOfficePortalData();
  const { term } = useOfficeTerm(schoolId);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const hydratedFromQuery = useRef(false);

  const replaceEntityQuery = useCallback(
    (next: { student?: string | null; teacher?: string | null; classSheet?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if ('student' in next) {
        if (next.student) params.set('student', next.student);
        else params.delete('student');
      }
      if ('teacher' in next) {
        if (next.teacher) params.set('teacher', next.teacher);
        else params.delete('teacher');
      }
      if ('classSheet' in next) {
        if (next.classSheet) params.set('classSheet', next.classSheet);
        else params.delete('classSheet');
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openStudent = useCallback(
    (target: OfficeStudent | string) => {
      const id = typeof target === 'string' ? target : target.id;
      setSelectedStudentId(id);
      setSelectedTeacherId(null);
      setSelectedClassId(null);
      replaceEntityQuery({ student: id, teacher: null, classSheet: null });
    },
    [replaceEntityQuery],
  );

  const openTeacher = useCallback(
    (target: OfficeTeacher | string) => {
      const id = typeof target === 'string' ? target : target.id;
      setSelectedTeacherId(id);
      setSelectedStudentId(null);
      setSelectedClassId(null);
      replaceEntityQuery({ teacher: id, student: null, classSheet: null });
    },
    [replaceEntityQuery],
  );

  const openClass = useCallback(
    (target: OfficeClass | string) => {
      const id = typeof target === 'string' ? target : target.id;
      setSelectedClassId(id);
      setSelectedStudentId(null);
      setSelectedTeacherId(null);
      replaceEntityQuery({ classSheet: id, student: null, teacher: null });
    },
    [replaceEntityQuery],
  );

  const closeAll = useCallback(() => {
    setSelectedStudentId(null);
    setSelectedTeacherId(null);
    setSelectedClassId(null);
    replaceEntityQuery({ student: null, teacher: null, classSheet: null });
  }, [replaceEntityQuery]);

  useEffect(() => {
    if (shared.isLoading) return;

    const studentId = searchParams.get('student')?.trim() || null;
    const teacherId = searchParams.get('teacher')?.trim() || null;
    const classSheetId = searchParams.get('classSheet')?.trim() || null;

    if (studentId && shared.students.some((s) => s.id === studentId)) {
      setSelectedStudentId(studentId);
      setSelectedTeacherId(null);
      setSelectedClassId(null);
      hydratedFromQuery.current = true;
      return;
    }
    if (teacherId && shared.teachers.some((t) => t.id === teacherId)) {
      setSelectedTeacherId(teacherId);
      setSelectedStudentId(null);
      setSelectedClassId(null);
      hydratedFromQuery.current = true;
      return;
    }
    if (classSheetId && shared.classes.some((c) => c.id === classSheetId)) {
      setSelectedClassId(classSheetId);
      setSelectedStudentId(null);
      setSelectedTeacherId(null);
      hydratedFromQuery.current = true;
      return;
    }

    if (hydratedFromQuery.current || studentId || teacherId || classSheetId) {
      setSelectedStudentId(null);
      setSelectedTeacherId(null);
      setSelectedClassId(null);
    }
    hydratedFromQuery.current = true;
  }, [searchParams, shared.isLoading, shared.students, shared.teachers, shared.classes]);

  const selectedStudent = useMemo(
    () => shared.students.find((s) => s.id === selectedStudentId) ?? null,
    [shared.students, selectedStudentId],
  );
  const selectedTeacher = useMemo(
    () => shared.teachers.find((t) => t.id === selectedTeacherId) ?? null,
    [shared.teachers, selectedTeacherId],
  );
  const selectedClass = useMemo(
    () => shared.classes.find((c) => c.id === selectedClassId) ?? null,
    [shared.classes, selectedClassId],
  );

  const value = useMemo(
    () => ({
      openStudent,
      openTeacher,
      openClass,
      closeAll,
      selectedStudentId,
      selectedTeacherId,
      selectedClassId,
    }),
    [openStudent, openTeacher, openClass, closeAll, selectedStudentId, selectedTeacherId, selectedClassId],
  );

  return (
    <OfficeEntityNavContext.Provider value={value}>
      {children}
      <OfficeStudentSheet
        schoolId={schoolId}
        student={selectedStudent}
        open={!!selectedStudent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStudentId(null);
            replaceEntityQuery({ student: null });
          }
        }}
        classLabel={selectedStudent?.classId ? shared.classNameById.get(selectedStudent.classId) : undefined}
        gradeEntries={gradeEntries}
        billingAccounts={billingAccounts}
        activeTerm={term}
        classes={shared.classes}
        teachers={shared.teachers}
      />
      <OfficeTeacherSheet
        schoolId={schoolId}
        teacher={selectedTeacher}
        open={!!selectedTeacher}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTeacherId(null);
            replaceEntityQuery({ teacher: null });
          }
        }}
        students={shared.students}
        classes={shared.classes}
        classNameById={shared.classNameById}
        gradeEntries={gradeEntries}
        activeTerm={term}
      />
      <OfficeClassSheet
        schoolId={schoolId}
        officeClass={selectedClass}
        open={!!selectedClass}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedClassId(null);
            replaceEntityQuery({ classSheet: null });
          }
        }}
        students={shared.students}
        teacherNameById={shared.teacherNameById}
      />
    </OfficeEntityNavContext.Provider>
  );
}
