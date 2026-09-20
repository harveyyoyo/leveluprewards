'use client';

import { useState, useEffect, useCallback, type ComponentType } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Compass,
  Search,
  BookOpen,
  Monitor,
  Printer,
  Sparkles,
  ShoppingBag,
  Ticket,
  Users,
  Trophy,
  Tv,
  LayoutDashboard,
  Home,
  Target,
  UserCog,
  CheckCircle2,
  ArrowRight,
  X,
  Layers,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/components/AppProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';

export interface RewardsGuideTopic {
  id: string;
  title: string;
  category: 'essentials' | 'points' | 'spirit' | 'classroom';
  categoryLabel: string;
  summary: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
  steps: string[];
  actionLabel: string;
  getHref: (schoolId: string) => string;
}

export interface RewardsInteractiveGuideProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pass a custom trigger button, or omit to render the default Guide button */
  trigger?: React.ReactNode;
}

export function RewardsInteractiveGuide({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: RewardsInteractiveGuideProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();
  const params = useParams<{ schoolId?: string }>();
  const { schoolId: contextSchoolId } = useAppContext();
  const playSound = useArcadeSound();

  const schoolId = contextSchoolId ?? params?.schoolId ?? '';
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isControlled && setControlledOpen) {
        setControlledOpen(nextOpen);
      } else {
        setInternalOpen(nextOpen);
      }
    },
    [isControlled, setControlledOpen],
  );

  // Allow any button anywhere in the app to open this guide via an event
  useEffect(() => {
    const onOpenEvent = () => handleOpenChange(true);
    window.addEventListener('open-rewards-guide', onOpenEvent);
    return () => window.removeEventListener('open-rewards-guide', onOpenEvent);
  }, [handleOpenChange]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const topics: RewardsGuideTopic[] = [
    {
      id: 'admin',
      title: 'School Admin Setup',
      category: 'essentials',
      categoryLabel: 'Core Essentials',
      summary: 'The main command center: manage student rosters, teachers, grade levels, and school-wide reward rules.',
      icon: UserCog,
      color: 'bg-red-500/10 text-red-600 border-red-300 dark:text-red-400',
      steps: [
        'Import student rosters from spreadsheets or SIS in minutes.',
        'Set up classrooms, teachers, and customized point denominations.',
        'Personalize your portal with your school logo, banner, and colors.',
      ],
      actionLabel: 'Open Admin Setup',
      getHref: (s) => `/${s}/admin`,
    },
    {
      id: 'teacher',
      title: 'Teacher Tools & Point Desk',
      category: 'essentials',
      categoryLabel: 'Core Essentials',
      summary: 'Where teachers celebrate positive behavior every day: award points, print tickets, and hand out prizes.',
      icon: Printer,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:text-emerald-400',
      steps: [
        'Award points to individual students or whole classes for participation and effort.',
        'Play celebratory arcade sound effects and confetti bursts when giving points.',
        'Hand out and mark student reward store redemptions as fulfilled.',
      ],
      actionLabel: 'Open Teacher Tools',
      getHref: (s) => `/${s}/teacher`,
    },
    {
      id: 'kiosk',
      title: 'Student Self-Service Kiosk',
      category: 'essentials',
      categoryLabel: 'Core Essentials',
      summary: 'An interactive arcade station where students scan their badges, check point balances, and pick prizes.',
      icon: Monitor,
      color: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:text-amber-400',
      steps: [
        'Students scan their barcode ID cards or type their name.',
        'Browse available prizes and see how many points they have left.',
        'Confetti bursts and joyful chimes confirm successful redemptions.',
      ],
      actionLabel: 'Open Student Kiosk',
      getHref: (s) => `/${s}/student`,
    },
    {
      id: 'store',
      title: 'School Store & Prizes',
      category: 'essentials',
      categoryLabel: 'Core Essentials',
      summary: 'Set up rewards students love: physical prizes, privilege passes, raffles, and special experiences.',
      icon: ShoppingBag,
      color: 'bg-sky-500/10 text-sky-600 border-sky-300 dark:text-sky-400',
      steps: [
        'Add items with photos, point prices, and inventory stock tracking.',
        'Offer privileges like "Line Leader", "Homework Pass", or "Lunch with the Principal".',
        'Automatic stock tracking alerts you before popular prizes run out.',
      ],
      actionLabel: 'Open Prize Store',
      getHref: (s) => `/${s}/admin?tab=store`,
    },
    {
      id: 'tickets',
      title: 'Printable Point Tickets & Badges',
      category: 'points',
      categoryLabel: 'Praise & Tickets',
      summary: 'Print perforated sheets of tangible reward tickets and student ID badges with scannable barcodes.',
      icon: Ticket,
      color: 'bg-purple-500/10 text-purple-600 border-purple-300 dark:text-purple-400',
      steps: [
        'Print sheets of paper coupons with scannable barcodes for hallway praise.',
        'Print durable student ID badges with barcodes for fast kiosk scanning.',
        'One-click printing for entire classrooms or individual students.',
      ],
      actionLabel: 'Open Ticket Printing',
      getHref: (s) => `/${s}/teacher?tab=print`,
    },
    {
      id: 'goals',
      title: 'Savings Goals & Wishlists',
      category: 'points',
      categoryLabel: 'Praise & Tickets',
      summary: 'Help students practice goal-setting and patience by picking a big reward to save points toward.',
      icon: Target,
      color: 'bg-pink-500/10 text-pink-600 border-pink-300 dark:text-pink-400',
      steps: [
        'Students choose a dream prize from the store to work toward.',
        'A visual progress bar fills up each time they earn points.',
        'Teaches delayed gratification and financial literacy in a fun way.',
      ],
      actionLabel: 'Open Goals & Wishlists',
      getHref: (s) => `/${s}/admin?tab=goals`,
    },
    {
      id: 'houses',
      title: 'School Houses & Teams',
      category: 'spirit',
      categoryLabel: 'School Spirit & TVs',
      summary: 'Build school-wide spirit by sorting students into houses with friendly, live-updating team point competitions.',
      icon: Users,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-300 dark:text-indigo-400',
      steps: [
        'Host exciting sorting ceremonies with animations and banners.',
        'Every point earned by an individual student also boosts their house total.',
        'Encourages peer teamwork and positive school community pride.',
      ],
      actionLabel: 'Open Houses Realm',
      getHref: (s) => `/${s}/houses-realm`,
    },
    {
      id: 'hall_of_fame',
      title: 'Hall of Fame & Leaderboards',
      category: 'spirit',
      categoryLabel: 'School Spirit & TVs',
      summary: 'Celebrate top point earners, standout classrooms, and house champions for weekly or monthly assemblies.',
      icon: Trophy,
      color: 'bg-yellow-500/10 text-yellow-600 border-yellow-300 dark:text-yellow-400',
      steps: [
        'Recognize students demonstrating consistent positive behavior.',
        'Filter standings by grade, classroom, or time period.',
        'Perfect for morning announcements and celebratory school assemblies.',
      ],
      actionLabel: 'Open Hall of Fame',
      getHref: (s) => `/${s}/hall-of-fame`,
    },
    {
      id: 'displays',
      title: 'Hallway TVs & Big Screens',
      category: 'spirit',
      categoryLabel: 'School Spirit & TVs',
      summary: 'Turn hallway or cafeteria TVs into live digital celebration screens with zero maintenance needed.',
      icon: Tv,
      color: 'bg-teal-500/10 text-teal-600 border-teal-300 dark:text-teal-400',
      steps: [
        'Open the display link on any smart TV or browser in full screen.',
        'Rotating slides display house standings, milestones, and celebration banners.',
        'Updates automatically in real time whenever points are awarded.',
      ],
      actionLabel: 'Open Smart Screens',
      getHref: (s) => `/${s}/smart-screen`,
    },
    {
      id: 'classroom',
      title: 'Classroom Seating & Quick Praise',
      category: 'classroom',
      categoryLabel: 'Classroom & Family',
      summary: 'Interactive classroom floorplan where teachers arrange desks and reward whole tables or groups in one tap.',
      icon: LayoutDashboard,
      color: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:text-blue-400',
      steps: [
        'Drag and drop student desks into rows, pairs, or cooperative clusters.',
        'Award points to an entire table or group with a single tap.',
        'Take quick visual attendance with cheerful confirmation chimes.',
      ],
      actionLabel: 'Open Classroom Floorplan',
      getHref: (s) => `/${s}/classroom`,
    },
    {
      id: 'family',
      title: 'Parent & Family Home Access',
      category: 'classroom',
      categoryLabel: 'Classroom & Family',
      summary: 'Connect home and school by allowing families to view their child\'s points, earned badges, and praise notes.',
      icon: Home,
      color: 'bg-orange-500/10 text-orange-600 border-orange-300 dark:text-orange-400',
      steps: [
        'Parents log in from home to see positive teacher feedback.',
        'Keeps families engaged in celebrating their student\'s progress.',
        'Simple, secure sign-in with student ID or QR code.',
      ],
      actionLabel: 'Open Family Portals',
      getHref: (s) => `/${s}/admin?tab=family`,
    },
    {
      id: 'library',
      title: 'School Library & Book Lending',
      category: 'classroom',
      categoryLabel: 'Classroom & Family',
      summary: 'Integrated library checkout station for scanning barcodes, managing loans, and organizing reading shelves.',
      icon: BookOpen,
      color: 'bg-cyan-500/10 text-cyan-600 border-cyan-300 dark:text-cyan-400',
      steps: [
        'Search your book catalog, sort by reading levels, and print shelf labels.',
        'Fast barcode check-in and check-out at the librarian desk.',
        'Students borrow and return books independently at the kiosk station.',
      ],
      actionLabel: 'Open School Library',
      getHref: (s) => `/${s}/library`,
    },
  ];

  const categories = [
    { id: 'all', label: 'All Topics' },
    { id: 'essentials', label: 'Core Essentials' },
    { id: 'points', label: 'Praise & Tickets' },
    { id: 'spirit', label: 'School Spirit & TVs' },
    { id: 'classroom', label: 'Classroom & Family' },
  ];

  const filteredTopics = topics.filter((t) => {
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.steps.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAction = (topic: RewardsGuideTopic) => {
    playSound('click');
    handleOpenChange(false);
    if (schoolId) {
      router.push(topic.getHref(schoolId));
    }
  };

  return (
    <>
      {trigger !== undefined ? (
        trigger
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(true)}
          title="LevelUp Rewards Guide & Handbook"
          aria-label="Rewards Guide"
          className="h-8 rounded-full border-border/80 px-3 text-xs font-bold gap-1.5 shadow-xs shrink-0 hover:bg-muted/80 transition-all hover:-translate-y-0.5"
        >
          <Compass className="h-4 w-4 text-primary shrink-0" />
          <span className="hidden sm:inline">Guide</span>
        </Button>
      )}

      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          overlayClassName="bg-black/15 backdrop-blur-[0.5px] cursor-pointer"
          onPointerDownOutside={() => handleOpenChange(false)}
          onInteractOutside={() => handleOpenChange(false)}
          className="w-full sm:max-w-xl flex flex-col p-0 gap-0 h-[100dvh] max-h-[100dvh] bg-background text-foreground shadow-2xl border-l border-border"
        >
          {/* Header */}
          <div className="p-5 border-b border-border/70 space-y-3 shrink-0 bg-muted/20 pr-12">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <SheetTitle className="text-xl font-black flex items-center gap-2 text-foreground">
                  <Compass className="h-5 w-5 text-primary" />
                  LevelUp Rewards Guide
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Browse reward tools, learn how they work, and jump straight to any section.
                </SheetDescription>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search topics (e.g. points, prizes, tickets, kiosk, houses)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Topics List */}
          <ScrollArea className="flex-1 p-5">
            <div className="space-y-4 pb-8">
              {filteredTopics.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Layers className="h-10 w-10 mx-auto text-muted-foreground/40" />
                  <p className="text-sm font-bold text-foreground">No matching topics found</p>
                  <p className="text-xs text-muted-foreground">Try typing another word like "tickets", "prizes", or "kiosk".</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="rounded-full text-xs font-semibold mt-2 cursor-pointer"
                  >
                    Clear search filters
                  </Button>
                </div>
              ) : (
                filteredTopics.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <Card
                      key={topic.id}
                      className="border border-border/80 bg-card/90 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden"
                    >
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={cn(
                                'h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs',
                                topic.color,
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-bold text-sm sm:text-base leading-snug text-foreground">
                                {topic.title}
                              </h3>
                              <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/60 py-0 px-1.5 mt-0.5">
                                {topic.categoryLabel}
                              </Badge>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleAction(topic)}
                            className="rounded-full h-8 px-3 text-xs font-bold shrink-0 shadow-xs gap-1 cursor-pointer"
                          >
                            <span>{topic.actionLabel}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>

                        <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed">
                          {topic.summary}
                        </p>

                        <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 border border-border/40">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                            Key Features:
                          </p>
                          <ul className="space-y-1">
                            {topic.steps.map((step, i) => (
                              <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
