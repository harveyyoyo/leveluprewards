'use client';

import { useRef, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Upload } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  filterSssRowsBySchool,
  parseSssSpreadsheetCsv,
  parseSssSpreadsheetObjects,
  sssRowToFirestorePayload,
  uniqueSssSourceSchools,
} from '@/lib/sss/sssSpreadsheetImport';

const BATCH_SIZE = 400;

export function SssSpreadsheetImportDialog({ schoolId, disabled }: { schoolId: string; disabled?: boolean }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{
    fileName: string;
    rows: ReturnType<typeof parseSssSpreadsheetCsv>['rows'];
    errors: string[];
  } | null>(null);
  const [schoolFilter, setSchoolFilter] = useState('');

  const parseFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.csv')) {
      const { rows, errors } = parseSssSpreadsheetCsv(await file.text());
      return { fileName: file.name, rows, errors };
    }
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return { fileName: file.name, rows: [], errors: ['Workbook has no sheets.'] };
    return {
      fileName: file.name,
      ...parseSssSpreadsheetObjects(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })),
    };
  };

  const filteredRows = pending ? filterSssRowsBySchool(pending.rows, schoolFilter) : [];

  const runImport = async () => {
    if (!firestore || !pending || filteredRows.length === 0) return;
    setBusy(true);
    try {
      const now = Date.now();
      for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestore);
        for (const row of filteredRows.slice(i, i + BATCH_SIZE)) {
          batch.set(doc(collection(firestore, 'schools', schoolId, 'sssStudents')), sssRowToFirestorePayload(row, now));
        }
        await batch.commit();
      }
      toast({ title: 'Students imported', description: `${filteredRows.length} records added.` });
      setOpen(false);
      setPending(null);
      setSchoolFilter('');
    } catch (e) {
      toast({ variant: 'destructive', title: 'Import failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void parseFile(file).then((parsed) => {
              if (parsed.rows.length === 0) {
                toast({ variant: 'destructive', title: 'No rows found', description: parsed.errors[0] });
                return;
              }
              setPending(parsed);
              setSchoolFilter('');
              setOpen(true);
            });
          }
          e.target.value = '';
        }}
      />
      <Button type="button" variant="outline" className="rounded-xl gap-2" disabled={disabled || busy} onClick={() => inputRef.current?.click()}>
        <Upload className="h-4 w-4" />
        Import spreadsheet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Import student roster</DialogTitle>
          </DialogHeader>
          {pending ? (
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">{pending.fileName}</span> — {pending.rows.length} rows
                {uniqueSssSourceSchools(pending.rows).length
                  ? ` · ${uniqueSssSourceSchools(pending.rows).length} schools`
                  : ''}
              </p>
              <div className="space-y-2">
                <Label htmlFor="sss-filter">School filter (optional)</Label>
                <Input id="sss-filter" value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} placeholder='e.g. "Temimah"' className="rounded-xl" />
                <p className="text-xs text-muted-foreground">{filteredRows.length} of {pending.rows.length} rows will import.</p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" className="rounded-xl" disabled={busy || filteredRows.length === 0} onClick={() => void runImport()}>
              {busy ? 'Importing…' : `Import ${filteredRows.length}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
