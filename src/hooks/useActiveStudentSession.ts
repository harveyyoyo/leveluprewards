import { useCallback, useState } from 'react';

export type StudentLoginMeta =
  | { source: 'face'; confidence?: number }
  | { source: 'badge' }
  | { source: 'manual' };

export function useActiveStudentSession() {
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [loginMeta, setLoginMeta] = useState<StudentLoginMeta | null>(null);

  const handleDone = useCallback(() => {
    setActiveStudentId(null);
    setLoginMeta(null);
  }, []);

  return { activeStudentId, setActiveStudentId, handleDone, loginMeta, setLoginMeta };
}

