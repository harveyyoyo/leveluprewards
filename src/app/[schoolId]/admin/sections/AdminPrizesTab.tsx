'use client';

import { Cog, Edit3, Gift, Plus, Trash2, HelpCircle, GraduationCap, ShoppingBag, Wand2, UserMinus } from 'lucide-react';
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
import { useMemo, useState } from 'react';
import { AutoCircularToggles } from '@/components/AutoCircularToggles';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  isPrizeSchoolWideTeachers,
  isTeacherPrizeCreator,
  prizeRestrictionTeacherIds,
  removeTeacherFromPrize,
  teacherListedOnPrize,
} from '@/lib/prize-utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { createAiJokePrize, isAiJokePrize } from '@/lib/aiJokePrize';

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
  const vendingEnabled = settings.enableVendingMachine === true;
  const prizeAiSurpriseEnabled = settings.enablePrizeAiSurprise === true;
  const [helpOpen, setHelpOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

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

  const effectivePrizes = useMemo(() => {
    const base = prizes || [];
    return prizeAiSurpriseEnabled ? [...base, createAiJokePrize()] : base;
  }, [prizes, prizeAiSurpriseEnabled]);

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

  return (
    <Card className="border-t-4 border-primary shadow-md">
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
        <div className="flex items-center gap-2">
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
        <ul className="grid grid-cols-1 gap-4 h-[calc(100vh-22rem)] min-h-[250px] min-w-0 overflow-y-auto overflow-x-hidden pr-2">
          <li className="sticky top-0 z-20 rounded-2xl border bg-secondary/70 backdrop-blur px-3 py-2 shadow-sm">
            <div className="grid grid-cols-[28px_36px_minmax(140px,240px)_56px_56px_72px_64px_56px_64px_96px] items-center gap-x-2 min-w-0">
              <div className="h-7 w-7" aria-hidden />
              <div className="size-9" aria-hidden />

              <div className="min-w-0">
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  Name
                </div>
              </div>

              <div className="text-center">
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  Pts
                </div>
              </div>

              <div className="text-center">
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  Qty
                </div>
              </div>

              <div className="text-center">
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  STK / PRT
                </div>
              </div>

              <div>
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  Icon
                </div>
              </div>

              <div className="text-center">
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  {mode === 'teacher' ? 'Wide' : 'Tchrs'}
                </div>
              </div>

              <div className="text-center">
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  Class
                </div>
              </div>

              <div className="text-right pr-1">
                <div className="text-[12px] font-black uppercase tracking-[0.26em] text-foreground/90">
                  Actions
                </div>
              </div>
            </div>
          </li>
          {effectivePrizes
            ?.sort((a, b) => a.points - b.points)
            .map((p) => (
              (() => {
                const systemAi = isAiJokePrize(p);
                const restrictionIds = prizeRestrictionTeacherIds(p);
                const schoolWideT = isPrizeSchoolWideTeachers(p);
                const isCreator = mode === 'teacher' && teacherId ? isTeacherPrizeCreator(p, teacherId) : false;
                const listed = mode === 'teacher' && teacherId ? teacherListedOnPrize(p, teacherId) : false;
                const canEditFull = !systemAi && (mode === 'admin' || (mode === 'teacher' && isCreator));
                const canRemoveSelf =
                  !systemAi && mode === 'teacher' && teacherId && !isCreator && listed && !schoolWideT;
                const canDelete = !systemAi && (mode === 'admin' || (mode === 'teacher' && isCreator));
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

                if (systemAi) {
                  return (
                    <li
                      key={p.id}
                      className={cn("flex items-center gap-x-2 rounded-2xl border bg-secondary/30 p-1.5 min-w-0")}
                    >
                      <div className="flex shrink-0 items-center">
                        <div className="h-7 w-7" aria-hidden />
                      </div>
                      <div className="size-9 shrink-0 rounded-lg flex items-center justify-center bg-background border relative overflow-hidden">
                        <DynamicIcon
                          name={p.icon || 'Sparkles'}
                          className="w-5 h-5 text-amber-600 dark:text-amber-400 relative z-10 drop-shadow-sm"
                        />
                      </div>
                      <div className="min-w-0 min-w-[140px] max-w-[240px] flex-[0_1_240px]">
                        <Input
                          aria-label="Prize name"
                          className="h-7 text-[10px] px-1.5 w-full min-w-0 font-semibold"
                          disabled
                          value={`${p.name} (built-in)`}
                          readOnly
                        />
                      </div>
                      <div className="flex shrink-0 flex-col w-14">
                        <Input
                          type="number"
                          min={0}
                          disabled
                          aria-label="Points"
                          className="h-7 text-[10px] px-1"
                          value={String(p.points ?? 0)}
                          readOnly
                        />
                      </div>
                      <div className="flex shrink-0 flex-col w-14">
                        <Input
                          disabled
                          aria-label="Quantity"
                          className="h-7 text-[10px] px-1"
                          placeholder="∞"
                          value=""
                          readOnly
                        />
                      </div>
                      <div className="flex shrink-0 flex-col items-center">
                        <AutoCircularToggles
                          record={p}
                          defs={[{ key: 'inStock', label: 'In Stock', shortLabel: 'In stock' }]}
                          onToggle={() => {}}
                        />
                      </div>
                      <div className="flex shrink-0 flex-col w-16">
                        <Input
                          className="h-7 text-[10px] px-1 font-mono w-full"
                          disabled
                          aria-label="Icon name"
                          value={p.icon || 'Sparkles'}
                          readOnly
                        />
                      </div>
                      <div className="flex shrink-0 items-center justify-end gap-0.5 ml-auto pr-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">System</span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={p.id}
                    className={cn(
                      "grid grid-cols-[28px_36px_minmax(140px,240px)_56px_56px_72px_64px_56px_64px_96px] items-center gap-x-2 rounded-2xl border bg-secondary/30 p-1.5 transition-all hover:bg-background group min-w-0",
                      rowDimmed && "opacity-60"
                    )}
                  >
                    {/* 1. Edit Button (Moved from Actions) */}
                    <div className="flex items-center">
                      {onEditPrize ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                          disabled={!canEditFull}
                          title="Edit item"
                          onClick={() => onEditPrize(p)}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                    </div>

                    {/* 2. Icon/Image (Identity) */}
                    <div className={cn("size-9 rounded-lg flex items-center justify-center bg-background border relative overflow-hidden", !p.inStock && "opacity-40 grayscale")}>
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
                      <DynamicIcon name={p.icon || 'Gift'} className="w-5 h-5 text-primary relative z-10 drop-shadow-sm" />
                    </div>

                    {/* 3. Name (Identity) */}
                    <div className="min-w-0">
                      <div className="relative min-w-0">
                        <Input
                          aria-label="Prize name"
                          className={cn("h-7 text-[10px] px-1.5 w-full min-w-0", vendingEnabled && p.vendingMotor?.enabled && "pr-10", !p.inStock && "opacity-70")}
                          disabled={!canEditFull}
                          defaultValue={p.name}
                          key={`name-${p.id}-${p.name}`}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next && next !== p.name) onUpdatePrize({ ...p, name: next });
                          }}
                        />
                        {vendingEnabled && p.vendingMotor?.enabled ? (
                          <span
                            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-px text-[8px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            title={`Motor axis: ${p.vendingMotor.axis}`}
                          >
                            <Cog className="h-2.5 w-2.5" />
                            {p.vendingMotor.axis}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* 4. Points (Cost) */}
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

                    {/* 5. Qty (Stock) */}
                    <div>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canEditFull}
                        aria-label="Quantity"
                        className="h-7 text-[10px] px-1"
                        placeholder="∞"
                        title="Leave blank for unlimited stock"
                        defaultValue={p.stockCount === undefined ? '' : String(p.stockCount)}
                        key={`stock-${p.id}-${p.stockCount ?? 'x'}`}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === '' ? undefined : Math.max(0, parseInt(raw, 10) || 0);
                          if (next !== p.stockCount) onUpdatePrize({ ...p, stockCount: next });
                        }}
                      />
                    </div>

                    {/* 6. STK/PRT Toggles (Status) */}
                    <div className="flex flex-col items-center">
                      <AutoCircularToggles
                        record={p}
                        defs={[
                          { key: 'inStock', label: 'In Stock', shortLabel: 'In stock' },
                          { key: 'offerPrintTicketOnRedeem', label: 'Offer print voucher', shortLabel: 'Print' }
                        ]}
                        onToggle={(key, val) => {
                          onUpdatePrize({ ...p, [key]: val });
                        }}
                      />
                    </div>

                    {/* 7. Icon Name (Metadata) */}
                    <div>
                      <Input
                        className="h-7 text-[10px] px-1 font-mono w-full"
                        disabled={!canEditFull}
                        aria-label="Icon name"
                        placeholder="Gift"
                        defaultValue={p.icon || 'Gift'}
                        key={`icon-${p.id}-${p.icon}`}
                        onBlur={(e) => {
                          const next = (e.target.value.trim() || 'Gift') as string;
                          if (next !== p.icon) onUpdatePrize({ ...p, icon: next });
                        }}
                      />
                    </div>

                    {/* 8. Teachers (Access) */}
                    <div className="flex flex-col gap-0.5">
                      {mode === 'teacher' ? (
                        <>
                          <div className="flex items-center justify-center h-7 rounded-md border bg-background">
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
                        </>
                      ) : (
                        <>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-7 w-full text-[10px] px-1 font-semibold"
                                disabled={!canEditFull}
                                aria-label="Teacher restrictions"
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
                        </>
                      )}
                    </div>

                    {/* 9. Class (Access) */}
                    <div className="flex flex-col gap-0.5">
                      <Select
                        value={p.classId || 'all'}
                        disabled={!canEditFull}
                        onValueChange={(v) => onUpdatePrize({ ...p, classId: v === 'all' ? undefined : v })}
                      >
                        <SelectTrigger className="h-7 text-[10px] px-1 w-full">
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

                    {/* 10. Actions (Remaining) */}
                    <div className="flex items-center justify-end gap-0.5 pr-1">
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
                      ) : null}

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
                      {(mode === 'admin' || canDelete) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10"
                          disabled={mode === 'teacher' && !canDelete}
                          title={mode === 'teacher' ? 'Delete item you created' : 'Delete item'}
                          onClick={() => onDeletePrize(p.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })()
            ))}
        </ul>
      </CardContent>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How items work</DialogTitle>
            <DialogDescription>Quick overview of item settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
                            <p><span className="font-bold">Items</span> are rewards students redeem using points in the rewards shop.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-bold">Points</span>: cost per redemption.</li>
              <li><span className="font-bold">In Stock</span>: whether it appears in the shop.</li>
              <li><span className="font-bold">Qty</span>: optional inventory. Blank = unlimited.</li>
              <li><span className="font-bold">Print</span>: if on, the shop offers a redeem voucher after redemption.</li>
              <li><span className="font-bold">Teachers</span>: pick multiple teachers or school-wide.</li>
              <li><span className="font-bold">Class</span>: optionally restrict by class.</li>
              <li><span className="font-bold">Vending motor</span>: enable the Vending Machine feature in settings, then use the prize motor button to pick axis X/Y/Z/E.</li>
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
            <DialogDescription>Step-by-step creation with explanations.</DialogDescription>
          </DialogHeader>
          {wizardStep === 0 && (
            <div className="space-y-3 text-sm">
              <p>This wizard guides you through creating a prize, understanding each option, and how redemption works.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-bold">Set</span> name, icon, points, stock.</li>
                <li><span className="font-bold">Choose</span> printing and who can redeem.</li>
                                <li><span className="font-bold">Then</span> test redemption in the rewards shop.</li>
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
                <Label>Quantity (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Leave blank for unlimited"
                  value={wStockCount}
                  onChange={(e) => setWStockCount(e.target.value)}
                  disabled={!wInStock}
                />
                <p className="text-xs text-muted-foreground">If set, each redemption reduces inventory.</p>
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
                  <li><span className="font-bold">Qty</span>: {wStockCount.trim() ? wStockCount.trim() : 'Unlimited'}</li>
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
    </Card>
  );
}
