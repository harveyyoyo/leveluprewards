'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import {
  Camera,
  ExternalLink,
  GraduationCap,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Settings2,
  Wrench,
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/developer/schoolUsageInsights';
import {
  KioskProfileSummary,
  SCHOOL_SCREENS_REQUEST_FIELD,
  SchoolScreenRecord,
  STUDENT_PORTAL_PREVIEW_DEVICE_ID,
} from '@/lib/kiosk/kioskScreenTypes';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

function kioskPreviewUrl(schoolId: string, profileId?: string | null): string {
  const base = `/${schoolId.trim().toLowerCase()}/student`;
  if (!profileId) return base;
  return `${base}?kioskProfileId=${encodeURIComponent(profileId)}`;
}

function studentHomeUrl(schoolId: string): string {
  return `/${schoolId.trim().toLowerCase()}/student-home`;
}

function PreviewFrame({
  src,
  label,
  aspectClass = 'aspect-[9/16]',
}: {
  src: string;
  label: string;
  aspectClass?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold truncate">{label}</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0" asChild>
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden />
            Open
          </a>
        </Button>
      </div>
      <div
        className={cn(
          // Iframe below renders at a fixed 375x812 scaled by 0.46 (~173x374); keep the
          // frame at least that tall so narrow grid cells never clip the preview bottom.
          'relative overflow-hidden rounded-xl border bg-black shadow-inner min-h-[374px] max-h-[420px] mx-auto',
          aspectClass,
        )}
      >
        <iframe
          title={`${label} preview`}
          src={src}
          className="absolute left-1/2 top-0 h-[812px] w-[375px] origin-top -translate-x-1/2 scale-[0.46] border-0 bg-background pointer-events-none"
          loading="lazy"
        />
      </div>
    </div>
  );
}

function LiveSnapshotCard({
  screen,
  generatedAt,
}: {
  screen: SchoolScreenRecord;
  generatedAt: number;
}) {
  const isPortal = screen.surface === 'studentPortal';
  const label = isPortal
    ? screen.studentName?.trim() || 'Student home portal'
    : screen.profileName?.trim() || screen.kioskProfileId || 'Kiosk';

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="relative aspect-[9/16] max-h-[420px] bg-muted/30">
        {screen.snapshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screen.snapshotUrl}
            alt={`Live snapshot for ${label}`}
            className="h-full w-full object-contain object-top bg-black"
          />
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-muted-foreground px-4 text-center">
            No snapshot yet
          </div>
        )}
        <Badge
          variant="outline"
          className={cn(
            'absolute top-2 left-2 text-[10px]',
            isPortal ? 'bg-violet-500/10 border-violet-500/30' : 'bg-sky-500/10 border-sky-500/30',
          )}
        >
          {isPortal ? 'Student portal' : 'Kiosk'}
        </Badge>
      </div>
      <div className="space-y-1 p-3 text-xs">
        <p className="font-bold truncate">{label}</p>
        {isPortal && screen.studentId ? (
          <p className="font-mono text-[10px] text-muted-foreground truncate">Student {screen.studentId}</p>
        ) : (
          <p className="font-mono text-[10px] text-muted-foreground truncate">{screen.deviceId}</p>
        )}
        <p className="text-muted-foreground">
          {formatRelativeTime(screen.capturedAt ?? null, generatedAt)}
          {screen.pathname ? ` · ${screen.pathname}` : ''}
        </p>
      </div>
    </div>
  );
}

export function DeveloperSchoolScreensSheet({
  schoolId,
  schoolName,
  open,
  onOpenChange,
  onOpenSchoolAdmin,
}: {
  schoolId: string;
  schoolName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSchoolAdmin: (schoolId: string) => void | Promise<void>;
}) {
  const firestore = useFirestore();
  const sid = schoolId.trim().toLowerCase();
  const [profiles, setProfiles] = useState<KioskProfileSummary[]>([]);
  const [screens, setScreens] = useState<SchoolScreenRecord[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(() => Date.now());
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!open || !firestore || !sid) {
      return;
    }

    setLoadingMeta(true);
    const schoolRef = doc(firestore, 'schools', sid);
    const unsubSchool = onSnapshot(
      schoolRef,
      (snap) => {
        const appSettings = (snap.data()?.appSettings ?? {}) as {
          kioskProfiles?: Record<string, { id?: string; name?: string }>;
        };
        const raw = appSettings.kioskProfiles ?? {};
        setProfiles(
          Object.values(raw)
            .filter((p) => p?.id)
            .map((p) => ({ id: String(p.id), name: String(p.name || p.id) }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setLoadingMeta(false);
      },
      () => setLoadingMeta(false),
    );

    const screensQuery = query(
      collection(firestore, 'schools', sid, 'schoolScreens'),
      orderBy('capturedAt', 'desc'),
    );
    const unsubScreens = onSnapshot(
      screensQuery,
      (snap) => {
        setScreens(
          snap.docs.map((d) => ({ ...(d.data() as Omit<SchoolScreenRecord, 'deviceId'>), deviceId: d.id })),
        );
        setGeneratedAt(Date.now());
      },
      () => setScreens([]),
    );

    return () => {
      unsubSchool();
      unsubScreens();
    };
  }, [firestore, open, sid]);

  const requestSnapshots = useCallback(async () => {
    if (!firestore || !sid) return;
    setRequesting(true);
    try {
      await updateDoc(doc(firestore, 'schools', sid), {
        [SCHOOL_SCREENS_REQUEST_FIELD]: Date.now(),
      });
    } finally {
      setRequesting(false);
    }
  }, [firestore, sid]);

  const kioskScreens = screens.filter((s) => s.surface !== 'studentPortal');
  const portalScreen =
    screens.find((s) => s.surface === 'studentPortal' && s.deviceId === STUDENT_PORTAL_PREVIEW_DEVICE_ID)
    ?? screens.find((s) => s.surface === 'studentPortal');

  const displayName = schoolName?.trim() || sid;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-base">
            <MonitorSmartphone className="h-5 w-5 text-sky-500" aria-hidden />
            Screens — {displayName}
          </SheetTitle>
          <SheetDescription className="font-mono text-xs">{sid}</SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={requesting}
              onClick={() => void requestSnapshots()}
            >
              {requesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              Request snapshot
            </Button>
            <Button type="button" size="sm" onClick={() => void onOpenSchoolAdmin(sid)}>
              <Wrench className="mr-2 h-4 w-4" />
              Open school admin
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-6 py-5">
            {loadingMeta ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading profiles…
              </div>
            ) : null}

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-violet-500" aria-hidden />
                <h3 className="text-sm font-bold">Student home portal</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Live photo captures the first student who signs in at home (until you request a fresh snapshot).
                Use the embedded preview for the sign-in screen.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {portalScreen ? (
                  <LiveSnapshotCard screen={portalScreen} generatedAt={generatedAt} />
                ) : (
                  <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground flex items-center justify-center min-h-[220px]">
                    No signed-in student snapshot yet. A student must open{' '}
                    <span className="font-semibold text-foreground mx-1">Student home</span> once, or click Request
                    snapshot while someone is signed in.
                  </div>
                )}
                <PreviewFrame src={studentHomeUrl(sid)} label="Sign-in screen (preview)" />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-bold">Kiosk live snapshots</h3>
                <Badge variant="outline" className="tabular-nums">
                  {kioskScreens.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Each kiosk browser sends one photo when the page loads, and again only when you click Request snapshot.
              </p>
              {kioskScreens.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
                  No kiosk photos yet. Open <span className="font-semibold text-foreground">/{sid}/student</span> on a
                  device, or click Request snapshot while that tab is open.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {kioskScreens.map((screen) => (
                    <LiveSnapshotCard key={screen.deviceId} screen={screen} generatedAt={generatedAt} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h3 className="text-sm font-bold">Kiosk profile previews</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 ml-auto"
                  onClick={() => setPreviewKey((k) => k + 1)}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Refresh
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2" key={previewKey}>
                <PreviewFrame src={kioskPreviewUrl(sid)} label="School default" />
                {profiles.map((profile) => (
                  <PreviewFrame
                    key={profile.id}
                    src={kioskPreviewUrl(sid, profile.id)}
                    label={profile.name}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Fix kiosk layout in Admin → Branding → Kiosk profiles. Student portal settings are under Admin →
                Students → Student home portal.
              </p>
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
