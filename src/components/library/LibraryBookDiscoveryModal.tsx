'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Compass,
  Search,
  BookOpen,
  MapPin,
  Star,
  CheckCircle2,
  Heart,
  X,
  Sparkles,
  Shuffle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { resolveBookClassification, getActiveLibraryGenres } from '@/lib/library/libraryClassification';
import { pickReadableOn } from '@/lib/themeContrast';
import { formatDueDate } from '@/lib/library/libraryPolicy';
import type { LibraryItem } from '@/lib/types';
import type { BookRecommendation } from '@/lib/library/libraryRecommendations';
import { useSettings } from '@/components/providers/SettingsProvider';

type DiscoveryMode = 'forYou' | 'browse' | 'suggest';

/** Friendly emoji per default genre id, shown as a quick pick in the suggestion quiz. */
const GENRE_MOOD_EMOJI: Record<string, string> = {
  fiction: '📖',
  science: '🔬',
  history: '🏛️',
  mystery: '🔎',
  fantasy_scifi: '🚀',
  biography: '🌟',
  graphic_novel: '💥',
  arts_music: '🎨',
  early_reader: '🐣',
  reference: '📚',
  hebrew_judaica: '✡️',
  general: '📗',
};

/** Kid-friendlier phrasing than the catalog's formal genre labels, used only in the quiz. */
const QUIZ_GENRE_LABELS: Record<string, string> = {
  fiction: 'Just a Good Story',
  mystery: 'Mystery & Clues',
  fantasy_scifi: 'Magic & Space',
  graphic_novel: 'Comics & Pictures',
  science: 'Science & Nature',
  history: 'History & Places',
  biography: 'Amazing People',
  reference: 'Facts & Lists',
};

/** Two broad "families" asked about first, each narrowing to a handful of specific genres. */
const QUIZ_FAMILIES = {
  fiction: {
    label: 'Made-Up Stories',
    emoji: '🐉',
    genreIds: ['fantasy_scifi', 'mystery', 'graphic_novel', 'fiction'],
  },
  nonfiction: {
    label: 'Real & True',
    emoji: '🔭',
    genreIds: ['science', 'history', 'biography', 'reference'],
  },
} as const;

type QuizFamily = keyof typeof QUIZ_FAMILIES;
type QuizStep = 'family' | 'genre' | 'results';

export function LibraryBookDiscoveryModal({
  isOpen,
  setIsOpen,
  catalogItems = [],
  studentFirstName,
  recommendations = [],
  hasPersonalHistory = false,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  catalogItems: LibraryItem[];
  studentFirstName?: string;
  recommendations?: BookRecommendation[];
  hasPersonalHistory?: boolean;
}) {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedBook, setSelectedBook] = useState<LibraryItem | null>(null);
  const [mode, setMode] = useState<DiscoveryMode>('browse');
  const showForYou = Boolean(studentFirstName) || recommendations.length > 0;
  const [quizStep, setQuizStep] = useState<QuizStep>('family');
  const [quizFamily, setQuizFamily] = useState<QuizFamily | null>(null);
  const [suggestGenreIds, setSuggestGenreIds] = useState<string[] | null>(null);
  const [pickSeed, setPickSeed] = useState(0);

  function resetQuiz() {
    setQuizStep('family');
    setQuizFamily(null);
    setSuggestGenreIds(null);
  }

  useEffect(() => {
    if (!isOpen) return;
    setMode(showForYou && recommendations.length > 0 ? 'forYou' : 'browse');
  }, [isOpen, showForYou, recommendations.length]);

  // Deduplicate catalog by title/ISBN so copies don't clutter discovery
  const uniqueTitles = useMemo(() => {
    const map = new Map<string, { item: LibraryItem; totalCopies: number; availableCopies: number }>();
    catalogItems.forEach(item => {
      if (item.archived) return;
      const key = (item.isbn || item.name).toLowerCase().trim();
      const existing = map.get(key);
      const isAvail = item.status === 'available' && (!item.condition || item.condition === 'good');
      if (!existing) {
        map.set(key, {
          item,
          totalCopies: 1,
          availableCopies: isAvail ? 1 : 0,
        });
      } else {
        existing.totalCopies += 1;
        if (isAvail) existing.availableCopies += 1;
        // Prefer item with coverUrl
        if (!existing.item.coverUrl && item.coverUrl) {
          existing.item = item;
        }
      }
    });
    return Array.from(map.values());
  }, [catalogItems]);

  const personalPicks = useMemo(() => {
    return recommendations
      .map((rec) => {
        const match =
          uniqueTitles.find((entry) => entry.item.id === rec.id) ||
          uniqueTitles.find((entry) => entry.item.name.trim().toLowerCase() === rec.name.trim().toLowerCase());
        if (!match) {
          return {
            item: {
              id: rec.id,
              name: rec.name,
              upc: rec.id,
              status: 'available' as const,
              author: rec.author,
              category: rec.category,
              shelfLocation: rec.shelfLocation,
              coverUrl: rec.coverUrl,
            },
            totalCopies: 1,
            availableCopies: 1,
            reason: rec.reason,
          };
        }
        return { ...match, reason: rec.reason };
      });
  }, [recommendations, uniqueTitles]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    catalogItems.forEach(i => {
      if (i.category?.trim() && !i.archived) set.add(i.category.trim());
    });
    return ['all', ...Array.from(set).sort()];
  }, [catalogItems]);

  // "What do you like?" quiz — buckets available titles by genre so a student who
  // isn't sure what to read can answer a couple of quick questions instead of searching.
  const activeGenreConfigs = useMemo(
    () => getActiveLibraryGenres(settings.libraryGenreDefinitions),
    [settings.libraryGenreDefinitions],
  );

  const { genreCounts, totalAvailable } = useMemo(() => {
    const counts = new Map<string, number>();
    let total = 0;
    uniqueTitles.forEach(({ item, availableCopies }) => {
      if (availableCopies <= 0) return;
      total += 1;
      const classification = resolveBookClassification(item.category, settings.libraryGenreDefinitions, item.shelfLocation);
      counts.set(classification.genre.id, (counts.get(classification.genre.id) || 0) + 1);
    });
    return { genreCounts: counts, totalAvailable: total };
  }, [uniqueTitles, settings.libraryGenreDefinitions]);

  const genreConfigById = useMemo(() => {
    const map = new Map(activeGenreConfigs.map(g => [g.id, g] as const));
    return map;
  }, [activeGenreConfigs]);

  // How many available books sit in each "family" (Made-Up Stories / Real & True),
  // so a family with nothing on the shelf can be skipped instead of dead-ending the quiz.
  const familyCounts = useMemo(() => {
    const result: Record<QuizFamily, number> = { fiction: 0, nonfiction: 0 };
    (Object.keys(QUIZ_FAMILIES) as QuizFamily[]).forEach(family => {
      result[family] = QUIZ_FAMILIES[family].genreIds.reduce((sum, id) => sum + (genreCounts.get(id) || 0), 0);
    });
    return result;
  }, [genreCounts]);

  const genreOptionsForFamily = (family: QuizFamily) =>
    QUIZ_FAMILIES[family].genreIds
      .map(id => ({ genre: genreConfigById.get(id), count: genreCounts.get(id) || 0 }))
      .filter((o): o is { genre: NonNullable<typeof o.genre>; count: number } => Boolean(o.genre) && o.count > 0);

  const suggestions = useMemo(() => {
    if (mode !== 'suggest' || quizStep !== 'results') return [];
    const pool = uniqueTitles.filter(({ item, availableCopies }) => {
      if (availableCopies <= 0) return false;
      if (!suggestGenreIds) return true;
      const classification = resolveBookClassification(item.category, settings.libraryGenreDefinitions, item.shelfLocation);
      return suggestGenreIds.includes(classification.genre.id);
    });
    const shuffled = [...pool].sort((a, b) => {
      const scoreA = (a.item.ratingAvg ?? 0) + Math.random() * 2;
      const scoreB = (b.item.ratingAvg ?? 0) + Math.random() * 2;
      return scoreB - scoreA;
    });
    return shuffled.slice(0, 3);
    // pickSeed is a deliberate dependency: bumping it re-rolls the shuffle above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, quizStep, suggestGenreIds, uniqueTitles, settings.libraryGenreDefinitions, pickSeed]);

  const filteredTitles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return uniqueTitles.filter(({ item, availableCopies }) => {
      if (availableOnly && availableCopies <= 0) return false;
      if (selectedGenre !== 'all' && item.category !== selectedGenre) return false;
      if (!term) return true;
      return [item.name, item.author, item.category, item.shelfLocation, item.description, item.readingLevel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [uniqueTitles, searchTerm, selectedGenre, availableOnly]);

  function renderBookCard({
    item,
    totalCopies,
    availableCopies,
    reason,
  }: {
    item: LibraryItem;
    totalCopies: number;
    availableCopies: number;
    reason?: string;
  }) {
    const classification = resolveBookClassification(item.category, settings.libraryGenreDefinitions, item.shelfLocation);
    const isAvailable = availableCopies > 0;

    return (
      <div
        key={item.id}
        onClick={() => setSelectedBook(item)}
        className="rounded-2xl border p-3 bg-card hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex gap-3 text-left group"
      >
        {/* Book Cover Thumbnail */}
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted/30 shadow-inner flex items-center justify-center">
          {item.coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.coverUrl}
              alt={item.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <div
              className="h-full w-full flex flex-col items-center justify-center p-1.5 text-center text-[10px] font-bold"
              style={{ backgroundColor: classification.color, color: pickReadableOn(classification.color) }}
            >
              <BookOpen className="h-5 w-5 mb-1 opacity-80" />
              <span className="line-clamp-2 leading-tight">{item.name}</span>
            </div>
          )}
        </div>

        {/* Book Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {reason ? (
              <p className="mb-1 text-[10px] font-bold leading-snug text-primary">{reason}</p>
            ) : null}
            <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {item.name}
            </h4>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {item.author || 'Author not recorded'}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {item.readingLevel && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                  Level {item.readingLevel}
                </Badge>
              )}
              {item.pageCount && (
                <span className="text-[10px] text-muted-foreground">{item.pageCount} pages</span>
              )}
              {(item.ratingAvg ?? 0) > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                  <Star className="h-2.5 w-2.5 fill-amber-400" />
                  {item.ratingAvg}
                </span>
              )}
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
              <MapPin className="h-3 w-3 shrink-0 text-primary" />
              <span className="truncate">{classification.shelfLocation}</span>
            </div>
            <div className="mt-1">
              {isAvailable ? (
                <Badge variant="default" className="text-[9px] bg-emerald-600 hover:bg-emerald-600 font-bold px-1.5 py-0">
                  {availableCopies} of {totalCopies} on shelf
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] font-medium px-1.5 py-0 text-muted-foreground">
                  All on loan
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <DialogTitle>
              {showForYou
                ? studentFirstName
                  ? `Picks for ${studentFirstName}`
                  : 'Picks for you'
                : 'Find & Discover Books'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {showForYou
              ? hasPersonalHistory
                ? 'Based on what you have read and how you rated them, we think these would be good for you.'
                : 'Here are some books we think you might like. Rate the ones you finish and these picks get better.'
              : 'Browse library books, find where they are shelved, and check if copies are available right now.'}
          </DialogDescription>
        </DialogHeader>

        {/* Browse vs. "not sure what to read" mode switch */}
        <div className="flex flex-col gap-1.5 rounded-xl border bg-muted/40 p-1 sm:flex-row">
          {showForYou ? (
            <Button
              type="button"
              variant={mode === 'forYou' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-10 w-full flex-1 gap-1.5 rounded-lg text-xs font-bold sm:w-auto"
              onClick={() => setMode('forYou')}
            >
              <Heart className="h-3.5 w-3.5" />
              For you
            </Button>
          ) : null}
          <Button
            type="button"
            variant={mode === 'browse' ? 'default' : 'ghost'}
            size="sm"
            className="min-h-10 w-full flex-1 gap-1.5 rounded-lg text-xs font-bold sm:w-auto"
            onClick={() => setMode('browse')}
          >
            <Search className="h-3.5 w-3.5" />
            Browse
          </Button>
          <Button
            type="button"
            variant={mode === 'suggest' ? 'default' : 'ghost'}
            size="sm"
            className="min-h-10 w-full flex-1 gap-1.5 rounded-lg text-xs font-bold sm:w-auto"
            onClick={() => {
              if (mode !== 'suggest') resetQuiz();
              setMode('suggest');
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Not Sure? Get a Pick
          </Button>
        </div>

        {mode === 'forYou' ? (
          <div className="space-y-3">
            {personalPicks.length ? (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.08 } },
                }}
              >
                {personalPicks.map((pick) => (
                  <motion.div
                    key={pick.item.id}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: {
                        opacity: 1,
                        y: 0,
                        transition: { type: 'spring', stiffness: 380, damping: 28 },
                      },
                    }}
                  >
                    {renderBookCard(pick)}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
                <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="font-semibold text-sm">No personal picks yet</p>
                <p className="text-xs text-muted-foreground">
                  Browse the shelves or try the quiz, then rate books you finish.
                </p>
              </div>
            )}
          </div>
        ) : mode === 'suggest' ? (
          <div className="space-y-4">
            {totalAvailable === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="font-semibold text-sm">Nothing on the shelf right now</p>
                <p className="text-xs text-muted-foreground">Every copy is currently checked out.</p>
              </div>
            ) : quizStep === 'family' ? (
              <>
                <p className="text-sm font-semibold text-foreground text-center">
                  What kind of book sounds good today?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(Object.keys(QUIZ_FAMILIES) as QuizFamily[])
                    .filter(family => familyCounts[family] > 0)
                    .map(family => {
                      const config = QUIZ_FAMILIES[family];
                      return (
                        <button
                          key={family}
                          type="button"
                          onClick={() => {
                            setQuizFamily(family);
                            setQuizStep('genre');
                          }}
                          className="flex flex-col items-center gap-1 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <span className="text-3xl">{config.emoji}</span>
                          <span className="text-sm font-bold leading-tight text-foreground">{config.label}</span>
                          <span className="text-[10px] text-muted-foreground">{familyCounts[family]} on shelf</span>
                        </button>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestGenreIds(null);
                      setQuizStep('results');
                      setPickSeed(s => s + 1);
                    }}
                    className="flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ borderColor: '#DB277755', backgroundColor: '#DB27770f' }}
                  >
                    <span className="text-3xl">🎲</span>
                    <span className="text-sm font-bold leading-tight" style={{ color: '#DB2777' }}>
                      Surprise Me
                    </span>
                    <span className="text-[10px] text-muted-foreground">{totalAvailable} on shelf</span>
                  </button>
                </div>
              </>
            ) : quizStep === 'genre' && quizFamily ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    onClick={() => {
                      setQuizStep('family');
                      setQuizFamily(null);
                    }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                </div>
                <p className="text-sm font-semibold text-foreground text-center">
                  {quizFamily === 'fiction' ? 'What kind of adventure?' : 'What are you curious about?'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {genreOptionsForFamily(quizFamily).map(({ genre, count }) => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => {
                        setSuggestGenreIds([genre.id]);
                        setQuizStep('results');
                        setPickSeed(s => s + 1);
                      }}
                      className="flex flex-col items-center gap-1 rounded-2xl border-2 p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ borderColor: `${genre.color}55`, backgroundColor: `${genre.color}0f` }}
                    >
                      <span className="text-2xl">{GENRE_MOOD_EMOJI[genre.id] ?? '📕'}</span>
                      <span className="text-xs font-bold leading-tight" style={{ color: genre.color }}>
                        {QUIZ_GENRE_LABELS[genre.id] ?? genre.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{count} on shelf</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setSuggestGenreIds(QUIZ_FAMILIES[quizFamily].genreIds.slice());
                      setQuizStep('results');
                      setPickSeed(s => s + 1);
                    }}
                    className="flex flex-col items-center gap-1 rounded-2xl border-2 border-dashed p-3.5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="text-2xl">🎲</span>
                    <span className="text-xs font-bold leading-tight text-foreground">Any of these</span>
                    <span className="text-[10px] text-muted-foreground">{familyCounts[quizFamily]} on shelf</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    onClick={() => (quizFamily ? setQuizStep('genre') : resetQuiz())}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg text-xs font-semibold"
                      onClick={() => setPickSeed(s => s + 1)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try Another Pick
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-xs font-semibold text-muted-foreground"
                      onClick={resetQuiz}
                    >
                      Start Over
                    </Button>
                  </div>
                </div>

                {suggestions.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suggestions.map(renderBookCard)}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
                    <Shuffle className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="font-semibold text-sm">No matches on the shelf right now</p>
                    <p className="text-xs text-muted-foreground">Try a different pick, or check back soon.</p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search bar & Quick Filters */}
            <div className="flex flex-wrap gap-2.5">
              <div className="relative min-w-56 flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, author, genre, or keyword..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 text-sm rounded-xl"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <Button
                variant={availableOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAvailableOnly(v => !v)}
                className="rounded-xl text-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Available Now Only
              </Button>
            </div>

            {/* Genre chips */}
            {genres.length > 2 && (
              <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
                {genres.map(g => (
                  <Button
                    key={g}
                    variant={selectedGenre === g ? 'default' : 'secondary'}
                    size="sm"
                    onClick={() => setSelectedGenre(g)}
                    className="h-7 text-xs rounded-lg px-2.5"
                  >
                    {g === 'all' ? 'All Genres' : g}
                  </Button>
                ))}
              </div>
            )}

            {/* Book Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTitles.map(renderBookCard)}
            </div>

            {!filteredTitles.length && (
              <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
                <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="font-semibold text-sm">No books found</p>
                <p className="text-xs text-muted-foreground">
                  Try searching for a different word or clear the filter.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Book Details Sub-Dialog / Drawer */}
        {selectedBook && (
          <Dialog open={Boolean(selectedBook)} onOpenChange={open => !open && setSelectedBook(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg leading-tight">{selectedBook.name}</DialogTitle>
                <DialogDescription>{selectedBook.author || 'Author not recorded'}</DialogDescription>
              </DialogHeader>

              <div className="flex gap-4 items-start">
                <div className="h-36 w-24 shrink-0 rounded-xl overflow-hidden border shadow-sm bg-muted/20">
                  {selectedBook.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selectedBook.coverUrl} alt={selectedBook.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  <div className="rounded-xl border bg-primary/5 p-2.5 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> Shelf Location
                    </p>
                    <p className="font-black text-sm text-foreground">{selectedBook.shelfLocation || 'Main Stacks'}</p>
                    <p className="text-muted-foreground text-[11px]">Category: {selectedBook.category || 'General'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedBook.readingLevel && (
                      <Badge variant="outline">Reading Level: {selectedBook.readingLevel}</Badge>
                    )}
                    {selectedBook.pageCount && (
                      <Badge variant="outline">{selectedBook.pageCount} Pages</Badge>
                    )}
                    {selectedBook.publishedYear && (
                      <Badge variant="outline">Year: {selectedBook.publishedYear}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {selectedBook.description && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Synopsis</p>
                  <p className="text-xs leading-relaxed text-foreground/90 max-h-36 overflow-y-auto rounded-xl border bg-muted/20 p-3">
                    {selectedBook.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedBook(null)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
