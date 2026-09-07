'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { DisplayViewSwitcher } from '@/components/displays/DisplayViewSwitcher';
import { parseDisplayView } from '@/lib/displays/displayRoutes';

const SmartScreenView = dynamic(() => import('@/components/displays/SmartScreenRouteView'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-semibold">Loading Smart Screen...</p>
    </div>
  ),
});

const BulletinBoardView = dynamic(() => import('../bulletin-board/BulletinBoardDisplay'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-semibold">Loading bulletin board...</p>
    </div>
  ),
});

const HallOfFameView = dynamic(() => import('@/components/displays/HallOfFameRouteView'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm font-semibold">Loading Hall of Fame...</p>
    </div>
  ),
});

export default function DisplaysPage() {
  const searchParams = useSearchParams();
  const { schoolId } = useAppContext();
  // Merged Displays feature: one on/off switch, three templates (Hall of Fame is the default/first).
  const resolvedView = parseDisplayView(searchParams.get('view'));

  return (
    <>
      {resolvedView === 'bulletin' ? (
        <BulletinBoardView />
      ) : resolvedView === 'smart' ? (
        <SmartScreenView />
      ) : (
        <HallOfFameView />
      )}
      {schoolId ? <DisplayViewSwitcher schoolId={schoolId} activeView={resolvedView} /> : null}
    </>
  );
}
