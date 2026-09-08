'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useFunctions } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { lookupStudentId } from '@/lib/db/lookup';
import { performLibraryCheckoutOrReturn, findLibraryItemByUpc, getStudentLibraryCheckouts } from '@/lib/library/libraryOperations';
import { formatDueDate, getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';
import { computeStudentLibraryStanding } from '@/lib/library/libraryBehavior';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { isSchoolLibraryBarcode } from '@/lib/library/libraryScanCode';
import type { Category, LibraryItem, Student } from '@/lib/types';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { LibraryStudentLoansSummary } from './LibraryStudentLoansSummary';
import { LibraryStudentNamePicker } from './LibraryStudentNamePicker';
import { LibraryStudentBehaviorBadge } from './LibraryStudentBehaviorBadge';

export function LibraryCheckoutDesk({ getStudentName, categories, students }: {
  getStudentName: (id?: string) => string; categories?: Category[] | null; students?: Student[] | null;
}) {
  const { schoolId } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { settings } = useSettings();
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const [mode, setMode] = useState<'auto' | 'checkout' | 'return'>('auto');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLoans, setStudentLoans] = useState<LibraryItem[]>([]);
  const [message, setMessage] = useState('Scan student card or book (auto-detects borrow vs return).');
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const cameraEnabled = Boolean(settings.libraryCameraScanEnabled);
  const [cameraActive, setCameraActive] = useState(false);

  const policy = useMemo(() => getLibraryPolicyFromSettings(settings, categories), [settings, categories]);

  const selectStudent = async (id: string) => {
    if (!firestore || !schoolId || locked.current) return;
    locked.current = true; setBusy(true);
    try {
      const loans = await getStudentLibraryCheckouts(firestore, schoolId, id);
      setStudentId(id);
      setStudentLoans(loans);
      setRecent([]);
      setMessage(`${getStudentName(id)} is ready. Scan a book to borrow or return.`);
      setError(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not load student', description: (e as Error).message });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const handleScan = useCallback((raw: string) => {
    if (locked.current || !firestore || !schoolId || !raw.trim()) return;
    locked.current = true; setBusy(true); setError(false);
    void (async () => {
      try {
        const found = await findLibraryItemByUpc(firestore, schoolId, raw);
        if (!found) {
          if (isRetailIsbnBarcode(raw) || isSchoolLibraryBarcode(raw)) {
            throw new Error('Book not in the catalog. Add it under Catalog → Add books.');
          }
          const id = await lookupStudentId(firestore, schoolId, raw);
          if (!id) throw new Error('Student not found. Scan their card or search by name.');
          const loans = await getStudentLibraryCheckouts(firestore, schoolId, id);
          setStudentId(id);
          setStudentLoans(loans);
          setRecent([]);
          setMessage(`${getStudentName(id)} is ready. Scan a book.`);
          playSound('success');
          return;
        }

        // Determine effective action (auto resolves based on item status)
        let effectiveAction: 'checkout' | 'return' = mode === 'auto'
          ? (found.item.status === 'checked_out' ? 'return' : 'checkout')
          : mode;

        const target = effectiveAction === 'return' ? (found.item.checkedOutTo || studentId) : studentId;
        if (!target) {
          if (effectiveAction === 'return') {
            setMessage(`${found.item.name} is already returned and in library.`);
            return;
          }
          throw new Error(`Select a student before checking out "${found.item.name}".`);
        }

        const result = await performLibraryCheckoutOrReturn(firestore, schoolId, target, raw, {
          policy,
          functions,
          action: effectiveAction,
        });

        if (result.action === 'limit_reached') {
          throw new Error(`Checkout limit reached: ${result.currentCount} of ${result.max} books.`);
        }
        if (result.action === 'wrong_borrower') {
          throw new Error('This copy is on loan to another student.');
        }
        if (result.action === 'not_found') {
          throw new Error('Book not found. Check its copy barcode.');
        }
        if (result.action === 'already_done') {
          setMessage(`Already ${effectiveAction === 'checkout' ? 'checked out' : 'returned'}: ${found.item.name}`);
          return;
        }

        const text = result.action === 'checkout'
          ? `Checked out: ${result.item.name} · Due ${formatDueDate(result.dueAt)}`
          : `Returned: ${result.item.name} · ${getStudentName(target)}`;
        setMessage(text);
        setRecent(prev => [text, ...prev].slice(0, 8));
        playSound('success');

        if (studentId) {
          try {
            setStudentLoans(await getStudentLibraryCheckouts(firestore, schoolId, studentId));
          } catch {
            toast({ title: 'Book saved', description: 'The loan summary could not refresh. Select the student again to reload it.' });
          }
        }
      } catch (e) {
        setError(true);
        setMessage((e as Error).message || 'Could not save the scan. Try again.');
        playSound('error');
      } finally {
        locked.current = false;
        setBusy(false);
      }
    })();
  }, [firestore, schoolId, studentId, mode, policy, functions, getStudentName, playSound, toast]);

  const reader = useBarcodeReaderWedge({ active: true, disabled: busy, onScan: handleScan });

  // Camera barcode scanning hook (activated only when setting enabled & camera active)
  const { videoRef, hasCameraPermission, zoom, setZoom } = useBarcodeScanner(
    cameraEnabled && cameraActive && !busy,
    (scanned) => handleScan(scanned),
    () => {},
    { cameraEnabled: cameraEnabled && cameraActive, keepCameraWarm: true },
  );

  const student = students?.find(s => s.id === studentId);

  return (
    <section className="rounded-2xl border bg-background p-4 sm:p-6 space-y-5" aria-label="Library checkout desk">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold">Library desk</h2>
          <p className="text-xs text-muted-foreground">
            {mode === 'auto'
              ? 'Smart Auto-detect: borrowed books return automatically, available books check out.'
              : mode === 'return'
                ? 'Return mode: books are returned regardless of loan status.'
                : 'Borrow mode: books check out to the active student.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cameraEnabled && (
            <Button
              type="button"
              variant={cameraActive ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5 rounded-xl text-xs font-semibold"
              onClick={() => setCameraActive(v => !v)}
              aria-pressed={cameraActive}
            >
              {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              <span>{cameraActive ? 'Close Camera' : 'Camera Scan'}</span>
            </Button>
          )}

          <div className="flex gap-1.5" role="group" aria-label="Circulation mode">
            <Button
              disabled={busy}
              size="sm"
              variant={mode === 'auto' ? 'default' : 'outline'}
              aria-pressed={mode === 'auto'}
              className="gap-1 rounded-xl font-bold text-xs"
              onClick={() => {
                setMode('auto');
                setMessage('Auto-detect mode active: scan student badge or book.');
              }}
            >
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>Auto (Smart)</span>
            </Button>
            <Button
              disabled={busy}
              size="sm"
              variant={mode === 'checkout' ? 'default' : 'outline'}
              aria-pressed={mode === 'checkout'}
              className="rounded-xl text-xs"
              onClick={() => {
                setMode('checkout');
                setMessage('Choose a student, then scan books to borrow.');
              }}
            >
              Borrow
            </Button>
            <Button
              disabled={busy}
              size="sm"
              variant={mode === 'return' ? 'default' : 'outline'}
              aria-pressed={mode === 'return'}
              className="rounded-xl text-xs"
              onClick={() => {
                setMode('return');
                setMessage('Scan books to return. No student card needed.');
              }}
            >
              Return
            </Button>
          </div>
        </div>
      </div>

      {cameraEnabled && cameraActive && (
        <div className="overflow-hidden rounded-2xl border bg-muted/30 p-3 shadow-inner">
          <BarcodeScannerCameraView
            videoRef={videoRef}
            hasCameraPermission={hasCameraPermission}
            zoom={zoom}
            onZoomChange={setZoom}
            viewportClassName="aspect-video max-h-48 rounded-xl overflow-hidden shadow-inner"
            hintText="Align student card barcode or book LIB/ISBN barcode in frame"
          />
        </div>
      )}

      {mode !== 'return' && (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-primary/5 p-4">
            <User className="h-7 w-7 shrink-0" />
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">Current student</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-bold">{studentId ? getStudentName(studentId) : 'Choose a student'}</p>
                {studentId && <LibraryStudentBehaviorBadge standing={computeStudentLibraryStanding(studentLoans, { fineBalance: student?.libraryFineBalance })} compact />}
              </div>
            </div>
            {studentId && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setStudentId(null);
                  setStudentLoans([]);
                  setRecent([]);
                  setMessage('Scan the next student card.');
                }}
              >
                Next student
              </Button>
            )}
          </div>
          {!studentId && <LibraryStudentNamePicker students={students} disabled={busy} onSelect={s => void selectStudent(s.id)} />}
        </>
      )}

      <LibraryBarcodeReaderField
        inputId="library-desk-reader"
        inputRef={reader.inputRef}
        scanBuffer={reader.scanBuffer}
        onScanBufferChange={reader.setScanBuffer}
        onSubmit={reader.submitScan}
        active={!busy}
        hint={
          mode === 'auto'
            ? studentId
              ? `Scan book for ${getStudentName(studentId)} (returns borrowed books, borrows available books)`
              : 'Scan student ID card or scan a returned book to drop off.'
            : mode === 'return'
              ? 'Return mode — scan book copy barcode.'
              : studentId
                ? `Check out books for ${getStudentName(studentId)}.`
                : 'Scan a student ID card first.'
        }
      />

      <div
        role={error ? 'alert' : 'status'}
        aria-live="polite"
        className={`rounded-xl border p-4 text-base font-semibold ${
          error ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5'
        }`}
      >
        {busy ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving scan…</span> : message}
      </div>

      {studentId && mode !== 'return' && (
        <LibraryStudentLoansSummary
          items={studentLoans}
          maxCheckouts={policy.maxCheckoutsPerStudent}
          libraryPolicy={policy}
          libraryPoints={student?.libraryPoints}
          libraryFineBalance={student?.libraryFineBalance}
          categoryPoints={policy.pointsCategoryName ? student?.categoryPoints?.[policy.pointsCategoryName] : undefined}
          compact
        />
      )}

      {recent.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium">Recent scans ({recent.length})</summary>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {recent.map((text, i) => <li key={i}>{text}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}

