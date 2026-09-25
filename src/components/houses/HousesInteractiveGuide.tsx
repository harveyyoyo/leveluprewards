'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Search,
  Castle,
  Users,
  Sparkles,
  Trophy,
  Wand2,
  Plus,
  Settings,
  CheckCircle2,
  ArrowRight,
  X,
  BookMarked,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { HousesHeaderTab } from './HousesHeaderBar';
import { cn } from '@/lib/utils';

export interface HousesGuideTopic {
  id: string;
  title: string;
  summary: string;
  icon: typeof Castle;
  color: string;
  steps: string[];
  actionLabel?: string;
  actionTab?: HousesHeaderTab;
  onSpecialAction?: () => void;
}

export interface HousesInteractiveGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateTab: (tab: HousesHeaderTab) => void;
  onOpenSetupWizard?: () => void;
  onOpenAddHouse?: () => void;
  onOpenSettings?: () => void;
}

const spring = { type: 'spring' as const, stiffness: 280, damping: 26 };
const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};

export function HousesInteractiveGuide({
  open,
  onOpenChange,
  onNavigateTab,
  onOpenSetupWizard,
  onOpenAddHouse,
  onOpenSettings,
}: HousesInteractiveGuideProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const topics: HousesGuideTopic[] = [
    {
      id: 'teams',
      title: 'Teams Board',
      summary:
        'See every house team, standings, and totals in one full screen. Award points quickly from a house card.',
      icon: Castle,
      color: 'bg-amber-500/15 hr-fg border-amber-400/40',
      steps: [
        'Compare house standings in cards or chart view.',
        'Tap a house to award or deduct points with an optional reason.',
        'Sync totals from student records when house points should match student awards.',
      ],
      actionLabel: 'Open Teams',
      actionTab: 'teams',
    },
    {
      id: 'rosters',
      title: 'House Rosters',
      summary: 'Assign students and teachers to houses, balance teams, and manage who belongs where.',
      icon: Users,
      color: 'bg-sky-500/15 hr-fg border-sky-400/40',
      steps: [
        'Browse members by house and move students who need a new team.',
        'Auto-sort unassigned students with balanced or random placement.',
        'Keep teacher house assignments in sync for spirit events.',
      ],
      actionLabel: 'Open Rosters',
      actionTab: 'rosters',
    },
    {
      id: 'ceremony',
      title: 'Sorting Ceremony',
      summary: 'Run a live sorting show with music and celebration — great for assemblies or kickoff day.',
      icon: Sparkles,
      color: 'bg-violet-500/15 hr-fg border-violet-400/40',
      steps: [
        'Open the Ceremony tab to practice or run sorting in the Houses workspace.',
        'Use Fullscreen when projecting for the whole school.',
        'Students get placed into houses with fanfare as you go.',
      ],
      actionLabel: 'Open Ceremony',
      actionTab: 'ceremony',
    },
    {
      id: 'hall-of-fame',
      title: 'Hall of Fame',
      summary: 'Celebrate top students and house spirit on a display ready for TVs and kiosks.',
      icon: Trophy,
      color: 'bg-rose-500/15 hr-fg border-rose-400/40',
      steps: [
        'Tune sort order, podium size, and grid layout for your screen.',
        'Preview settings here, then launch the public display in a new tab.',
        'Keep student point rollup on if Hall of Fame should follow student totals.',
      ],
      actionLabel: 'Open Hall of Fame',
      actionTab: 'hall-of-fame',
    },
    {
      id: 'award_points',
      title: 'Awarding Points',
      summary: 'Give or take house points from the Teams board without leaving the competition view.',
      icon: Plus,
      color: 'bg-emerald-500/15 hr-fg border-emerald-400/40',
      steps: [
        'On Teams, open a house card and choose how many points to add or remove.',
        'Add a short reason so staff can see why the score changed.',
        'Lifetime totals rise when you award; current totals never go below zero.',
      ],
      actionLabel: 'Go to Teams',
      actionTab: 'teams',
    },
    {
      id: 'ai_setup',
      title: 'AI Setup & Themes',
      summary: 'Spin up house names, colors, mottos, and a realm look with AI — or pick a ready-made pack.',
      icon: Wand2,
      color: 'bg-amber-500/15 hr-fg border-amber-400/40',
      steps: [
        'Tap AI Setup in the header to generate a themed house set.',
        'Optionally assign unassigned students right after creating houses.',
        'Change the realm look anytime under Theme & Settings.',
      ],
      actionLabel: onOpenSetupWizard ? 'Open AI Setup' : 'Open Settings',
      actionTab: onOpenSetupWizard ? undefined : 'settings',
      onSpecialAction: onOpenSetupWizard,
    },
    {
      id: 'add_house',
      title: 'Add or Edit a House',
      summary: 'Create a new house team or tweak an existing name, color, emoji, and motto.',
      icon: Castle,
      color: 'bg-indigo-500/15 hr-fg border-indigo-400/40',
      steps: [
        'Use Add House in the header for a brand-new team.',
        'From Teams, edit a house card to update colors or mottos.',
        'Deleting a house unassigns its students first — confirm carefully.',
      ],
      actionLabel: onOpenAddHouse ? 'Add a House' : 'Open Teams',
      actionTab: onOpenAddHouse ? undefined : 'teams',
      onSpecialAction: onOpenAddHouse,
    },
    {
      id: 'settings',
      title: 'Theme & Settings',
      summary: 'Pick a Houses look, ceremony effects, and point rollup options for your school.',
      icon: Settings,
      color: 'bg-slate-400/15 hr-fg border-slate-400/40',
      steps: [
        'Open the gear icon for theme packs and display tone.',
        'Turn student-to-house point rollup on when house totals should follow kids.',
        'Reset all houses only when you truly want a fresh start.',
      ],
      actionLabel: onOpenSettings ? 'Open Settings' : undefined,
      onSpecialAction: onOpenSettings,
    },
  ];

  const filteredTopics = topics.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q) ||
      t.steps.some((s) => s.toLowerCase().includes(q))
    );
  });

  const handleAction = (topic: HousesGuideTopic) => {
    onOpenChange(false);
    if (topic.onSpecialAction) {
      topic.onSpecialAction();
    } else if (topic.actionTab) {
      onNavigateTab(topic.actionTab);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/25 backdrop-blur-[1px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="w-full sm:max-w-xl flex flex-col p-0 gap-0 h-[100dvh] max-h-[100dvh] hr-panel hr-fg shadow-2xl border-l hr-border"
      >
        <div className="p-5 border-b hr-border space-y-3 shrink-0 hr-chrome pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-black flex items-center gap-2 hr-fg">
                <Compass className="h-5 w-5" style={{ color: 'var(--hr-accent-text, #fde68a)' }} />
                Houses Guide
              </SheetTitle>
              <SheetDescription className="text-xs hr-muted">
                Learn each Houses screen, then jump straight to it.
              </SheetDescription>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 hr-muted" />
            <Input
              placeholder="Search topics (e.g. ceremony, points, roster)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs rounded-xl hr-soft hr-border hr-fg placeholder:opacity-50"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 hr-muted hover:opacity-100 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <ScrollArea className="flex-1 p-5">
          {filteredTopics.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <BookMarked className="h-10 w-10 mx-auto opacity-40" />
              <p className="text-sm font-bold hr-fg">No matching topics found</p>
              <p className="text-xs hr-muted">Try another word like &quot;teams&quot;, &quot;ceremony&quot;, or &quot;points&quot;.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="rounded-full text-xs font-semibold mt-2 cursor-pointer hr-fg"
              >
                Clear search filters
              </Button>
            </div>
          ) : (
            <motion.div
              className="space-y-4 pb-8"
              variants={listVariants}
              initial="hidden"
              animate="show"
              key={searchQuery || 'all'}
            >
              {filteredTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <motion.div key={topic.id} variants={itemVariants} layoutId={`houses-guide-${topic.id}`}>
                    <Card className="border hr-border hr-panel shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden">
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={cn(
                                'h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs',
                                topic.color,
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-sm sm:text-base leading-snug hr-fg truncate">
                              {topic.title}
                            </h3>
                          </div>

                          {topic.actionLabel ? (
                            <Button
                              size="sm"
                              onClick={() => handleAction(topic)}
                              className="rounded-full h-8 px-3 text-xs font-bold shrink-0 shadow-xs gap-1 border-0"
                              style={{
                                backgroundImage:
                                  'linear-gradient(135deg, var(--hr-accent-from, #fbbf24), var(--hr-accent-to, #7c3aed))',
                                color: 'var(--hr-on-accent, #1a0f2e)',
                              }}
                            >
                              <span className="hidden sm:inline">{topic.actionLabel}</span>
                              <span className="sm:hidden">Go</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          ) : null}
                        </div>

                        <p className="text-xs sm:text-sm hr-fg/90 leading-relaxed">{topic.summary}</p>

                        <div className="rounded-xl p-3 space-y-1.5 border hr-border hr-soft">
                          <p className="text-[11px] font-bold hr-muted uppercase tracking-wider">
                            Key Features:
                          </p>
                          <ul className="space-y-1">
                            {topic.steps.map((step, i) => (
                              <li key={i} className="text-xs hr-fg/85 flex items-start gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
