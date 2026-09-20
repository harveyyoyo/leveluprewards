'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Search,
  BookOpen,
  Library,
  Monitor,
  Camera,
  Printer,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  ExternalLink,
  BookMarked,
  CheckCircle2,
  X,
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
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LibraryHeaderTab } from './LibraryHeaderBar';
import type { LibraryTheme } from '@/lib/library/libraryThemes';
import { cn } from '@/lib/utils';

export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  icon: typeof Library;
  color: string;
  steps: string[];
  actionLabel?: string;
  actionTab?: LibraryHeaderTab;
  onSpecialAction?: () => void;
}

export interface LibraryInteractiveGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: LibraryTheme;
  onNavigateTab: (tab: LibraryHeaderTab) => void;
  onStartTour?: (tourId: 'library' | 'library-features') => void;
  onOpenDiscoveryModal?: () => void;
}

export function LibraryInteractiveGuide({
  open,
  onOpenChange,
  theme,
  onNavigateTab,
  onStartTour,
  onOpenDiscoveryModal,
}: LibraryInteractiveGuideProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const topics: GuideTopic[] = [
    {
      id: 'desk',
      title: 'Librarian Desk',
      summary: 'The main command desk for helping students, checking books in and out, and seeing overdue books.',
      icon: Library,
      color: 'bg-sky-500/10 text-sky-600 border-sky-300 dark:text-sky-400',
      steps: [
        'Type any student name or book title into the search bar for instant results.',
        'View live status: see which books are currently borrowed or waiting on the shelf.',
        'One-click return: quickly check books back in and mark them available.',
      ],
      actionLabel: 'Open Librarian Desk',
      actionTab: 'desk',
    },
    {
      id: 'catalog',
      title: 'Book Catalog',
      summary: 'Your entire school book collection lives here. Search titles, sort by authors, and print shelf labels.',
      icon: BookOpen,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:text-emerald-400',
      steps: [
        'Browse every book in your collection in grid or table view.',
        'Filter by shelf location, reading level, genre, or availability.',
        'Sort alphabetically, by author, or by newest added books.',
      ],
      actionLabel: 'Open Book Catalog',
      actionTab: 'catalog',
    },
    {
      id: 'kiosk',
      title: 'Student Self-Checkout Station',
      summary: 'A dedicated station where students scan their own badge and book barcode to borrow books independently.',
      icon: Monitor,
      color: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:text-amber-400',
      steps: [
        'Students scan their student ID card or type their name.',
        'Scan the book barcode: celebratory chimes confirm the loan.',
        'Kids can view books currently on loan and leave star ratings when finished.',
      ],
      actionLabel: 'Open Student Kiosk',
      actionTab: 'kiosk',
    },
    {
      id: 'suggestions',
      title: 'Smart Suggestions & Book Finder Quiz',
      summary: 'Help students discover their next favorite book through personalized picks and a fun 2-question quiz.',
      icon: Sparkles,
      color: 'bg-purple-500/10 text-purple-600 border-purple-300 dark:text-purple-400',
      steps: [
        'Personalized Picks: automatically recommends books based on what students liked before.',
        'Book Finder Quiz: asks 2 quick mood questions to match books waiting on the shelf.',
        'Instant Search Suggestions: drops down matching books as soon as you type.',
      ],
      actionLabel: onOpenDiscoveryModal ? 'Try Book Finder Quiz 🧭' : 'Go to Student Kiosk',
      actionTab: 'kiosk',
      onSpecialAction: onOpenDiscoveryModal,
    },
    {
      id: 'camera_scanner',
      title: 'Camera & Barcode Book Lookup',
      summary: 'Hold any book barcode up to your camera. The system auto-loads the cover, author, summary, and page count!',
      icon: Camera,
      color: 'bg-rose-500/10 text-rose-600 border-rose-300 dark:text-rose-400',
      steps: [
        'Open the Catalog and click "Add Book".',
        'Scan the barcode on the back cover with your webcam or handheld scanner.',
        'Title, author, cover photo, and book summary are filled in automatically with zero typing.',
      ],
      actionLabel: 'Go to Catalog to Add Books',
      actionTab: 'catalog',
    },
    {
      id: 'labels',
      title: 'Printable Spine Labels & Barcodes',
      summary: 'Print barcode stickers and spine call-number tags directly from your browser on standard label sheets.',
      icon: Printer,
      color: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:text-blue-400',
      steps: [
        'Select any book in the Catalog and click "Print Labels".',
        'Choose circular stickers, spine call numbers, or cover barcodes.',
        'Print directly onto standard peel-and-stick label paper.',
      ],
      actionLabel: 'Open Catalog Labels',
      actionTab: 'catalog',
    },
    {
      id: 'levels_genres',
      title: 'Reading Levels & Color Genres',
      summary: 'Organize your shelves by Guided Reading letters, Lexile levels, or color-coded genre tags.',
      icon: Layers,
      color: 'bg-teal-500/10 text-teal-600 border-teal-300 dark:text-teal-400',
      steps: [
        'Assign reading levels (A-Z Guided Reading or Lexile) to match student reading goals.',
        'Pick from colorful genre tags like Mystery, Fantasy, Science, and Comics.',
        'Help students find books that match their reading stage with ease.',
      ],
      actionLabel: 'Browse Shelves & Genres',
      actionTab: 'catalog',
    },
    {
      id: 'rules_audits',
      title: 'Borrowing Rules & Shelf Audits',
      summary: 'Set how many books students can borrow, customize due dates, and run quick shelf audits to spot missing books.',
      icon: Clock,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-300 dark:text-indigo-400',
      steps: [
        'Configure max loans (e.g. 2 books for 14 days) in Library Settings.',
        'Automated Overdues: see which students need a friendly return reminder.',
        'Shelf Audit: walk the aisles scanning barcodes to find misplaced or missing books in minutes.',
      ],
      actionLabel: 'Open Library Settings',
      actionTab: 'settings',
    },
    {
      id: 'ai_helper',
      title: 'Ask the Library Helper',
      summary: 'The same kind of helper LevelUp has — a sparkle chat that answers library questions in plain words.',
      icon: Sparkles,
      color: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300',
      steps: [
        'Tap Ask in the top bar, or the round sparkle button in the corner.',
        'Ask things like “How do I add a book?” or “Where are overdue titles?”',
        'The helper can see this library’s counts (how many copies are out or late) but will not name students.',
      ],
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

  const handleAction = (topic: GuideTopic) => {
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
        overlayClassName="bg-black/15 backdrop-blur-[0.5px]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="w-full sm:max-w-xl flex flex-col p-0 gap-0 h-[100dvh] max-h-[100dvh] bg-background text-foreground shadow-2xl border-l border-border"
      >
        {/* Header */}
        <div className="p-5 border-b border-border/70 space-y-3 shrink-0 bg-muted/20 pr-12">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-black flex items-center gap-2 text-foreground">
                <Compass className="h-5 w-5 text-primary" />
                Library Guide & Feature Hub
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Browse any library tool, learn how it works, and jump straight to it.
              </SheetDescription>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search topics (e.g. quiz, barcode, labels, return)..."
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
        </div>

        {/* Scrollable Topics List */}
        <ScrollArea className="flex-1 p-5">
          <div className="space-y-4 pb-8">
            {filteredTopics.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <BookMarked className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">No matching topics found</p>
                <p className="text-xs text-muted-foreground">Try typing another word like "catalog", "quiz", or "scanner".</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
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
                          </div>
                        </div>

                        {topic.actionLabel ? (
                          <Button
                            size="sm"
                            onClick={() => handleAction(topic)}
                            className="rounded-full h-8 px-3 text-xs font-bold shrink-0 shadow-xs gap-1"
                          >
                            <span>{topic.actionLabel}</span>
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        ) : null}
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
  );
}
