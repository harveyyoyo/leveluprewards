'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Book, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { useFirestore, useFunctions, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { computeDaysOverdue, formatDueDate, getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { lookupStudentId } from '@/lib/db/lookup';
import { findLibraryItemByUpc, performLibraryCheckoutOrReturn } from '@/lib/library/libraryOperations';
import { normalizeLibraryUpc } from '@/lib/library/libraryScanCode';
import type { LibraryItem } from '@/lib/types';

function LibraryBookPageInner({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = normalizeLibraryUpc(searchParams.get('code') || '');
  const firestore = useFirestore();
  const functions = useFunctions();
  const { settings } = useSettings();
  const categoriesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'categories') : null),
    [firestore, schoolId],
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);
  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { loginState } = useAppContext();

  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<'checkout' | 'return' | null>(null);
  const cardBuffer = useRef('');
  const cardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!firestore || !schoolId || !code) {
      setLoading(false);
      return;
    }
    void findLibraryItemByUpc(firestore, schoolId, code).then((found) => {
      setItem(found?.item ?? null);
      setLoading(false);
    });
  }, [firestore, schoolId, code]);

  const processStudentCard = useCallback(
    async (badgeId: string) => {
      if (!firestore || !schoolId || !code || busy) return;
      setBusy(true);
      try {
        const studentId = await lookupStudentId(firestore, schoolId, badgeId);
        if (!studentId) {
          playSound('error');
          toast({ variant: 'destructive', title: 'Student not found', description: 'Scan a valid student ID card.' });
          return;
        }
        const result = await performLibraryCheckoutOrReturn(firestore, schoolId, studentId, code, {
          policy: libraryPolicy,
          functions,
        });
        if (result.action === 'checkout') {
          setLastAction('checkout');
          setItem({
            ...result.item,
            status: 'checked_out',
            checkedOutTo: studentId,
            dueAt: result.dueAt ?? result.item.dueAt,
          });
          playSound('success');
          toast({
            title: 'Checked out',
            description: result.dueAt
              ? `${result.item.name} — due ${new Date(result.dueAt).toLocaleDateString()}`
              : result.item.name,
          });
        } else if (result.action === 'return') {
          setLastAction('return');
          setItem({ ...result.item, status: 'available', checkedOutTo: null, checkedOutAt: null });
          playSound('success');
          toast({
            title: 'Returned',
            description: result.pointsMessage || result.item.name,
          });
        } else if (result.action === 'wrong_borrower') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Checked out to someone else',
            description: 'Only the student who borrowed this book can return it here.',
          });
        } else {
          playSound('error');
          toast({ variant: 'destructive', title: 'Book not found' });
        }
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, code, busy, playSound, toast, libraryPolicy, functions],
  );

  const { videoRef, hasCameraPermission, zoom, setZoom } = useBarcodeScanner(
    true,
    (scanned) => void processStudentCard(scanned),
    () => {},
    { cameraEnabled: true, keepCameraWarm: true },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const raw = cardBuffer.current.trim();
        cardBuffer.current = '';
        if (raw) void processStudentCard(raw);
        return;
      }
      if (e.key.length === 1) {
        cardBuffer.current += e.key;
        if (cardTimer.current) clearTimeout(cardTimer.current);
        cardTimer.current = setTimeout(() => {
          cardBuffer.current = '';
        }, 120);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [processStudentCard]);

  if (settings.payLibrary === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Library is not enabled.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!code || !item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Book not found in the library catalog.</p>
        <Button variant="outline" className="rounded-xl" onClick={() => router.push(`/${schoolId}/student`)}>
          Back to kiosk
        </Button>
      </div>
    );
  }

  const isOut = item.status === 'checked_out';
  const overdueDays = computeDaysOverdue(item.dueAt);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <Card className="border-t-4 border-primary shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              {item.name}
            </CardTitle>
            <CardDescription>
              {item.author ? `${item.author} · ` : ''}
              <span className="font-mono">{item.upc}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                isOut ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'
              }`}
            >
              {isOut
                ? overdueDays > 0
                  ? `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`
                  : item.dueAt
                    ? `Checked out · due ${formatDueDate(item.dueAt)}`
                    : 'Currently checked out'
                : 'Available on shelf'}
            </div>

            {lastAction ? (
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${
                  lastAction === 'checkout' ? 'bg-primary/10 text-primary' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {lastAction === 'checkout' ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                ) : (
                  <RotateCcw className="h-5 w-5 shrink-0" />
                )}
                {lastAction === 'checkout' ? 'Checked out successfully!' : 'Returned successfully!'}
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground">
              Scan your <strong>student ID card</strong> to {isOut ? 'return' : 'check out'} this book.
              {loginState === 'student' ? ' You can also scan the book again from your dashboard after signing in.' : ''}
            </p>

            <BarcodeScannerCameraView
              videoRef={videoRef}
              hasCameraPermission={hasCameraPermission}
              zoom={zoom}
              onZoomChange={setZoom}
              viewportClassName="aspect-video max-h-40"
              className="space-y-2"
              hintText="Scan your student ID card in the frame"
            />

            {busy ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : null}

            <Button variant="outline" className="w-full rounded-xl" onClick={() => router.push(`/${schoolId}/student`)}>
              Back to student kiosk
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LibraryBookPage() {
  const params = useParams<{ schoolId: string }>();
  const schoolId = (params.schoolId || '').trim().toLowerCase();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <LibraryBookPageInner schoolId={schoolId} />
    </Suspense>
  );
}
