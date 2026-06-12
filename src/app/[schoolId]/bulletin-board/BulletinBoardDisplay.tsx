'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Megaphone, Sparkles, Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { DEFAULT_BULLETIN_SUBTITLE, bulletinLogoBoxClass, getBulletinBoardCardClassName } from '@/lib/bulletinBoard';
import { getLevelUpLogoHref } from '@/lib/appBranding';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { springCinematic } from '@/lib/animation';

type BulletinIncentive = {
  id: string;
  title: string;
  description: string;
  points: number;
  icon?: string;
  active?: boolean;
};

type BulletinPost = {
  id: string;
  kind?: string;
  emoji?: string;
  title?: string;
  message?: string;
  createdAt?: number;
};

const VIEWER_LOGIN_STATES = new Set([
  'teacher',
  'admin',
  'school',
  'developer',
  'secretary',
  'prizeClerk',
  'reports',
]);

export type BulletinBoardDisplayProps = {
  variant?: 'default' | 'preview';
  previewLayout?: 'landscape' | 'portrait';
};

const LANDSCAPE_STAGE = { width: 1280, height: 720 };
const PORTRAIT_STAGE = { width: 720, height: 1280 };

export default function BulletinBoardDisplay({
  variant = 'default',
  previewLayout = 'landscape',
}: BulletinBoardDisplayProps = {}) {
  const { loginState, isInitialized, schoolId } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const isPreview = variant === 'preview';
  const animBackdrop = !isPreview && globalAnimatedBackdropActive(settings);
  const isFullscreen = !isPreview && (searchParams?.get('fullscreen') || '').trim() === '1';
  const isPortrait = isPreview && previewLayout === 'portrait';
  const stage = isPortrait ? PORTRAIT_STAGE : LANDSCAPE_STAGE;

  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ logoUrl?: string; name?: string }>(schoolDocRef);
  const schoolName =
    schoolMeta?.name ||
    (schoolId ? schoolId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : '');

  const bulletinQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')) : null),
    [firestore, schoolId],
  );
  const { data: bulletinIncentives, isLoading } = useCollection<BulletinIncentive>(bulletinQuery);

  const postsQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(
            collection(firestore, 'schools', schoolId, 'bulletinBoardPosts'),
            orderBy('createdAt', 'desc'),
            limit(10),
          )
        : null,
    [firestore, schoolId],
  );
  const { data: bulletinPosts } = useCollection<BulletinPost>(postsQuery);

  const sortedBulletin = useMemo(() => {
    if (!bulletinIncentives?.length) return [];
    return [...bulletinIncentives].sort(
      (a, b) => ((b as { createdAt?: number }).createdAt ?? 0) - ((a as { createdAt?: number }).createdAt ?? 0),
    );
  }, [bulletinIncentives]);

  useEffect(() => {
    if (isPreview) return;
    if (isInitialized && !VIEWER_LOGIN_STATES.has(loginState)) {
      toast({
        variant: 'destructive',
        title: 'Authorization Required',
        description: 'Please sign in to access the Bulletin Board display.',
      });
      router.replace('/login');
    }
  }, [isPreview, isInitialized, loginState, router, toast]);

  const bulletinEnabled = settings.bulletinEnabled !== false;
  const bulletinTitle = settings.bulletinTitle || 'School Bulletin Board';
  const bulletinSubtitle = (settings.bulletinSubtitle ?? '').trim() || DEFAULT_BULLETIN_SUBTITLE;
  const schoolLogoUrl = schoolMeta?.logoUrl;
  const logoSize = settings.bulletinLogoSize || 'md';
  const showBoard = isPreview || bulletinEnabled;

  if (!isPreview && (!isInitialized || !VIEWER_LOGIN_STATES.has(loginState))) {
    return (
      <div
        className={cn(
          'min-h-screen flex flex-col items-center justify-center gap-3 p-8',
          animBackdrop ? 'bg-transparent' : 'bg-background',
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-medium">Loading bulletin board...</p>
      </div>
    );
  }

  const colorVars = {
    ['--primary' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
    ['--chart-1' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
    ['--chart-2' as string]: complementTripletForNavId('admin', settings.colorScheme),
    ['--chart-3' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
    ['--chart-4' as string]: complementTripletForNavId('admin', settings.colorScheme),
    ['--chart-5' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
    ['--ring' as string]: complementTripletForNavId('admin', settings.colorScheme),
  } as Record<string, string>;

  const boardCard = showBoard ? (
    <Card
      className={cn(
        'w-full shadow-2xl border-t-8 border-indigo-500 backdrop-blur-md',
        getBulletinBoardCardClassName(settings.bulletinTheme),
        // 92 is not on the Tailwind opacity scale, so bg-card/92 compiled to nothing
        // (and tailwind-merge dropped the Card's own bg-card, leaving it transparent).
        animBackdrop ? 'bg-card/90' : 'bg-card/80',
        isPreview && 'shadow-lg',
      )}
    >
      {schoolLogoUrl ? (
        <div className={cn('flex justify-center', isPreview ? 'pt-4' : 'pt-8')}>
          <img
            src={schoolLogoUrl}
            alt="School logo"
            className={cn(
              bulletinLogoBoxClass(logoSize),
              'object-contain rounded-2xl bg-white/30 backdrop-blur-md p-2 shadow-xl shrink-0',
              isPreview && logoSize === 'lg' && 'h-16 w-16',
              isPreview && logoSize === 'md' && 'h-12 w-12',
              isPreview && logoSize === 'sm' && 'h-10 w-10',
            )}
          />
        </div>
      ) : null}
      <CardHeader className={cn('pb-3 text-center', isPreview && 'py-3')}>
        <CardTitle className={cn('font-black flex items-center justify-center gap-2', isPreview ? 'text-sm' : 'text-xl')}>
          Current Opportunities
        </CardTitle>
        <CardDescription className={cn('font-bold uppercase tracking-widest opacity-70', isPreview ? 'text-[9px]' : 'text-xs')}>
          Complete these tasks to earn points
        </CardDescription>
      </CardHeader>
      <CardContent className={cn('pt-3', isPreview ? 'pb-3' : 'pb-6')}>
        {(bulletinPosts || []).length > 0 ? (
          <div className={cn(isPreview ? 'mb-3' : 'mb-5')}>
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-75">Celebrations</p>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                Latest {Math.min(isPreview ? 3 : 10, (bulletinPosts || []).length)}
              </span>
            </div>
            <div className="space-y-2">
              {(bulletinPosts || []).slice(0, isPreview ? 3 : 10).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/40 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="select-none text-2xl" role="img" aria-label="celebration">
                      {p.emoji || '🎉'}
                    </span>
                    <div className="min-w-0">
                      <h5 className="truncate text-xs font-bold leading-tight md:text-sm">{p.title || 'Celebration'}</h5>
                      <p className="mt-0.5 line-clamp-2 break-words text-[10px] leading-relaxed opacity-70">
                        {p.message || ''}
                      </p>
                    </div>
                  </div>
                  {typeof p.createdAt === 'number' ? (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-widest opacity-60">
                      {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedBulletin.filter((i) => i.active !== false).length > 0 ? (
          <div
            className={cn(
              'grid gap-3',
              settings.bulletinColumns === '1' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
              isPreview && settings.bulletinColumns !== '1' && 'sm:grid-cols-2',
            )}
          >
            {sortedBulletin
              .filter((i) => i.active !== false)
              .slice(0, isPreview ? 4 : undefined)
              .map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/40 p-3 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/20"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="select-none text-2xl" role="img" aria-label="incentive">
                      {inc.icon || '🎯'}
                    </span>
                    <div className="min-w-0">
                      <h5 className="truncate text-xs font-bold leading-tight md:text-sm">{inc.title}</h5>
                      <p className="mt-0.5 line-clamp-3 break-words text-[10px] leading-relaxed opacity-70">
                        {inc.description}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-black text-emerald-800 dark:text-emerald-200">
                    +{Number(inc.points ?? 0)} PTS
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center opacity-70">
            <Sparkles className="h-8 w-8 animate-pulse text-indigo-400" />
            <span className="text-xs font-bold">No active incentives on the board yet</span>
          </div>
        )}
      </CardContent>
    </Card>
  ) : (
    <Card className={cn('w-full border-dashed', isFullscreen ? 'max-w-none' : 'max-w-2xl')}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="h-5 w-5 text-muted-foreground" />
          Bulletin board is off
        </CardTitle>
        <CardDescription>An administrator can enable it in Settings → Features → Displays.</CardDescription>
      </CardHeader>
    </Card>
  );

  return (
    <div
      className={cn(
        'text-foreground font-sans flex flex-col',
        isPreview
          ? 'h-full w-full overflow-hidden bg-background'
          : 'min-h-screen',
        !isPreview && (isFullscreen ? 'w-full max-w-none mx-0 p-4 md:p-8' : 'p-4 md:p-8 max-w-4xl mx-auto items-center'),
        !isPreview && (animBackdrop ? 'bg-transparent' : 'bg-background'),
      )}
      style={{
        ...(isPreview ? { width: stage.width, height: stage.height } : {}),
        ...colorVars,
      }}
    >
      <div
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-2xl border bg-card/70 backdrop-blur-md',
          isPreview ? 'mb-2 shrink-0 px-3 py-1.5' : 'mb-6 px-4 py-3',
          isFullscreen && 'max-w-none',
        )}
      >
        {isPreview ? (
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">levelUp EDU</p>
            <p className="truncate text-xs font-bold">{schoolName}</p>
          </div>
        ) : (
          <Link
            href={getLevelUpLogoHref()}
            className="min-w-0 rounded-lg no-underline outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="LevelUp EDU — school sign-in"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">levelUp EDU</p>
            <p className="truncate text-sm font-bold">{schoolName}</p>
          </Link>
        )}
        <div className="shrink-0 rounded-xl border bg-muted/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Bulletin Board
        </div>
      </div>

      {isPreview ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          <div className={cn('w-full text-center', isPortrait ? 'mb-4' : 'mb-5')}>
            <h1 className="mb-2 flex items-center justify-center gap-2 text-xl font-black tracking-tighter text-primary drop-shadow-sm">
              <Megaphone className="h-6 w-6 text-indigo-500" />
              {bulletinTitle}
            </h1>
            <p className="mx-auto max-w-2xl text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              {bulletinSubtitle}
            </p>
          </div>
          {boardCard}
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springCinematic}
            className={cn('w-full text-center mb-10', isFullscreen ? 'max-w-none' : 'max-w-4xl')}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-primary drop-shadow-sm mb-3 flex items-center justify-center gap-3">
              <Megaphone className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-indigo-500" />
              {bulletinTitle}
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] max-w-2xl mx-auto">
              {bulletinSubtitle}
            </p>
          </motion.div>
          {boardCard}
        </>
      )}
    </div>
  );
}
