'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Sparkles, Loader2 } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { globalAnimatedBackdropActive } from '@/lib/animatedBackdrop';
import { DEFAULT_BULLETIN_SUBTITLE, bulletinLogoBoxClass, getBulletinBoardCardClassName } from '@/lib/bulletinBoard';

type BulletinIncentive = {
  id: string;
  title: string;
  description: string;
  points: number;
  icon?: string;
  active?: boolean;
};

/** Staff and school accounts only - not the signed-in student kiosk. */
const VIEWER_LOGIN_STATES = new Set([
  'teacher',
  'admin',
  'school',
  'developer',
  'secretary',
  'prizeClerk',
  'reports',
]);

export default function BulletinBoardViewPage() {
  const { loginState, isInitialized, schoolId } = useAppContext();
  const router = useRouter();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const animBackdrop = globalAnimatedBackdropActive(settings);

  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ logoUrl?: string }>(schoolDocRef);

  const bulletinQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives')) : null),
    [firestore, schoolId],
  );
  const { data: bulletinIncentives, isLoading } = useCollection<BulletinIncentive>(bulletinQuery);

  const sortedBulletin = useMemo(() => {
    if (!bulletinIncentives?.length) return [];
    return [...bulletinIncentives].sort(
      (a, b) => ((b as { createdAt?: number }).createdAt ?? 0) - ((a as { createdAt?: number }).createdAt ?? 0),
    );
  }, [bulletinIncentives]);

  useEffect(() => {
    if (isInitialized && !VIEWER_LOGIN_STATES.has(loginState)) {
      router.replace('/login');
    }
  }, [isInitialized, loginState, router]);

  const bulletinEnabled = settings.bulletinEnabled !== false;
  const bulletinTitle = settings.bulletinTitle || 'School Bulletin Board';
  const bulletinSubtitle = (settings.bulletinSubtitle ?? '').trim() || DEFAULT_BULLETIN_SUBTITLE;
  const schoolLogoUrl = schoolMeta?.logoUrl;
  const logoSize = settings.bulletinLogoSize || 'md';

  if (!isInitialized || !VIEWER_LOGIN_STATES.has(loginState)) {
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

  return (
    <div
      className={cn(
        'min-h-screen text-foreground font-sans p-4 md:p-8 max-w-3xl mx-auto',
        animBackdrop ? 'bg-transparent' : 'bg-background',
      )}
    >
      {!bulletinEnabled ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              Bulletin board is off
            </CardTitle>
            <CardDescription>An administrator can enable it in Admin, Bulletin Board.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card
          className={cn(
            getBulletinBoardCardClassName(settings.bulletinTheme),
          )}
        >
          <CardHeader className="pb-3 border-b flex flex-col md:flex-row justify-between md:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {schoolLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={schoolLogoUrl}
                  alt="School logo"
                  className={cn(
                    bulletinLogoBoxClass(logoSize),
                    'object-contain rounded-xl bg-white/30 backdrop-blur-md p-1 shrink-0',
                  )}
                />
              ) : (
                <div
                  className={cn(
                    bulletinLogoBoxClass(logoSize),
                    'rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary flex-shrink-0 shadow-md',
                  )}
                >
                  🏫
                </div>
              )}
              <div className="min-w-0">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-500 shrink-0" />
                  {bulletinTitle}
                </CardTitle>
                <CardDescription className="text-[10px] font-medium opacity-70 line-clamp-2">
                  {bulletinSubtitle}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3 pb-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : sortedBulletin.filter((i) => i.active !== false).length > 0 ? (
              <div
                className={cn(
                  'grid gap-3',
                  settings.bulletinColumns === '1' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
                )}
              >
                {sortedBulletin
                  .filter((i) => i.active !== false)
                  .map((inc) => (
                    <div
                      key={inc.id}
                      className="p-3 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/10 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl select-none" role="img" aria-label="incentive">
                          {inc.icon || '🎯'}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs md:text-sm leading-tight truncate">{inc.title}</h5>
                          <p className="text-[10px] opacity-70 leading-relaxed mt-0.5 break-words line-clamp-3">
                            {inc.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded-full shrink-0 border border-emerald-500/30">
                        +{inc.points} PTS
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 opacity-70 flex flex-col items-center justify-center gap-2">
                <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                <span className="text-xs font-bold">No active incentives on the board yet</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
