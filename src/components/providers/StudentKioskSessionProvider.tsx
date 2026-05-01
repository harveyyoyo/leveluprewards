'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type StudentLoginMeta =
  | { source: 'face'; confidence?: number }
  | { source: 'badge' }
  | { source: 'manual' };

export interface StudentKioskSessionValue {
  activeStudentId: string | null;
  setActiveStudentId: (id: string | null) => void;
  handleDone: () => void;
  loginMeta: StudentLoginMeta | null;
  setLoginMeta: (meta: StudentLoginMeta | null) => void;
}

const StudentKioskSessionContext = createContext<StudentKioskSessionValue | null>(null);

export function StudentKioskSessionProvider({ children }: { children: ReactNode }) {
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [loginMeta, setLoginMeta] = useState<StudentLoginMeta | null>(null);

  const handleDone = useCallback(() => {
    setActiveStudentId(null);
    setLoginMeta(null);
  }, []);

  const value = useMemo(
    () => ({
      activeStudentId,
      setActiveStudentId,
      handleDone,
      loginMeta,
      setLoginMeta,
    }),
    [activeStudentId, handleDone, loginMeta],
  );

  return (
    <StudentKioskSessionContext.Provider value={value}>
      {children}
    </StudentKioskSessionContext.Provider>
  );
}

export function useStudentKioskSession(): StudentKioskSessionValue {
  const ctx = useContext(StudentKioskSessionContext);
  if (!ctx) {
    throw new Error('useStudentKioskSession must be used under StudentKioskSessionProvider');
  }
  return ctx;
}
