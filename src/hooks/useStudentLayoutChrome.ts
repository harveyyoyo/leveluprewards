'use client';

import { useEffect, useState } from 'react';
import {
  readStudentLayoutChromeFlags,
  STUDENT_LAYOUT_CHROME_EVENT,
} from '@/lib/students/studentLayoutChrome';

export function useStudentLayoutChrome() {
  const [flags, setFlags] = useState(readStudentLayoutChromeFlags);

  useEffect(() => {
    const sync = () => setFlags(readStudentLayoutChromeFlags());
    sync();
    window.addEventListener(STUDENT_LAYOUT_CHROME_EVENT, sync);
    return () => window.removeEventListener(STUDENT_LAYOUT_CHROME_EVENT, sync);
  }, []);

  return flags;
}
