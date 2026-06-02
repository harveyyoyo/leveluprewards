'use client';

import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStaffPortalLayout } from '@/components/staff/StaffPortalLayoutContext';

export function StaffPortalLayoutToggle() {
  const { isWide, toggleLayoutMode } = useStaffPortalLayout();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-lg"
      onClick={toggleLayoutMode}
      aria-label={isWide ? 'Use standard centered layout' : 'Use wide full-screen layout'}
      title={isWide ? 'Standard layout' : 'Wide layout'}
    >
      {isWide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
