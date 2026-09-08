'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useDisplaysLiveFeed } from '@/hooks/useDisplaysLiveFeed';
import { ModularDisplayView } from '@/components/displays/modular/ModularDisplayView';
import {
  READY_MADE_PRESET_SCREENS,
  type ModularScreenConfig,
} from '@/lib/displays/modularDisplaySchema';
import { DisplayViewSwitcher } from '@/components/displays/DisplayViewSwitcher';
import type { DisplayView } from '@/lib/displays/displayRoutes';

export default function DisplaysPage() {
  const searchParams = useSearchParams();
  const { schoolId } = useAppContext();
  const { settings } = useSettings();
  const feed = useDisplaysLiveFeed(schoolId || '');

  const screenParam =
    searchParams.get('screen') ||
    searchParams.get('screenId') ||
    searchParams.get('displayId') ||
    searchParams.get('view') ||
    '';

  // Resolve active screen config
  const activeConfig: ModularScreenConfig = useMemo(() => {
    const savedScreens = settings.modularDisplayScreens || {};

    // 1. Direct match in saved screens
    if (screenParam && savedScreens[screenParam]) {
      return savedScreens[screenParam];
    }

    // 2. Ready-made preset key matches
    if (screenParam === 'smart' || screenParam === 'smart-screen') {
      return savedScreens['smart-screen'] || READY_MADE_PRESET_SCREENS['smart-screen'];
    }
    if (screenParam === 'bulletin' || screenParam === 'bulletin-board') {
      return savedScreens['bulletin-board'] || READY_MADE_PRESET_SCREENS['bulletin-board'];
    }
    if (screenParam === 'hall-of-fame' || screenParam === 'halloffame') {
      return savedScreens['hall-of-fame'] || READY_MADE_PRESET_SCREENS['hall-of-fame'];
    }

    // 3. Fallback to default hall-of-fame
    return savedScreens['hall-of-fame'] || READY_MADE_PRESET_SCREENS['hall-of-fame'];
  }, [screenParam, settings.modularDisplayScreens]);

  // Active view for bottom live switcher
  const currentView: DisplayView = useMemo(() => {
    if (activeConfig.id === 'smart-screen' || activeConfig.presetKey === 'smart-screen') return 'smart';
    if (activeConfig.id === 'bulletin-board' || activeConfig.presetKey === 'bulletin-board') return 'bulletin';
    return 'hall-of-fame';
  }, [activeConfig]);

  if (feed.isLoading && !feed.students.length) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm font-semibold">Loading display screen...</p>
      </div>
    );
  }

  return (
    <>
      <ModularDisplayView config={activeConfig} feed={feed} variant="fullscreen" />
      {schoolId ? <DisplayViewSwitcher schoolId={schoolId} activeView={currentView} /> : null}
    </>
  );
}
