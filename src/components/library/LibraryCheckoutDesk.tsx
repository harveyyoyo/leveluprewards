'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useFunctions } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
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
  const [mode, setMode] = useState<'checkout' | 'return'>('checkout');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLoans, setStudentLoans] = useState<LibraryItem[]>([]);
  const [message, setMessage] = useState('Choose a student or scan their card.');
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const policy = useMemo(() => getLibraryPolicyFromSettings(settings, categories), [settings, categories]);
  const selectStudent = async (id: string) => {
    if (!firestore || !schoolId || locked.current) return;
    locked.current = true; setBusy(true);
    try { const loans = await getStudentLibraryCheckouts(firestore, schoolId, id); setStudentId(id); setStudentLoans(loans); setRecent([]); setMessage(`${getStudentName(id)} is ready. Scan a book.`); setError(false); }
    catch (e) { toast({ variant: 'destructive', title: 'Could not load student', description: (e as Error).message }); }
    finally { locked.current = false; setBusy(false); }
  };
  const handleScan = useCallback((raw: string) => {
    if (locked.current || !firestore || !schoolId || !raw.trim()) return;
    locked.current = true; setBusy(true); setError(false);
    void (async () => {
      try {
        const found = await findLibraryItemByUpc(firestore, schoolId, raw);
        if (!found) {
          if (isRetailIsbnBarcode(raw) || isSchoolLibraryBarcode(raw)) throw new Error('Book not in the catalog. Add it under Catalog → Add books.');
          const id = await lookupStudentId(firestore, schoolId, raw);
          if (!id) throw new Error('Student not found. Scan their card or search by name.');
          const loans = await getStudentLibraryCheckouts(firestore, schoolId, id);
          setStudentId(id); setStudentLoans(loans); setRecent([]); setMessage(`${getStudentName(id)} is ready. Scan a book.`); playSound('success'); return;
        }
        const target = mode === 'return' ? found.item.checkedOutTo : studentId;
        if (!target) {
          if (mode === 'return') { setMessage(`${found.item.name} is already returned.`); return; }
          throw new Error('Select a student before checking out a book.');
        }
        const result = await performLibraryCheckoutOrReturn(firestore, schoolId, target, raw, { policy, functions, action: mode });
        if (result.action === 'limit_reached') throw new Error(`Checkout limit reached: ${result.currentCount} of ${result.max} books.`);
        if (result.action === 'wrong_borrower') throw new Error('This copy is on loan to another student.');
        if (result.action === 'not_found') throw new Error('Book not found. Check its copy barcode.');
        if (result.action === 'already_done') { setMessage(`Already ${mode === 'checkout' ? 'checked out' : 'returned'}: ${found.item.name}`); return; }
        const text = result.action === 'checkout' ? `Checked out: ${result.item.name} · Due ${formatDueDate(result.dueAt)}` : `Returned: ${result.item.name} · ${getStudentName(target)}`;
        setMessage(text); setRecent(prev => [text, ...prev].slice(0, 8)); playSound('success');
        if (studentId) {
          try { setStudentLoans(await getStudentLibraryCheckouts(firestore, schoolId, studentId)); }
          catch { toast({ title: 'Book saved', description: 'The loan summary could not refresh. Select the student again to reload it.' }); }
        }
      } catch (e) { setError(true); setMessage((e as Error).message || 'Could not save the scan. Try again.'); playSound('error'); }
      finally { locked.current = false; setBusy(false); }
    })();
  }, [firestore, schoolId, studentId, mode, policy, functions, getStudentName, playSound, toast]);
  const reader = useBarcodeReaderWedge({ active: true, disabled: busy, onScan: handleScan });
  const student = students?.find(s => s.id === studentId);
  return <section className="rounded-2xl border bg-background p-4 sm:p-6 space-y-5" aria-label="Library checkout desk">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Library desk</h2><div className="flex gap-2" role="group" aria-label="Scan action"><Button disabled={busy} variant={mode === 'checkout' ? 'default' : 'outline'} aria-pressed={mode === 'checkout'} onClick={() => { setMode('checkout'); setMessage('Choose a student, then scan books.'); }}>Check out</Button><Button disabled={busy} variant={mode === 'return' ? 'default' : 'outline'} aria-pressed={mode === 'return'} onClick={() => { setMode('return'); setMessage('Scan books to return. No student card needed.'); }}>Return</Button></div></div>
    {mode === 'checkout' ? <><div className="flex items-center gap-3 rounded-xl bg-primary/5 p-4"><User className="h-7 w-7 shrink-0" /><div className="flex-1 space-y-1"><p className="text-xs text-muted-foreground">Current student</p><div className="flex flex-wrap items-center gap-2"><p className="text-xl font-bold">{studentId ? getStudentName(studentId) : 'Choose a student'}</p>{studentId && <LibraryStudentBehaviorBadge standing={computeStudentLibraryStanding(studentLoans, { fineBalance: student?.libraryFineBalance })} compact />}</div></div>{studentId && <Button variant="outline" disabled={busy} onClick={() => { setStudentId(null); setStudentLoans([]); setRecent([]); setMessage('Scan the next student card.'); }}>Next student</Button>}</div>
      {!studentId && <LibraryStudentNamePicker students={students} disabled={busy} onSelect={s => void selectStudent(s.id)} />}</> : <p className="text-sm text-muted-foreground">Scan each returned book. The correct borrower is found automatically.</p>}
    <LibraryBarcodeReaderField inputId="library-desk-reader" inputRef={reader.inputRef} scanBuffer={reader.scanBuffer} onScanBufferChange={reader.setScanBuffer} onSubmit={reader.submitScan} active={!busy} hint={mode === 'return' ? 'Return mode — scan the copy barcode.' : studentId ? `Check out books for ${getStudentName(studentId)}.` : 'Scan a student ID card first.'} />
    <div role={error ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl border p-4 text-base font-semibold ${error ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5'}`}>{busy ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving scan…</span> : message}</div>
    {studentId && mode === 'checkout' && <LibraryStudentLoansSummary items={studentLoans} maxCheckouts={policy.maxCheckoutsPerStudent} libraryPolicy={policy} libraryPoints={student?.libraryPoints} libraryFineBalance={student?.libraryFineBalance} categoryPoints={policy.pointsCategoryName ? student?.categoryPoints?.[policy.pointsCategoryName] : undefined} compact />}
    {recent.length > 0 && <details><summary className="cursor-pointer text-sm font-medium">Recent scans ({recent.length})</summary><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{recent.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
  </section>;
}
