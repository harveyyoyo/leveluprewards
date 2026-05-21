'use client';

import { useCallback, useEffect, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';
import { LibraryStudentSelfCheckoutPortal } from './LibraryStudentSelfCheckoutPortal';

export function LibrarySelfCheckoutOverlay({
  open,
  onOpenChange,
  schoolId,
  categories,
  getStudentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  categories?: Category[] | null;
  getStudentName: (id?: string) => string;
}) {
  const [exitOpen, setExitOpen] = useState(false);

  const handleUnlockedExit = useCallback(() => {
    setExitOpen(false);
    onOpenChange(false);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      setExitOpen(false);
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setExitOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex h-[100dvh] w-full flex-col overflow-hidden bg-background"
      role="dialog"
      aria-modal="true"
    >
      <LibraryStudentSelfCheckoutPortal
        schoolId={schoolId}
        categories={categories}
        getStudentName={getStudentName}
        embedded
        exitOpen={exitOpen}
        onExitOpenChange={setExitOpen}
        onExit={handleUnlockedExit}
      />
    </div>
  );
}

export function LibrarySelfCheckoutLaunchButton({
  schoolId,
  categories,
  getStudentName,
  className,
}: {
  schoolId: string;
  categories?: Category[] | null;
  getStudentName: (id?: string) => string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className ?? 'rounded-xl'}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <ScanBarcode className="mr-2 h-4 w-4" />
        Self checkout
      </Button>
      <LibrarySelfCheckoutOverlay
        open={open}
        onOpenChange={setOpen}
        schoolId={schoolId}
        categories={categories}
        getStudentName={getStudentName}
      />
    </>
  );
}
