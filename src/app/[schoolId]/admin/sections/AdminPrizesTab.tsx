'use client';

import { CheckSquare, Cog, Edit3, Gift, Plus, Printer, Trash2, HelpCircle, GraduationCap, ShoppingBag, Wand2, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DynamicIcon from '@/components/DynamicIcon';
import { cn } from '@/lib/utils';
import type { Prize, Teacher, Class, VendingMotorConfig } from '@/lib/types';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrint } from '@/components/providers/PrintProvider';
import { useFirestore } from '@/firebase';
import { backfillPrizeScanCodes } from '@/lib/db/prizes';
import { backfillPrizeCardColors } from '@/lib/prizeCardColor';
import { prizeScanCodeFor } from '@/lib/prizeScanCode';
import { useToast } from '@/hooks/use-toast';
import { AutoCircularToggles } from '@/components/AutoCircularToggles';
import { AdminRecordListHeader } from '@/components/admin/AdminRecordListHeader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  isPrizeSchoolWideTeachers,
  buildTeacherPrizeListItems,
  isTeacherPrizeCreator,
  prizeRestrictionTeacherIds,
  removeTeacherFromPrize,
  teacherListedOnPrize,
} from '@/lib/prizeUtils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isAiSurpriseHiddenFromAdminGrid } from '@/lib/aiJokePrize';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { IdCardPrintSetupDialog } from '@/components/admin/IdCardPrintSetupDialog';

export function AdminPrizesTab({
  prizes,
  teachers,
  classes,
  schoolId,
  mode = 'admin',
  teacherId,
  onCreatePrize,
  onDeletePrize,
  onUpdatePrize,
  onOpenSimpleNewPrize,
  onEditPrize,
}: {
  prizes: Prize[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  classes: Class[] | null | undefined;
  schoolId: string;
  mode?: 'admin' | 'teacher';
  teacherId?: string;
  onCreatePrize: (p: Omit<Prize, 'id'>) => Promise<void | string> | void;
  onDeletePrize: (prizeId: string) => void;
  onUpdatePrize: (p: Prize) => void;
  /** When set, "New Prize" opens this (single form) instead of the step wizard. */
  onOpenSimpleNewPrize?: () => void;
  /** Opens the full prize editor modal for the given prize. */
  onEditPrize?: (p: Prize) => void;
}) {
  const { settings } = useSettings();
  const firestore = useFirestore();
  const { setPrizeIdCardsToPrint } = usePrint();
  const { toast } = useToast();
  const vendingEnabled = settings.enableVendingMachine === true;
  const [helpOpen, setHelpOpen] = useState(false);
  const cardColorBackfillStarted = useRef(false);
  const [prizeIdPrintJob, setPrizeIdPrintJob] = useState<Prize[] | null>(null);
  const [selectedPrizeIds, setSelectedPrizeIds] = useState<Set<string>>(new Set());
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  const PRIZE_LIST_GRID =
    'grid-cols-[40px_minmax(148px,168px)_minmax(140px,240px)_56px_72px_200px_44px_72px_72px_64px_96px]';

  const tablePrizes = useMemo(
    () => (prizes || []).filter((p) => !isAiSurpriseHiddenFromAdminGrid(p)),
    [prizes],
  );

  const prizeListItems = useMemo(() => {
    if (mode === 'teacher' && teacherId) {
      return buildTeacherPrizeListItems(tablePrizes, teacherId);
    }
    return tablePrizes
      .slice()
      .sort((a, b) => a.points - b.points)
      .map((prize) => ({ kind: 'prize' as const, prize }));
  }, [mode, teacherId, tablePrizes]);

  const selectablePrizes = useMemo(
    () => prizeListItems.filter((item) => item.kind === 'prize').map((item) => item.prize),
    [prizeListItems],
  );

  const selectedPrizes = useMemo(
    () => selectablePrizes.filter((p) => selectedPrizeIds.has(p.id)),
    [selectablePrizes, selectedPrizeIds],
  );

  const isAllListedSelected =
    selectablePrizes.length > 0 && selectablePrizes.every((p) => selectedPrizeIds.has(p.id));

  const togglePrizeSelected = useCallback((prizeId: string) => {
    setSelectedPrizeIds((prev) => {
      const next = new Set(prev);
      if (next.has(prizeId)) next.delete(prizeId);
      else next.add(prizeId);
      return next;
    });
  }, []);

  const toggleSelectAllListed = useCallback(() => {
    if (selectablePrizes.length === 0) return;
    setSelectedPrizeIds((prev) => {
      const next = new Set(prev);
      const allSelected = selectablePrizes.every((p) => next.has(p.id));
      if (allSelected) {
        for (const p of selectablePrizes) next.delete(p.id);
      } else {
        for (const p of selectablePrizes) next.add(p.id);
      }
      return next;
    });
  }, [selectablePrizes]);

  const clearPrizeSelection = useCallback(() => {
    setSelectedPrizeIds(new Set());
  }, []);

  // --- REAL prize creation wizard state ---
  const [wName, setWName] = useState('');
  const [wIcon, setWIcon] = useState('Gift');
  const [wPoints, setWPoints] = useState('50');
  const [wInStock, setWInStock] = useState(true);
  const [wStockCount, setWStockCount] = useState('');
  const [wOfferPrint, setWOfferPrint] = useState(false);
  /** Admin wizard: selected teacher ids; empty = school-wide. */
  const [wTeacherIds, setWTeacherIds] = useState<string[]>([]);
  const [wClassId, setWClassId] = useState<'all' | string>('all');
  const [wSchoolWide, setWSchoolWide] = useState(false);

  const resetWizard = () => {
    setWizardStep(0);
    setWName('');
    setWIcon('Gift');
    setWPoints('50');
    setWInStock(true);
    setWStockCount('');
    setWOfferPrint(false);
    setWTeacherIds([]);
    setWClassId('all');
    setWSchoolWide(false);
  };

  const wizardTitle = useMemo(() => {
    const titles = [
      'Item Wizard',
      'Step 1: Basic info',
      'Step 2: Cost & stock',
      'Step 3: Options & access',
      'Step 4: Review & redemption',
    ];
    return titles[wizardStep] || 'Item Wizard';
  }, [wizardStep]);

  const canGoNext = useMemo(() => {
    if (wizardStep === 1) return wName.trim().length > 0;
    if (wizardStep === 2) return !Number.isNaN(parseInt(wPoints, 10)) && parseInt(wPoints, 10) >= 0;
    return true;
  }, [wizardStep, wName, wPoints]);

  const printPrizeCards = useCallback(
    async (list: Prize[]) => {
      if (!list.length) {
        toast({ variant: 'destructive', title: 'No prizes', description: 'Add rewards before printing shelf cards.' });
        return;
      }
      try {
        await backfillPrizeScanCodes(firestore, schoolId, list);
        const withCodes = list.map((p) => ({ ...p, scanCode: prizeScanCodeFor(p) }));
        setPrizeIdPrintJob(withCodes);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Print failed',
          description: e instanceof Error ? e.message : 'Could not prepare prize cards.',
        });
      }
    },
    [firestore, schoolId, toast],
  );

  const handlePrintPrizeCards = useCallback(() => {
    const list = selectedPrizes.length > 0 ? selectedPrizes : selectablePrizes;
    void printPrizeCards(list);
  }, [printPrizeCards, selectedPrizes, selectablePrizes]);

  const handlePrintOnePrizeCard = useCallback(
    (prize: Prize) => {
      void printPrizeCards([prize]);
    },
    [printPrizeCards],
  );

  useEffect(() => {
    if (!firestore || !schoolId || !tablePrizes.length || cardColorBackfillStarted.current) return;
    const needsColors = tablePrizes.some((p) => !p.cardColor?.trim());
    if (!needsColors) return;
    cardColorBackfillStarted.current = true;
    void backfillPrizeCardColors(firestore, schoolId, tablePrizes)
      .then((count) => {
        if (count > 0) {
          toast({
            title: 'Prize card colors assigned',
            description: `${count} reward item(s) now have a unique shelf card color.`,
          });
        }
      })
      .catch(() => {
        cardColorBackfillStarted.current = false;
      });
  }, [firestore, schoolId, tablePrizes, toast]);

  return (
    <Card className="w-full border-t-4 border-primary shadow-md overflow-hidden">
      <CardHeader className="flex flex-row justify-between items-center py-6">
        <div>
          <CardTitle className="flex items-center gap-2">
                <Gift className="text-destructive w-5 h-5" /> Rewards Shop
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-muted-foreground"
              onClick={() => setHelpOpen(true)}
              aria-label="How items work"
              title="How items work"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>Items available for student redemption.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <TabWalkthroughHeaderAction />
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={handlePrintPrizeCards}
            disabled={selectablePrizes.length === 0}
          >
            <Printer className="mr-2 h-4 w-4" />
            {selectedPrizeIds.size > 0
              ? `Print selected (${selectedPrizeIds.size})`
              : `Print all prize cards (${selectablePrizes.length})`}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              resetWizard();
              setWizardOpen(true);
            }}
          >
            <Wand2 className="mr-2 h-4 w-4" /> Wizard
          </Button>
          <Button
            onClick={() => {
              if (onOpenSimpleNewPrize) {
                onOpenSimpleNewPrize();
                return;
              }
              resetWizard();
              setWizardOpen(true);
              setWizardStep(1);
            }}
            className="rounded-xl"
          >
            <Plus className="mr-2 h-4 w-4" /> New Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4 font-semibold border-ring/35"
            disabled={selectablePrizes.length === 0}
            onClick={toggleSelectAllListed}
          >
            {isAllListedSelected
              ? `Deselect all (${selectablePrizes.length})`
              : `Select all (${selectablePrizes.length})`}
          </Button>
        </div>
        {selectedPrizeIds.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-ring/35 bg-secondary px-3 py-2">
            <div className="flex items-center gap-2 pr-1 text-sm font-semibold text-secondary-foreground">
              <CheckSquare className="h-4 w-4" />
              <span>{selectedPrizeIds.size} selected</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-lg px-3 text-xs font-semibold border-ring/35"
              onClick={handlePrintPrizeCards}
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print selected
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-lg px-3 text-xs font-semibold"
              onClick={clearPrizeSelection}
            >
              Clear
            </Button>
          </div>
        ) : null}
        <ul className="grid grid-cols-1 gap-4 min-w-0 overflow-x-hidden pr-2">
          <AdminRecordListHeader
            gridClassName={PRIZE_LIST_GRID}
            columns={[
              { label: 'Select', className: 'text-center' },
              { label: 'Actions' },
              { label: 'Item Name' },
              { label: 'Cost', className: 'text-center' },
              { label: 'Stock', className: 'text-center' },
              { label: 'Shop Visibility', className: 'text-center' },
              { label: 'Icon', className: 'text-center' },
              { label: mode === 'teacher' ? 'School-Wide' : 'Teachers', className: 'text-center' },
              { label: 'Class Access', className: 'text-center' },
              { label: 'Motor', className: 'text-center' },
              { label: 'Delete', className: 'text-right pr-1' },
            ]}
          />
          {prizeListItems.map((item) =>
            item.kind === 'section' ? (
              <li
                key={item.id}
                className={cn(
                  'list-none w-full rounded-xl border border-dashed border-muted-foreground/30 bg-muted/25 px-4 py-3',
                  item.id === 'school-wide' && 'mt-2',
                )}
                role="presentation"
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{item.label}</p>
                {item.hint ? <p className="text-xs text-muted-foreground mt-1">{item.hint}</p> : null}
              </li>
            ) : (
              (() => {
                const p = item.prize;
                const restrictionIds = prizeRestrictionTeacherIds(p);
                const schoolWideT = isPrizeSchoolWideTeachers(p);
                const isCreator = mode === 'teacher' && teacherId ? isTeacherPrizeCreator(p, teacherId) : false;
                const listed = mode === 'teacher' && teacherId ? teacherListedOnPrize(p, teacherId) : false;
                const canEditFull = mode === 'admin' || (mode === 'teacher' && isCreator);
                const canRemoveSelf =
                  mode === 'teacher' && teacherId && !isCreator && listed && !schoolWideT;
                const canDelete = mode === 'admin' || (mode === 'teacher' && isCreator);
                const rowDimmed =
                  mode === 'teacher' &&
                  teacherId &&
                  !schoolWideT &&
                  !listed &&
                  !isCreator;

                const motor = p.vendingMotor;
                const motorEnabled = motor?.enabled === true;
                const motorAxis = motor?.axis ?? 'E';
                const updateMotor = (patch: Partial<VendingMotorConfig> & { enabled?: boolean }) => {
                  if (!canEditFull) return;
                  const nextEnabled = patch.enabled ?? motorEnabled;
                  if (!nextEnabled) {
                    onUpdatePrize({ ...p, vendingMotor: undefined });
                    return;
                  }
                  const next: VendingMotorConfig = {
                    enabled: true,
                    axis: (patch.axis ?? motorAxis) as 'X' | 'Y' | 'Z' | 'E',
                    // Admin list only chooses axis; movement tuning is handled elsewhere.
                    distance: 360,
                    feedRate: 500,
                  };
                  onUpdatePrize({ ...p, vendingMotor: next });
                };

                return (
                  <li
                    key={p.id}
                    className={cn(
                      'grid items-center gap-x-2 rounded-2xl border bg-secondary/30 p-1.5 transition-all hover:bg-background group min-w-0',
                      PRIZE_LIST_GRID,
                      selectedPrizeIds.has(p.id) && 'border-ring/45 bg-secondary',
                      rowDimmed && 'opacity-60',
                    )}
                  >
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedPrizeIds.has(p.id)}
                        onCheckedChange={() => togglePrizeSelected(p.id)}
                        aria-label={`Select ${p.name}`}
                        className="h-5 w-5 rounded-md"
                      />
                    </div>
                    {/* Edit + print */}
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                      {onEditPrize ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-lg border-primary/20 bg-background hover:bg-primary/5 text-primary font-semibold"
                          disabled={!canEditFull}
                          onClick={() => onEditPrize(p)}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 rounded-lg font-semibold"
                        title="Print this prize card"
                        aria-label={`Print card for ${p.name}`}
                        onClick={() => handlePrintOnePrizeCard(p)}
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        Print
                      </Button>
                    </div>

                    {/* 2. Name */}
                    <div className="min-w-0 flex items-center gap-2">
                      <div
                        className={cn(
                          'size-8 shrink-0 rounded-lg flex items-center justify-center bg-background border-2 relative overflow-hidden',
                          !p.inStock && 'opacity-40 grayscale',
                        )}
                        style={p.cardColor ? { borderColor: p.cardColor, backgroundColor: `${p.cardColor}22` } : undefined}
                      >
                        {p.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.imageUrl} alt="" className="absolute inset-0 z-[5] size-full object-cover" />
                        ) : (
                          p.name && (
                            <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none z-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=transparent`} alt="" className="w-full h-full object-cover" />
                            </div>
                          )
                        )}
                        <DynamicIcon name={p.icon || 'Gift'} className="w-4 h-4 text-primary relative z-10 drop-shadow-sm" />
                      </div>
                      <div className="relative min-w-0 flex-1 flex items-center gap-1.5">
                        <Input
                          aria-label="Prize name"
                          className={cn("h-7 text-[10px] px-1.5 w-full min-w-0 border-none bg-transparent shadow-none focus-visible:ring-1", vendingEnabled && p.vendingMotor?.enabled && "pr-10", !p.inStock && "opacity-70")}
                          disabled={!canEditFull}
                          defaultValue={p.name}
                          key={`name-${p.id}-${p.name}`}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next && next !== p.name) onUpdatePrize({ ...p, name: next });
                          }}
                        />
                        {p.aiFunReward ? (
                          <span
                            className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-900 dark:text-amber-100"
                            title={`AI surprise: ${p.aiFunReward}`}
                          >
                            AI
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* 3. Points */}
                    <div>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canEditFull}
                        aria-label="Points"
                        className="h-7 text-[10px] px-1"
                        defaultValue={String(p.points ?? 0)}
                        key={`points-${p.id}-${p.points}`}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = Math.max(0, parseInt(raw, 10) || 0);
                          if (next !== p.points) onUpdatePrize({ ...p, points: next });
                        }}
                      />
                    </div>

                    {/* 4. Qty */}
                    <div>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canEditFull}
                        aria-label="Stock on hand"
                        className="h-7 text-[10px] px-1"
                        placeholder="∞"
                        defaultValue={p.stockCount === undefined ? '' : String(p.stockCount)}
                        key={`stock-${p.id}-${p.stockCount ?? 'x'}`}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === '' ? undefined : Math.max(0, parseInt(raw, 10) || 0);
                          if (next !== p.stockCount) onUpdatePrize({ ...p, stockCount: next });
                        }}
                      />
                    </div>

                    {/* 5. Toggles */}
                    <div className="flex flex-col items-center">
                      <AutoCircularToggles
                        record={p}
                        defs={[
                          { key: 'inStock', label: 'In Stock', shortLabel: 'In stock' },
                          { key: 'offerPrintTicketOnRedeem', label: 'Offer print voucher', shortLabel: 'Print' }
                        ]}
                        wrap={false}
                        onToggle={(key, val) => {
                          onUpdatePrize({ ...p, [key]: val });
                        }}
                      />
                    </div>

                    {/* 6. Icon */}
                    <div className="flex justify-center">
                      <DynamicIcon name={p.icon || 'Gift'} className="w-5 h-5 text-muted-foreground/60" />
                    </div>

                    {/* 7. Teachers */}
                    <div className="flex flex-col gap-0.5">
                      {mode === 'teacher' ? (
                        <div className="flex items-center justify-center h-8 rounded-md border bg-background">
                          <Switch
                            checked={schoolWideT}
                            disabled={!canEditFull}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                onUpdatePrize({ ...p, teacherIds: undefined, teacherId: undefined });
                              } else if (teacherId) {
                                onUpdatePrize({ ...p, teacherIds: [teacherId], teacherId: undefined });
                              }
                            }}
                            className="data-[state=checked]:bg-primary scale-50"
                          />
                        </div>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 w-full min-h-8 text-[10px] px-1 font-semibold"
                              disabled={!canEditFull}
                            >
                              {restrictionIds.length === 0 ? 'All' : `${restrictionIds.length}`}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 z-[250]" align="start">
                            <div className="space-y-3">
                              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                <Checkbox
                                  checked={restrictionIds.length === 0}
                                  onCheckedChange={(c) => {
                                    if (c === true) onUpdatePrize({ ...p, teacherIds: undefined, teacherId: undefined });
                                  }}
                                />
                                School-wide (all teachers)
                              </label>
                              <div className="border-t pt-2 max-h-52 overflow-y-auto space-y-2">
                                {(teachers || []).map((t) => {
                                  const checked = restrictionIds.includes(t.id);
                                  return (
                                    <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <Checkbox
                                        checked={checked}
                                        disabled={!canEditFull}
                                        onCheckedChange={(c) => {
                                          const next =
                                            c === true
                                              ? [...new Set([...restrictionIds, t.id])]
                                              : restrictionIds.filter((id) => id !== t.id);
                                          onUpdatePrize({
                                            ...p,
                                            teacherIds: next.length ? next : undefined,
                                            teacherId: undefined,
                                          });
                                        }}
                                      />
                                      <span className="truncate">{t.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* 8. Class */}
                    <div className="flex flex-col gap-0.5">
                      <Select
                        value={p.classId || 'all'}
                        disabled={!canEditFull}
                        onValueChange={(v) => onUpdatePrize({ ...p, classId: v === 'all' ? undefined : v })}
                      >
                        <SelectTrigger className="h-8 min-h-8 text-[10px] px-1 w-full">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {(classes || []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 9. Vending */}
                    <div className="flex justify-center">
                      {vendingEnabled ? (
                        <Popover>
                          <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                  "h-7 w-7 rounded-full hover:bg-muted",
                                  motorEnabled ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                                )}
                                disabled={!canEditFull}
                                title="Prize vending motor"
                              >
                                <Cog className="w-3.5 h-3.5" />
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-3 z-[250]" align="end">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold leading-tight">Prize motor</p>
                                  <p className="text-xs text-muted-foreground leading-snug">
                                    Controls the motor triggered after redeem on the kiosk.
                                  </p>
                                </div>
                                <Switch
                                  checked={motorEnabled}
                                  onCheckedChange={(checked) => updateMotor({ enabled: checked })}
                                  className="data-[state=checked]:bg-emerald-500"
                                />
                              </div>

                              <div className={cn("grid grid-cols-1 gap-2", !motorEnabled && "opacity-50 pointer-events-none")}>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-tighter opacity-60">Axis</Label>
                                  <Select
                                    value={motorAxis}
                                    onValueChange={(v) => updateMotor({ axis: v as 'X' | 'Y' | 'Z' | 'E' })}
                                  >
                                    <SelectTrigger className="h-8 text-xs px-2">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="X">X</SelectItem>
                                      <SelectItem value="Y">Y</SelectItem>
                                      <SelectItem value="Z">Z</SelectItem>
                                      <SelectItem value="E">E</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : <div />}
                    </div>

                    {/* 10. Delete/Remove */}
                    <div className="flex items-center justify-end gap-0.5 pr-1">
                      {canRemoveSelf && teacherId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Remove from my prizes (others keep access)"
                          onClick={() => onUpdatePrize(removeTeacherFromPrize(p, teacherId))}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                      {mode === 'admin' || canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-7 w-7 rounded-full',
                            p.aiFunReward ? 'text-muted-foreground hover:bg-muted hover:text-foreground' : 'text-destructive hover:bg-destructive/10',
                          )}
                          disabled={mode === 'teacher' && !canDelete}
                          title={p.aiFunReward ? 'Remove AI surprise prize' : mode === 'teacher' ? 'Delete item you created' : 'Delete item'}
                          onClick={() => onDeletePrize(p.id)}
                        >
                          {p.aiFunReward ? <X className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })()
            ),
          )}
        </ul>
      </CardContent>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How items work</DialogTitle>
            <DialogDescription>Quick overview of item settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-bold">Items</span> are rewards students redeem using points in the rewards shop.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-bold">Points</span>: cost per redemption.</li>
              <li><span className="font-bold">In Stock</span>: whether it appears in the shop.</li>
              <li><span className="font-bold">Stock</span>: optional count on hand. Blank = unlimited.</li>
              <li><span className="font-bold">Shop</span>: list in shop and print voucher toggles.</li>
              <li><span className="font-bold">Teachers</span>: pick multiple teachers or school-wide.</li>
              <li><span className="font-bold">Class</span>: optionally restrict by class.</li>
              <li><span className="font-bold">Vending motor</span>: enable the Vending Machine feature in settings, then use the prize motor button to pick axis X/Y/Z/E.</li>
              <li><span className="font-bold">Print card</span>: check rows to print a subset, use Select all, or Print all prize cards for every item in the list. The row printer icon still prints one card.</li>
              <li><span className="font-bold">Card color</span>: set per item in Edit → Shelf card color (requires color printing in settings).</li>
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={wizardOpen} onOpenChange={(open) => { setWizardOpen(open); if (!open) resetWizard(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{wizardTitle}</DialogTitle>
            <DialogDescription>Step-by-step creation with a short explanation on each step.</DialogDescription>
          </DialogHeader>
          {wizardStep === 0 && (
            <div className="space-y-3 text-sm">
              <p>
                This wizard walks you through creating a prize, explains each option, and covers how redemption works.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-bold">Set</span> name, icon, points, stock.</li>
                <li><span className="font-bold">Choose</span> printing and who can redeem.</li>
                <li>
                  <span className="font-bold">Then</span> test redemption in the rewards shop.
                </li>
              </ul>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Item name</Label>
                <Input value={wName} onChange={(e) => setWName(e.target.value)} placeholder="Homework Pass" />
              </div>
              <div className="space-y-1">
                <Label>Icon</Label>
                <div className="flex items-center gap-2">
                  <Input value={wIcon} onChange={(e) => setWIcon(e.target.value)} placeholder="Gift" />
                  <div className="h-10 w-10 rounded-xl border bg-background flex items-center justify-center">
                    <DynamicIcon name={wIcon || 'Gift'} className="h-5 w-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Use any Lucide icon name (example: Gift, Star, Trophy).</p>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Point cost</Label>
                <Input type="number" min={0} value={wPoints} onChange={(e) => setWPoints(e.target.value)} />
                <p className="text-xs text-muted-foreground">Students must have at least this many points to redeem.</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>In stock</Label>
                  <p className="text-xs text-muted-foreground">When off, it won’t appear in the shop.</p>
                </div>
                <Switch checked={wInStock} onCheckedChange={setWInStock} />
              </div>
              <div className="space-y-1">
                <Label>Stock on hand (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Leave blank for unlimited"
                  value={wStockCount}
                  onChange={(e) => setWStockCount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">If set, each redemption reduces inventory until it reaches zero.</p>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Print redeem voucher</Label>
                  <p className="text-xs text-muted-foreground">Offer to print a voucher after redemption.</p>
                </div>
                <Switch checked={wOfferPrint} onCheckedChange={setWOfferPrint} />
              </div>

              {mode === 'teacher' ? (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label>School-wide prize</Label>
                    <p className="text-xs text-muted-foreground">If off, only your students see it.</p>
                  </div>
                  <Switch checked={wSchoolWide} onCheckedChange={setWSchoolWide} />
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label>Teachers who can offer this prize</Label>
                    <p className="text-xs text-muted-foreground">Leave none checked for school-wide (all teachers).</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer rounded-md border p-2">
                    <Checkbox
                      checked={wTeacherIds.length === 0}
                      onCheckedChange={(c) => {
                        if (c === true) setWTeacherIds([]);
                      }}
                    />
                    School-wide (all teachers)
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-2 rounded-md border p-2">
                    {(teachers || []).map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={wTeacherIds.includes(t.id)}
                          onCheckedChange={(c) => {
                            setWTeacherIds((prev) => {
                              if (c === true) return [...new Set([...prev, t.id])];
                              return prev.filter((id) => id !== t.id);
                            });
                          }}
                        />
                        <span className="truncate">{t.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label>Class restriction</Label>
                <Select value={wClassId} onValueChange={(v) => setWClassId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (school-wide)</SelectItem>
                    {(classes || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border p-3 bg-secondary/20">
                <p className="font-bold mb-2">Review</p>
                <ul className="space-y-1">
                  <li><span className="font-bold">Name</span>: {wName.trim() || '—'}</li>
                  <li><span className="font-bold">Points</span>: {Math.max(0, parseInt(wPoints || '0', 10) || 0)}</li>
                  <li><span className="font-bold">In stock</span>: {wInStock ? 'Yes' : 'No'}</li>
                  <li><span className="font-bold">Stock on hand</span>: {wStockCount.trim() ? wStockCount.trim() : 'Unlimited'}</li>
                  <li><span className="font-bold">Print voucher</span>: {wOfferPrint ? 'Yes' : 'No'}</li>
                  {mode === 'admin' ? (
                    <li>
                      <span className="font-bold">Teachers</span>:{' '}
                      {wTeacherIds.length === 0 ? 'School-wide' : `${wTeacherIds.length} selected`}
                    </li>
                  ) : (
                    <li>
                      <span className="font-bold">Visibility</span>: {wSchoolWide ? 'School-wide' : 'Your students only'}
                    </li>
                  )}
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-bold">How redemption works</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Points are deducted based on cost × quantity.</li>
                  <li>An activity log entry is created.</li>
                  <li>If Qty is set, it decreases until it reaches 0.</li>
                  <li>If Print is on, the shop offers a print voucher right after redeeming.</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline" className="justify-start">
                <Link href={`/${schoolId}/prize`}><ShoppingBag className="mr-2 h-4 w-4" /> Open Rewards Shop</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href={`/${schoolId}/student`}><GraduationCap className="mr-2 h-4 w-4" /> Open Student Page</Link>
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-row justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
              disabled={wizardStep === 0}
            >
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setWizardOpen(false)}>Close</Button>
              <Button
                type="button"
                disabled={!canGoNext}
                onClick={async () => {
                  if (wizardStep < 4) {
                    setWizardStep((s) => Math.min(4, s + 1));
                    return;
                  }

                  const points = Math.max(0, parseInt(wPoints || '0', 10) || 0);
                  const rawStock = wStockCount.trim();
                  const stockCount = rawStock === '' ? undefined : Math.max(0, parseInt(rawStock, 10) || 0);

                  const finalTeacherIds =
                    mode === 'teacher'
                      ? (wSchoolWide ? [] : (teacherId ? [teacherId] : []))
                      : wTeacherIds;

                  const finalClassId = wClassId === 'all' ? undefined : wClassId;

                  await onCreatePrize({
                    name: wName.trim(),
                    points,
                    icon: (wIcon || 'Gift').trim() || 'Gift',
                    inStock: wInStock,
                    stockCount,
                    offerPrintTicketOnRedeem: wOfferPrint,
                    teacherIds: finalTeacherIds.length ? finalTeacherIds : undefined,
                    teacherId: undefined,
                    classId: finalClassId,
                    addedBy: mode === 'teacher' ? 'teacher' : 'Admin',
                    createdByTeacherId: mode === 'teacher' && teacherId ? teacherId : undefined,
                  });

                  setWizardOpen(false);
                  resetWizard();
                }}
              >
                {wizardStep >= 4 ? 'Create Prize' : 'Next'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {prizeIdPrintJob ? (
        <IdCardPrintSetupDialog
          variant="prize"
          open
          onOpenChange={(o) => {
            if (!o) setPrizeIdPrintJob(null);
          }}
          prizes={prizeIdPrintJob}
          onConfirm={({ prizes, printerType }) => {
            setPrizeIdCardsToPrint({ prizes, printerType });
            setPrizeIdPrintJob(null);
            toast({
              title: prizes.length === 1 ? 'Printing prize card' : 'Printing prize cards',
              description: `${prizes.length} card(s) sent to the printer.`,
            });
          }}
        />
      ) : null}

    </Card>
  );
}
