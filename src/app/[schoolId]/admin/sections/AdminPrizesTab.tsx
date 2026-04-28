'use client';

import { Cog, Edit3, Gift, Plus, Trash2, HelpCircle, GraduationCap, ShoppingBag, Wand2, UserMinus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DynamicIcon from '@/components/DynamicIcon';
import { cn } from '@/lib/utils';
import type { Prize, Teacher, Class, VendingMotorConfig, PrizeAiFunReward } from '@/lib/types';
import Link from 'next/link';
import { useMemo, useState } from 'react';
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
  onCreatePrize: (p: Omit<Prize, 'id'>) => Promise<void> | void;
  onDeletePrize: (prizeId: string) => void;
  onUpdatePrize: (p: Prize) => void;
  /** When set, "New Prize" opens this (single form) instead of the step wizard. */
  onOpenSimpleNewPrize?: () => void;
  /** Opens the full prize editor modal for the given prize. */
  onEditPrize?: (p: Prize) => void;
}) {
  const { settings } = useSettings();
  const vendingEnabled = settings.enableVendingMachine === true;
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
  const [wAiFun, setWAiFun] = useState<'off' | PrizeAiFunReward>('off');
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
    setWAiFun('off');
    setWTeacherIds([]);
    setWClassId('all');
    setWSchoolWide(false);
  };

  const wizardTitle = useMemo(() => {
    const titles = [
      'Prize Wizard',
      'Step 1: Basic info',
      'Step 2: Cost & stock',
      'Step 3: Options & access',
      'Step 4: Review & redemption',
    ];
    return titles[wizardStep] || 'Prize Wizard';
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
            <Gift className="text-destructive w-5 h-5" /> Prize Shop
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground/60 hover:text-muted-foreground"
              onClick={() => setHelpOpen(true)}
              aria-label="How prizes work"
              title="How prizes work"
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
            <Plus className="mr-2 h-4 w-4" /> New Prize
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2">
          {prizes
            ?.sort((a, b) => a.points - b.points)
            .map((p) => (
              (() => {
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
                  "grid grid-cols-[72px_86px_86px_72px_48px_1fr_104px_128px_92px_56px] items-center gap-2 bg-secondary/30 p-3 rounded-2xl border group transition-all hover:bg-background",
                  rowDimmed && "opacity-60"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center w-[72px]">
                    <Switch
                      checked={p.inStock}
                      disabled={!canEditFull}
                      onCheckedChange={(checked) => onUpdatePrize({ ...p, inStock: checked })}
                      className="data-[state=checked]:bg-primary scale-75"
                    />
                    <p className="text-[9px] font-bold mt-1 tracking-tighter opacity-50 text-center leading-tight max-w-[72px]">
                      {p.inStock ? 'In stock' : 'Out of stock'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center w-[86px]">
                    <Switch
                      checked={p.offerPrintTicketOnRedeem === true}
                      disabled={!canEditFull}
                      onCheckedChange={(checked) => onUpdatePrize({ ...p, offerPrintTicketOnRedeem: checked })}
                      className="data-[state=checked]:bg-primary scale-75"
                    />
                    <p className="text-[10px] font-bold mt-1 uppercase tracking-tighter opacity-50">
                      Print
                    </p>
                </div>
                <div className="flex flex-col gap-0.5 w-[86px]">
                  <Label className="text-[9px] font-bold uppercase tracking-tighter opacity-50 leading-none">Qty</Label>
                  <Input
                    type="number"
                    min={0}
                    disabled={!canEditFull}
                    className="h-8 text-xs px-2"
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
                <div className="flex flex-col gap-0.5 w-[72px]">
                  <Label className="text-[9px] font-bold uppercase tracking-tighter opacity-50 leading-none">Points</Label>
                  <Input
                    type="number"
                    min={0}
                    disabled={!canEditFull}
                    className="h-8 text-xs px-2"
                    defaultValue={String(p.points ?? 0)}
                    key={`points-${p.id}-${p.points}`}
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const next = Math.max(0, parseInt(raw, 10) || 0);
                      if (next !== p.points) onUpdatePrize({ ...p, points: next });
                    }}
                  />
                </div>
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-background border flex-shrink-0 relative overflow-hidden", !p.inStock && "opacity-40 grayscale")}>
                  {p.name && (
                    <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none z-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(p.name)}&backgroundColor=transparent`} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <DynamicIcon name={p.icon || 'Gift'} className="w-6 h-6 text-primary relative z-10" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Label className="text-[9px] font-bold uppercase tracking-tighter opacity-50 leading-none flex items-center gap-1">
                    Name
                    {vendingEnabled && p.vendingMotor?.enabled ? (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        title={`Motor axis: ${p.vendingMotor.axis}`}
                      >
                        <Cog className="h-2.5 w-2.5" />
                        {p.vendingMotor.axis}
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    className={cn("h-8 text-xs px-2 w-full", !p.inStock && "opacity-70")}
                    disabled={!canEditFull}
                    defaultValue={p.name}
                    key={`name-${p.id}-${p.name}`}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next && next !== p.name) onUpdatePrize({ ...p, name: next });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-0.5 w-[104px] min-w-0">
                  <Label className="text-[9px] font-bold uppercase tracking-tighter opacity-50 leading-none">Icon</Label>
                  <Input
                    className="h-8 text-xs px-2 font-mono"
                    disabled={!canEditFull}
                    placeholder="Gift"
                    defaultValue={p.icon || 'Gift'}
                    key={`icon-${p.id}-${p.icon}`}
                    onBlur={(e) => {
                      const next = (e.target.value.trim() || 'Gift') as string;
                      if (next !== p.icon) onUpdatePrize({ ...p, icon: next });
                    }}
                  />
                </div>
                <div className="flex flex-col gap-0.5 w-[128px] min-w-0">
                  {mode === 'teacher' ? (
                    <>
                      <Label className="text-[9px] font-bold uppercase tracking-tighter opacity-50 leading-none">Wide</Label>
                      <div className="flex items-center justify-between h-8 px-2 rounded-md border bg-background">
                        <span className="text-[10px] font-bold opacity-70">School</span>
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
                          className="data-[state=checked]:bg-primary scale-75"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <Label className="text-[9px] font-bold uppercase tracking-tighter opacity-50 leading-none">Teachers</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 w-full text-[10px] px-1.5 font-semibold"
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
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 w-[92px]">
                  <Label className="text-[9px] font-bold uppercase tracking-tighter opacity-50 leading-none">Class</Label>
                  <Select
                    value={p.classId || 'all'}
                    disabled={!canEditFull}
                    onValueChange={(v) => onUpdatePrize({ ...p, classId: v === 'all' ? undefined : v })}
                  >
                    <SelectTrigger className="h-8 text-xs px-2">
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
                <div className="flex items-center justify-end gap-0.5 justify-self-end">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-9 w-9 rounded-full hover:bg-muted',
                          p.aiFunReward ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                        )}
                        disabled={!canEditFull}
                        title="AI joke / riddle / fortune after redeem"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-3 z-[250]" align="end">
                      <div className="space-y-2">
                        <p className="text-sm font-bold leading-tight">AI surprise</p>
                        <p className="text-xs text-muted-foreground leading-snug">
                          After redemption, the kiosk can show one school-safe AI joke, riddle (with answer), or fortune line.
                        </p>
                        <Select
                          value={p.aiFunReward ?? 'off'}
                          onValueChange={(v) => {
                            if (!canEditFull) return;
                            if (v === 'off') onUpdatePrize({ ...p, aiFunReward: undefined });
                            else onUpdatePrize({ ...p, aiFunReward: v as PrizeAiFunReward });
                          }}
                          disabled={!canEditFull}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="off">Off</SelectItem>
                            <SelectItem value="random">Random</SelectItem>
                            <SelectItem value="joke">Joke</SelectItem>
                            <SelectItem value="riddle">Riddle</SelectItem>
                            <SelectItem value="fortune">Fortune cookie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {onEditPrize ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      disabled={!canEditFull}
                      title="Edit prize"
                      onClick={() => onEditPrize(p)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  ) : null}

                  {vendingEnabled ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-9 w-9 rounded-full hover:bg-muted",
                            motorEnabled ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                          )}
                          disabled={!canEditFull}
                          title="Prize vending motor"
                        >
                          <Cog className="w-4 h-4" />
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
                      className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Remove from my prizes (others keep access)"
                      onClick={() => onUpdatePrize(removeTeacherFromPrize(p, teacherId))}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  ) : null}
                  {(mode === 'admin' || canDelete) ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                      disabled={mode === 'teacher' && !canDelete}
                      title={mode === 'teacher' ? 'Delete prize you created' : 'Delete prize'}
                      onClick={() => onDeletePrize(p.id)}
                    >
                      <Trash2 className="w-4 h-4" />
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
            <DialogTitle>How prizes work</DialogTitle>
            <DialogDescription>Quick overview of prize settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p><span className="font-bold">Prizes</span> are items students redeem using points in the Prize Shop.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="font-bold">Points</span>: cost per redemption.</li>
              <li><span className="font-bold">In Stock</span>: whether it appears in the shop.</li>
              <li><span className="font-bold">Qty</span>: optional inventory. Blank = unlimited.</li>
              <li><span className="font-bold">Print</span>: if on, the shop offers a redeem ticket after redemption.</li>
              <li><span className="font-bold">Teachers</span>: pick multiple teachers or school-wide.</li>
              <li><span className="font-bold">Class</span>: optionally restrict by class.</li>
              <li><span className="font-bold">Vending motor</span>: enable the Vending Machine feature in settings, then use the prize motor button to pick axis X/Y/Z/E.</li>
              <li><span className="font-bold">AI surprise</span>: sparkle control — after redemption, show an AI joke, riddle, or fortune on the Prize Shop.</li>
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
                <li><span className="font-bold">Then</span> test redemption in the Prize Shop.</li>
              </ul>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="grid gap-4">
              <div className="space-y-1">
                <Label>Prize name</Label>
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
                  <Label>Print redeem ticket</Label>
                  <p className="text-xs text-muted-foreground">Offer to print a ticket after redemption.</p>
                </div>
                <Switch checked={wOfferPrint} onCheckedChange={setWOfferPrint} />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3">
                <div className="space-y-0.5 min-w-0">
                  <Label>AI surprise after redeem</Label>
                  <p className="text-xs text-muted-foreground">
                    Optional: show a clean AI joke, riddle, or fortune on the Prize Shop after redemption.
                  </p>
                </div>
                <Select value={wAiFun} onValueChange={(v) => setWAiFun(v as 'off' | PrizeAiFunReward)}>
                  <SelectTrigger className="h-9 w-full sm:w-[148px] text-xs shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                    <SelectItem value="joke">Joke</SelectItem>
                    <SelectItem value="riddle">Riddle</SelectItem>
                    <SelectItem value="fortune">Fortune cookie</SelectItem>
                  </SelectContent>
                </Select>
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
                  <li><span className="font-bold">Print ticket</span>: {wOfferPrint ? 'Yes' : 'No'}</li>
                  <li>
                    <span className="font-bold">AI surprise</span>:{' '}
                    {wAiFun === 'off' ? 'Off' : wAiFun === 'random' ? 'Random' : wAiFun === 'fortune' ? 'Fortune cookie' : wAiFun}
                  </li>
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
                  <li>If Print is on, the shop offers a print ticket right after redeeming.</li>
                  <li>If AI surprise is on, the kiosk shows one generated joke, riddle, or fortune after redeeming.</li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline" className="justify-start">
                  <Link href={`/${schoolId}/prize`}><ShoppingBag className="mr-2 h-4 w-4" /> Open Prize Shop</Link>
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
                    ...(wAiFun !== 'off' ? { aiFunReward: wAiFun } : {}),
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

