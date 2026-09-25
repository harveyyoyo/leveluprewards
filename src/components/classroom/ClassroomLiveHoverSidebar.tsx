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
import { PanelLeft, PanelLeftClose } from 'lucide-react';
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
  const [pinned, setPinned] = useState(false);
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
    }, 180);
  }, [clearCollapseTimer, clearRevealTimer]);

  const scheduleCollapse = useCallback(() => {
    if (pinned) return;
    clearCollapseTimer();
    clearRevealTimer();
    collapseTimerRef.current = window.setTimeout(() => {
      // Drop labels immediately so collapse never shows clipped text.
      setIconOnly(true);
      setExpanded(false);
      collapseTimerRef.current = null;
    }, COLLAPSE_DELAY_MS);
  }, [clearCollapseTimer, clearRevealTimer, pinned]);

  const togglePin = useCallback(() => {
    setPinned((p) => {
      const next = !p;
      if (next) {
        clearCollapseTimer();
        clearRevealTimer();
        setExpanded(true);
        setIconOnly(false);
      } else {
        setIconOnly(true);
        setExpanded(false);
      }
      return next;
    });
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
          style={{
            backgroundColor: 'var(--theme-sidebar-bg, undefined)',
            borderRight: 'var(--theme-sidebar-border, undefined)',
            color: 'var(--theme-sidebar-text, inherit)',
            fontFamily: 'var(--theme-font-body, inherit)',
          }}
          className={cn(
            classroomControlsBarClass(design),
            classroomSidebarRailClass(design),
            '!flex-col !flex-nowrap !items-stretch',
            'absolute inset-y-0 left-0 flex h-full min-h-0 overflow-hidden rounded-none border-y-0 border-l-0 border-r border-r-slate-200/80 shadow-lg shadow-black/10',
            iconOnly ? 'pointer-events-auto px-1.5 py-2' : 'p-2',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden',
              iconOnly ? 'items-center gap-1.5 overflow-y-auto overflow-x-hidden' : 'gap-1.5',
            )}
          >
            <div className={cn('flex items-center shrink-0 border-b border-black/10 pb-1 mb-1', iconOnly ? 'justify-center w-full' : 'justify-between px-1')}>
              {!iconOnly ? (
                <span
                  className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                  style={{ fontFamily: 'var(--theme-font-heading, inherit)' }}
                >
                  Classroom Tools
                </span>
              ) : null}
              <button
                type="button"
                onClick={togglePin}
                className="rounded-lg p-1 text-muted-foreground hover:bg-black/5 hover:text-foreground transition-colors"
                title={pinned ? 'Unpin sidebar (auto-collapse)' : iconOnly ? 'Pin sidebar open' : 'Keep sidebar open'}
                aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {pinned ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
              </button>
            </div>
            {children}
          </div>
        </motion.aside>
      </ClassroomLiveSidebarChromeContext.Provider>
    </div>
  );
}
