'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import { classroomControlsBarClass } from '@/components/points/classroomVisualTheme';
import { classroomSidebarRailClass } from '@/lib/classroom/classroomTokenTheme';
import type { ClassroomDesign } from '@/lib/classroomSeatingChart';
import { cn } from '@/lib/utils';

const spring = { type: 'spring' as const, stiffness: 320, damping: 32 };

/** Icon column only — wide enough for full icons, not labels. */
export const CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX = 48;
/** Full tools panel with icons + labels. */
export const CLASSROOM_LIVE_SIDEBAR_EXPANDED_PX = 256;
const COLLAPSE_DELAY_MS = 280;

type ClassroomLiveSidebarChrome = {
  /** True while the rail targets full width (hover open). */
  expanded: boolean;
  /**
   * True while tools should render icon-only (no labels).
   * Stays true until the expand spring finishes so labels never look cut in half.
   */
  iconOnly: boolean;
  requestExpand: () => void;
};

const ClassroomLiveSidebarChromeContext = createContext<ClassroomLiveSidebarChrome>({
  expanded: true,
  iconOnly: false,
  requestExpand: () => undefined,
});

/** When tools sit inside the left hover rail, read icon-only vs full panel. */
export function useClassroomLiveSidebarChrome(): ClassroomLiveSidebarChrome {
  return useContext(ClassroomLiveSidebarChromeContext);
}

export function ClassroomLiveHoverSidebar({
  design,
  children,
  ariaLabel = 'Classroom tools',
}: {
  design: ClassroomDesign;
  children: ReactNode;
  /** Kept for call-site compatibility; setup lives in the icon rail. */
  onOpenSetup?: () => void;
  setupActive?: boolean;
  ariaLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [iconOnly, setIconOnly] = useState(true);
  const collapseTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current != null) {
      window.clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current != null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const revealFullPanel = useCallback(() => {
    clearRevealTimer();
    setIconOnly(false);
  }, [clearRevealTimer]);

  const open = useCallback(() => {
    clearCollapseTimer();
    setExpanded(true);
    // Keep icons until the width spring is mostly done so labels are never cut in half.
    clearRevealTimer();
    revealTimerRef.current = window.setTimeout(() => {
      setIconOnly(false);
      revealTimerRef.current = null;
    }, 200);
  }, [clearCollapseTimer, clearRevealTimer]);

  const scheduleCollapse = useCallback(() => {
    clearCollapseTimer();
    clearRevealTimer();
    collapseTimerRef.current = window.setTimeout(() => {
      // Drop labels immediately so collapse never shows clipped text.
      setIconOnly(true);
      setExpanded(false);
      collapseTimerRef.current = null;
    }, COLLAPSE_DELAY_MS);
  }, [clearCollapseTimer, clearRevealTimer]);

  const chrome = useMemo<ClassroomLiveSidebarChrome>(
    () => ({ expanded, iconOnly, requestExpand: open }),
    [expanded, iconOnly, open],
  );

  return (
    <div className="relative z-20 h-full shrink-0" style={{ width: expanded ? CLASSROOM_LIVE_SIDEBAR_EXPANDED_PX : CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX }}>
      <ClassroomLiveSidebarChromeContext.Provider value={chrome}>
        <motion.aside
          layoutId="classroom-live-sidebar-rail"
          initial={false}
          animate={{
            width: expanded ? CLASSROOM_LIVE_SIDEBAR_EXPANDED_PX : CLASSROOM_LIVE_SIDEBAR_COLLAPSED_PX,
          }}
          transition={spring}
          aria-label={ariaLabel}
          aria-expanded={expanded && !iconOnly}
          onMouseEnter={open}
          onMouseLeave={scheduleCollapse}
          onAnimationComplete={() => {
            if (expanded) {
              revealFullPanel();
            } else {
              setIconOnly(true);
            }
          }}
          className={cn(
            classroomControlsBarClass(design),
            classroomSidebarRailClass(design),
            'absolute inset-y-0 left-0 flex h-full min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-l-0 shadow-lg shadow-black/10',
            iconOnly ? 'pointer-events-auto px-1.5 py-2' : 'p-2',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden',
              iconOnly ? 'items-center gap-1.5 overflow-y-auto overflow-x-hidden' : 'gap-1.5',
            )}
          >
            {children}
          </div>
        </motion.aside>
      </ClassroomLiveSidebarChromeContext.Provider>
    </div>
  );
}
