'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { DisplayViewSwitcher } from '@/components/displays/DisplayViewSwitcher';
import { parseDisplayView, type DisplayView } from '@/lib/displays/displayRoutes';

const SmartScreenView = dynamic(() => import('../smart-screen/page'), {
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

const HallOfFameView = dynamic(() => import('../hall-of-fame/page'), {
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
  const { settings } = useSettings();
  const view = parseDisplayView(searchParams.get('view'));
  const bulletinEnabled = settings.bulletinEnabled !== false;
  const smartScreenEnabled = !!settings.smartScreenEnabled;
  const hallOfFameEnabled = !!settings.enableClassLeaderboard;

  const firstEnabledView: DisplayView = smartScreenEnabled
    ? 'smart'
    : bulletinEnabled
      ? 'bulletin'
      : hallOfFameEnabled
        ? 'hall-of-fame'
        : 'smart';

  const resolvedView: DisplayView =
    view === 'bulletin' && bulletinEnabled
      ? 'bulletin'
      : view === 'smart' && smartScreenEnabled
        ? 'smart'
        : view === 'hall-of-fame' && hallOfFameEnabled
          ? 'hall-of-fame'
          : firstEnabledView;

  return (
    <>
      {resolvedView === 'bulletin' ? (
        <BulletinBoardView />
      ) : resolvedView === 'hall-of-fame' ? (
        <HallOfFameView />
      ) : (
        <SmartScreenView />
      )}
      {schoolId ? (
        <DisplayViewSwitcher
          schoolId={schoolId}
          activeView={resolvedView}
          bulletinEnabled={bulletinEnabled}
          smartScreenEnabled={smartScreenEnabled}
          hallOfFameEnabled={hallOfFameEnabled}
        />
      ) : null}
    </>
  );
}
