'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  buildCanonicalStudentCsvFromMapping,
  guessStudentCsvColumnMap,
  parseStudentCsvToMatrix,
  type StudentCsvMappedField,
} from '@/lib/studentCsvColumnMap';

const FIELD_OPTIONS: { value: StudentCsvMappedField; label: string }[] = [
  { value: 'skip', label: '— Ignore —' },
  { value: 'firstName', label: 'First name' },
  { value: 'lastName', label: 'Last name' },
  { value: 'className', label: 'Class name' },
  { value: 'middleName', label: 'Middle name' },
  { value: 'nickname', label: 'Nickname' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'parentEmail', label: 'Parent email' },
  { value: 'parentPhone', label: 'Parent phone' },
  { value: 'studentEmail', label: 'Student email' },
  { value: 'studentPhone', label: 'Student phone' },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvText: string;
  onConfirm: (canonicalCsv: string) => void;
};

export function StudentCsvColumnMapDialog({ open, onOpenChange, csvText, onConfirm }: Props) {
  const { rows } = useMemo(() => parseStudentCsvToMatrix(csvText), [csvText]);
  const headers = useMemo(() => rows[0] || [], [rows]);
  const [columnMap, setColumnMap] = useState<StudentCsvMappedField[]>([]);

  useEffect(() => {
    if (!open || headers.length === 0) return;
    setColumnMap(guessStudentCsvColumnMap(headers));
  }, [open, headers]);

  const firstIdx = columnMap.indexOf('firstName');
  const lastIdx = columnMap.indexOf('lastName');
  const canImport = firstIdx >= 0 && lastIdx >= 0 && firstIdx !== lastIdx;

  const handleImport = () => {
    const canonical = buildCanonicalStudentCsvFromMapping(rows, columnMap);
    onConfirm(canonical);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>Map CSV columns</DialogTitle>
          <DialogDescription>
            Match each file column to a student field. First and last name are required. The preview uses your first
            data row.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          <div className="space-y-4 pr-3">
            {headers.map((h, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-2 items-end">
                <div className="space-y-1 min-w-0">
                  <Label className="text-xs text-muted-foreground">Column {i + 1}</Label>
                  <p className="text-sm font-semibold truncate" title={h}>
                    {h || '(empty header)'}
                  </p>
                  {rows[1]?.[i] != null ? (
                    <p className="text-xs text-muted-foreground truncate" title={rows[1][i]}>
                      Example: {rows[1][i]}
                    </p>
                  ) : null}
                </div>
                <Select
                  value={columnMap[i] ?? 'skip'}
                  onValueChange={(v) =>
                    setColumnMap((prev) => {
                      const next = [...(prev.length ? prev : headers.map(() => 'skip' as StudentCsvMappedField))];
                      while (next.length < headers.length) next.push('skip');
                      next[i] = v as StudentCsvMappedField;
                      return next;
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_OPTIONS.map((o) => (
                      <SelectItem key={`${i}-${o.value}`} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0 flex-col sm:flex-row gap-2">
          {!canImport ? (
            <p className="text-xs text-destructive mr-auto">Map both first name and last name to continue.</p>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!canImport} onClick={handleImport}>
            Import with this mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
