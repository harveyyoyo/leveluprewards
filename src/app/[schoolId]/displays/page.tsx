'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ExternalLink,
  Fullscreen,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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

  // Resolve active screen config (preferring saved school customizations over factory defaults)
  const activeConfig: ModularScreenConfig = useMemo(() => {
    const savedScreens = settings.modularDisplayScreens || {};

    if (screenParam) {
      if (savedScreens[screenParam]) {
        return savedScreens[screenParam];
      }
      if (screenParam === 'smart' || screenParam === 'smart-screen') {
        return savedScreens['smart-screen'] || READY_MADE_PRESET_SCREENS['smart-screen'];
      }
      if (screenParam === 'bulletin' || screenParam === 'bulletin-board') {
        return savedScreens['bulletin-board'] || READY_MADE_PRESET_SCREENS['bulletin-board'];
      }
      if (screenParam === 'hall-of-fame' || screenParam === 'halloffame') {
        return savedScreens['hall-of-fame'] || READY_MADE_PRESET_SCREENS['hall-of-fame'];
      }
    }

    return savedScreens['hall-of-fame'] || READY_MADE_PRESET_SCREENS['hall-of-fame'];
  }, [screenParam, settings.modularDisplayScreens]);

  // Active view for bottom live switcher
  const currentView: DisplayView = useMemo(() => {
    if (activeConfig.id === 'smart-screen' || activeConfig.presetKey === 'smart-screen') return 'smart';
    if (activeConfig.id === 'bulletin-board' || activeConfig.presetKey === 'bulletin-board') return 'bulletin';
    return 'hall-of-fame';
  }, [activeConfig]);

  // Floating controls auto-hide timer on mouse idle
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetIdleTimer = () => {
    setControlsVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3800);
  };

  useEffect(() => {
    resetIdleTimer();
    const handleActivity = () => resetIdleTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (feed.isLoading && !feed.students.length) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm font-semibold">Loading display screen...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh w-full overflow-hidden select-none">
      <ModularDisplayView config={activeConfig} feed={feed} variant="fullscreen" />

      {/* Floating Top Right TV Quick Action Bar (Auto-hides on idle) */}
      <div
        className={cn(
          'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-2xl bg-black/60 px-3 py-2 text-white backdrop-blur-md transition-opacity duration-500 border border-white/10 shadow-2xl',
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold hover:bg-white/20 transition-colors"
          title="Toggle Fullscreen Mode"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5" />
              <span>Exit</span>
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Full Screen</span>
            </>
          )}
        </button>

        <div className="h-4 w-px bg-white/20" />

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold hover:bg-white/20 transition-colors"
          title="Refresh Display Feed"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Floating Bottom Switcher (Auto-hides on idle) */}
      <div
        className={cn(
          'transition-opacity duration-500',
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        {schoolId ? <DisplayViewSwitcher schoolId={schoolId} activeView={currentView} /> : null}
      </div>
    </div>
  );
}
