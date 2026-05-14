'use client';

import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Settings as AppSettings } from '@/components/providers/SettingsProvider';
import {
  ID_CARD_FAMILIES,
  ID_CARD_PAPERS,
  type IdCardPrinterFamilyId,
  type IdCardPrintProfile,
  defaultPaperForFamily,
  isValidPaperForFamily,
} from '@/lib/idCardPrintCatalog';
import { BookmarkPlus, Printer } from 'lucide-react';

function newProfileId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `idp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function IdCardPrinterSettingsSection({
  local,
  onPatch,
}: {
  local: AppSettings;
  onPatch: (patch: Partial<AppSettings>) => void;
}) {
  const { toast } = useToast();
  const [saveProfileName, setSaveProfileName] = useState('');
  const profiles = useMemo(() => local.idCardPrintProfiles ?? [], [local.idCardPrintProfiles]);

  const matchedProfile = useMemo(() => {
    const lastId = local.lastIdCardPrintProfileId;
    if (!lastId) return null;
    const p = profiles.find((x) => x.id === lastId);
    if (!p || !isValidPaperForFamily(p.family, p.paperId)) return null;
    return p;
  }, [local.lastIdCardPrintProfileId, profiles]);

  const selectedProfileId = matchedProfile ? matchedProfile.id : '__custom__';

  const family: IdCardPrinterFamilyId = useMemo(() => {
    if (matchedProfile) return matchedProfile.family;
    const fam = local.idCardPrinterFamily ?? 'browser_sheet';
    const pid = local.idCardPaperId;
    if (pid && isValidPaperForFamily(fam, pid)) return fam;
    return 'browser_sheet';
  }, [matchedProfile, local.idCardPrinterFamily, local.idCardPaperId]);

  const paperId = useMemo(() => {
    if (matchedProfile) return matchedProfile.paperId;
    const pid = local.idCardPaperId;
    if (pid && isValidPaperForFamily(family, pid)) return pid;
    return defaultPaperForFamily(family);
  }, [matchedProfile, local.idCardPaperId, family]);

  const applyProfile = (id: string) => {
    if (id === '__custom__') {
      onPatch({
        lastIdCardPrintProfileId: undefined,
        ...(matchedProfile
          ? { idCardPrinterFamily: matchedProfile.family, idCardPaperId: matchedProfile.paperId }
          : {}),
      });
      return;
    }
    const p = profiles.find((x) => x.id === id);
    if (!p || !isValidPaperForFamily(p.family, p.paperId)) return;
    onPatch({
      lastIdCardPrintProfileId: p.id,
      idCardPrinterFamily: p.family,
      idCardPaperId: p.paperId,
    });
  };

  const handleFamilyChange = (next: IdCardPrinterFamilyId) => {
    onPatch({
      lastIdCardPrintProfileId: undefined,
      idCardPrinterFamily: next,
      idCardPaperId: defaultPaperForFamily(next),
    });
  };

  const handlePaperChange = (next: string) => {
    onPatch({
      lastIdCardPrintProfileId: undefined,
      idCardPaperId: next,
      idCardPrinterFamily: family,
    });
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
    onPatch({
      idCardPrintProfiles: [...profiles, next],
      lastIdCardPrintProfileId: next.id,
      idCardPrinterFamily: family,
      idCardPaperId: paperId,
    });
    setSaveProfileName('');
    toast({ title: 'Saved', description: `“${name}” is available under My setups.` });
  };

  const familyMeta = ID_CARD_FAMILIES.find((f) => f.id === family);
  const paperMeta = ID_CARD_PAPERS[family].find((p) => p.id === paperId);

  return (
    <div className="space-y-1.5 border-t border-slate-200/60 dark:border-slate-700/50 pt-4">
      <div className="text-xs font-bold flex items-center gap-2">
        <Printer className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
        Student ID card printer / stock
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug pb-2">
        One school, one setup: choose how Admin → Students ID printing and previews should render (browser sheets vs direct-to-card). Staff still pick the physical printer in the browser print dialog. Use <span className="font-semibold">Save this setup</span> only if you switch often between two stations (for example Avery sheets in the office and a card printer at the desk)—saved names appear under My setups so you can swap the active layout in one step.
      </p>

      {profiles.length > 0 && (
        <div className="space-y-2 pb-1">
          <Label htmlFor="settings-id-print-profile" className="text-[11px] font-semibold">
            My setups
          </Label>
          <Select value={selectedProfileId} onValueChange={applyProfile}>
            <SelectTrigger id="settings-id-print-profile" className="rounded-xl">
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
        <Label htmlFor="settings-id-print-family" className="text-[11px] font-semibold">
          Printer / output
        </Label>
        <Select value={family} onValueChange={(v) => handleFamilyChange(v as IdCardPrinterFamilyId)}>
          <SelectTrigger id="settings-id-print-family" className="rounded-xl">
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
        <Label htmlFor="settings-id-print-paper" className="text-[11px] font-semibold">
          Paper / stock
        </Label>
        <Select value={paperId} onValueChange={handlePaperChange}>
          <SelectTrigger id="settings-id-print-paper" className="rounded-xl">
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

      <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:flex-row sm:items-end sm:gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="settings-id-print-save-name" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Save this setup
          </Label>
          <Input
            id="settings-id-print-save-name"
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
  );
}
