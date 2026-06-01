'use client';

import { useEffect } from 'react';

/** Updates the browser tab title for staff portal routes (layout metadata is static). */
export function StaffPortalDocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | LevelUp EDU`;
    return () => {
      document.title = previous;
    };
  }, [title]);
  return null;
}
