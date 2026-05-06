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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Class, Student } from '@/lib/types';
import {
  ID_CARD_FAMILIES,
  ID_CARD_PAPERS,
  type IdCardPrinterFamilyId,
  type IdCardPrintProfile,
  defaultPaperForFamily,
  idCardJobPrinterOptions,
  isValidPaperForFamily,
} from '@/lib/id-card-print-catalog';
import { Printer, BookmarkPlus } from 'lucide-react';

function newProfileId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `idp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function IdCardPrintSetupDialog({
  open,
  onOpenChange,
  students,
  classes: _classes,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  classes: Class[];
  onConfirm: (args: { students: Student[]; classes: Class[]; printerType?: 'dtc4500e' }) => void;
}) {
  const { toast } = useToast();
  const { settings, updateSettings } = useSettings();

  const [family, setFamily] = useState<IdCardPrinterFamilyId>('browser_sheet');
  const [paperId, setPaperId] = useState(defaultPaperForFamily('browser_sheet'));
  const [selectedProfileId, setSelectedProfileId] = useState<string>('__custom__');
  const [saveProfileName, setSaveProfileName] = useState('');

  const profiles = settings.idCardPrintProfiles ?? [];

  const summaryLine = useMemo(() => {
    const n = students.length;
    if (n === 0) return 'No students in this print run.';
    if (n === 1) {
      const s = students[0];
      const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Student';
      return `1 student — ${name}`;
    }
    return `${n} students`;
  }, [students]);

  useEffect(() => {
    if (!open) return;
    const list = settings.idCardPrintProfiles ?? [];
    const lastId = settings.lastIdCardPrintProfileId;
    const match = lastId ? list.find((p) => p.id === lastId) : null;
    if (match && isValidPaperForFamily(match.family, match.paperId)) {
      setSelectedProfileId(match.id);
      setFamily(match.family);
      setPaperId(match.paperId);
    } else if (list.length > 0) {
      const sorted = [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      const p = sorted.find((x) => isValidPaperForFamily(x.family, x.paperId));
      if (p) {
        setSelectedProfileId(p.id);
        setFamily(p.family);
        setPaperId(p.paperId);
      } else {
        setSelectedProfileId('__custom__');
        setFamily('browser_sheet');
        setPaperId(defaultPaperForFamily('browser_sheet'));
      }
    } else {
      setSelectedProfileId('__custom__');
      setFamily('browser_sheet');
      setPaperId(defaultPaperForFamily('browser_sheet'));
    }
    setSaveProfileName('');
    // Intentionally only when the dialog opens — avoids resetting choices while staff edit fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFamilyChange = (next: IdCardPrinterFamilyId) => {
    setSelectedProfileId('__custom__');
    setFamily(next);
    setPaperId(defaultPaperForFamily(next));
  };

  const handlePaperChange = (next: string) => {
    setSelectedProfileId('__custom__');
    setPaperId(next);
  };

  const applyProfile = (id: string) => {
    setSelectedProfileId(id);
    if (id === '__custom__') return;
    const p = profiles.find((x) => x.id === id);
    if (!p || !isValidPaperForFamily(p.family, p.paperId)) return;
    setFamily(p.family);
    setPaperId(p.paperId);
  };

  const handleSaveProfile = () => {
    const name = saveProfileName.trim();
    if (!name) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a short name for this setup.' });
      return;
    }
    if (!isValidPaperForFamily(family, paperId)) {
      toast({ variant: 'destructive', title: 'Invalid paper', description: 'Pick a valid paper option for this printer type.' });
      return;
    }
    const next: IdCardPrintProfile = {
      id: newProfileId(),
      name,
      family,
      paperId,
      createdAt: Date.now(),
    };
    const merged = [...profiles, next];
    updateSettings({
      idCardPrintProfiles: merged,
      lastIdCardPrintProfileId: next.id,
    });
    setSelectedProfileId(next.id);
    setSaveProfileName('');
    toast({ title: 'Saved', description: `“${name}” will appear in My setups.` });
  };

  const handlePrint = () => {
    if (students.length === 0) {
      toast({ variant: 'destructive', title: 'Nothing to print', description: 'There are no students in this run.' });
      return;
    }
    if (!isValidPaperForFamily(family, paperId)) {
      toast({ variant: 'destructive', title: 'Invalid setup', description: 'Choose a supported paper option.' });
      return;
    }
    if (family === 'dtc4500e' && students.length > 1) {
      toast({
        variant: 'destructive',
        title: 'DTC prints one card at a time',
        description: 'Select a single student (selection mode) or narrow filters to one student, then print again.',
      });
      return;
    }

    const printerOpts = idCardJobPrinterOptions(family);
    if (selectedProfileId !== '__custom__') {
      updateSettings({ lastIdCardPrintProfileId: selectedProfileId });
    }

    onConfirm({
      students,
      classes: _classes,
      ...printerOpts,
    });
  };

  const familyMeta = ID_CARD_FAMILIES.find((f) => f.id === family);
  const paperMeta = ID_CARD_PAPERS[family].find((p) => p.id === paperId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" aria-hidden />
            Print ID cards
          </DialogTitle>
          <DialogDescription>
            Choose how cards are produced on your hardware and stock. {summaryLine}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {settings.printerReminderIdCards?.trim() ? (
            <Alert>
              <AlertTitle>School note</AlertTitle>
              <AlertDescription className="text-xs leading-relaxed whitespace-pre-wrap">
                {settings.printerReminderIdCards.trim()}
              </AlertDescription>
            </Alert>
          ) : null}

          {profiles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="id-print-profile">My setups</Label>
              <Select value={selectedProfileId} onValueChange={applyProfile}>
                <SelectTrigger id="id-print-profile" className="rounded-xl">
                  <SelectValue placeholder="Choose a saved setup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">Custom (choose below)</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="id-print-family">Printer / output</Label>
            <Select value={family} onValueChange={(v) => handleFamilyChange(v as IdCardPrinterFamilyId)}>
              <SelectTrigger id="id-print-family" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ID_CARD_FAMILIES.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {familyMeta ? <p className="text-xs text-muted-foreground leading-snug">{familyMeta.shortDescription}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="id-print-paper">Paper / stock</Label>
            <Select value={paperId} onValueChange={handlePaperChange}>
              <SelectTrigger id="id-print-paper" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ID_CARD_PAPERS[family].map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {paperMeta ? <p className="text-xs text-muted-foreground leading-snug">{paperMeta.detail}</p> : null}
          </div>

          {family === 'dtc4500e' && students.length > 1 ? (
            <Alert variant="destructive">
              <AlertTitle>One student at a time</AlertTitle>
              <AlertDescription>
                This queue has {students.length} students. Use selection mode to pick one student, or filter the list to a single student before printing with DTC.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-end sm:gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="id-print-save-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Save this setup
              </Label>
              <Input
                id="id-print-save-name"
                value={saveProfileName}
                onChange={(e) => setSaveProfileName(e.target.value)}
                placeholder="e.g. Front office — Avery sheets"
                className="rounded-xl"
              />
            </div>
            <Button type="button" variant="secondary" className="rounded-xl shrink-0" onClick={handleSaveProfile}>
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={handlePrint}
            disabled={students.length === 0 || (family === 'dtc4500e' && students.length > 1)}
          >
            Continue to print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
