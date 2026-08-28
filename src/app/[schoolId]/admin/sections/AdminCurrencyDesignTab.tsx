'use client';

import { useMemo, useState } from 'react';
import { updateDoc, type DocumentReference, type Firestore } from 'firebase/firestore';
import { Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Coupon as CouponPreview } from '@/components/coupons/Coupon';
import type { Database } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ── helpers ── */

/** Normalizes free-typed color text into a 6-digit hex the native color input accepts. Returns null if unrecognizable. */
function normalizeHex(input: string): string | null {
  const v = (input.trim().startsWith('#') ? input.trim() : `#${input.trim()}`).toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  const shortMatch = v.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (shortMatch) {
    const [, r, g, b] = shortMatch;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const normalized = normalizeHex(value);
  const isInvalid = value.trim().length > 0 && !normalized;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={normalized ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-9 p-0.5 cursor-pointer shrink-0 rounded-lg border-2"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (normalized && normalized !== value.trim().toLowerCase()) onChange(normalized);
          }}
          className={cn('font-mono uppercase text-xs h-9', isInvalid && 'border-destructive text-destructive')}
          aria-invalid={isInvalid}
        />
      </div>
      {isInvalid && <div className="text-[10px] text-destructive">Not a valid hex color, e.g. #2563EB</div>}
    </div>
  );
}

function ToggleField({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {description && <div className="text-xs text-muted-foreground">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

type EmojiPreset = { emoji: string; name: string };

function EmojiPickerField({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: EmojiPreset[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={10} className="h-9 text-center text-lg" aria-label={label} />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {presets.map((p) => (
          <button
            key={p.emoji}
            type="button"
            title={p.name}
            aria-label={p.name}
            onClick={() => onChange(p.emoji)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg border text-base transition-all hover:scale-110 hover:bg-muted',
              value === p.emoji ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border/60',
            )}
          >
            {p.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

type SwatchTheme<T extends Record<string, string>> = { name: string; values: T };

function ThemeSwatchRow<T extends Record<string, string>>({
  themes,
  swatchKeys,
  isActive,
  onApply,
}: {
  themes: SwatchTheme<T>[];
  /** Which keys of a theme's values to render as the little swatch preview (in order). */
  swatchKeys: (keyof T)[];
  isActive: (values: T) => boolean;
  onApply: (values: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {themes.map((theme) => {
        const active = isActive(theme.values);
        return (
          <button
            key={theme.name}
            type="button"
            title={theme.name}
            onClick={() => onApply(theme.values)}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-all hover:bg-muted',
              active ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border/60',
            )}
          >
            <span className="flex -space-x-1">
              {swatchKeys.map((k) => (
                <span
                  key={String(k)}
                  className="h-4 w-4 rounded-full border border-white/60 shadow-sm"
                  style={{ backgroundColor: theme.values[k] }}
                />
              ))}
            </span>
            {theme.name}
          </button>
        );
      })}
    </div>
  );
}

/* ── presets ── */

const POINTS_ICON_PRESETS: EmojiPreset[] = [
  { emoji: '⭐', name: 'Star' },
  { emoji: '🌟', name: 'Glowing star' },
  { emoji: '🏆', name: 'Trophy' },
  { emoji: '🎖️', name: 'Medal' },
  { emoji: '🥇', name: 'Gold medal' },
  { emoji: '💎', name: 'Gem' },
  { emoji: '🔥', name: 'Fire' },
  { emoji: '🎯', name: 'Target' },
  { emoji: '🍀', name: 'Clover' },
  { emoji: '✨', name: 'Sparkles' },
];

const MONEY_ICON_PRESETS: EmojiPreset[] = [
  { emoji: '💵', name: 'Dollar bill' },
  { emoji: '💰', name: 'Money bag' },
  { emoji: '🪙', name: 'Coin' },
  { emoji: '💲', name: 'Dollar sign' },
  { emoji: '🏦', name: 'Bank' },
  { emoji: '💸', name: 'Flying money' },
  { emoji: '🤑', name: 'Money face' },
  { emoji: '🧾', name: 'Receipt' },
];

type PointsThemeValues = { bg: string; text: string; border: string };
const POINTS_THEMES: SwatchTheme<PointsThemeValues>[] = [
  { name: 'Classic', values: { bg: '#ffffff', text: '#000000', border: '#94a3b8' } },
  { name: 'Sunshine', values: { bg: '#fffbeb', text: '#92400e', border: '#f59e0b' } },
  { name: 'Sky', values: { bg: '#eff6ff', text: '#1e3a8a', border: '#3b82f6' } },
  { name: 'Mint', values: { bg: '#ecfdf5', text: '#065f46', border: '#10b981' } },
  { name: 'Berry', values: { bg: '#fdf2f8', text: '#9d174d', border: '#ec4899' } },
  { name: 'Ink', values: { bg: '#0f172a', text: '#f8fafc', border: '#64748b' } },
];

type MoneyThemeValues = { bg: string; accent: string; text: string };
const MONEY_THEMES: SwatchTheme<MoneyThemeValues>[] = [
  { name: 'Greenback', values: { bg: '#e8f5e9', accent: '#2e7d32', text: '#1b5e20' } },
  { name: 'Gold Standard', values: { bg: '#fef9e7', accent: '#b8860b', text: '#78350f' } },
  { name: 'Royal Purple', values: { bg: '#f3e8ff', accent: '#7e22ce', text: '#4c1d95' } },
  { name: 'Crimson Bond', values: { bg: '#fef2f2', accent: '#b91c1c', text: '#7f1d1d' } },
  { name: 'Slate Note', values: { bg: '#f1f5f9', accent: '#334155', text: '#0f172a' } },
];

/* ── component ── */

export type AdminCurrencyDesignTabProps = {
  schoolId: string;
  firestore: Firestore | null;
  schoolDocRef: DocumentReference | null;
  schoolData: Database | null | undefined;
};

type FormState = {
  currencyMode: 'points' | 'money';
  pointsDesign: string;
  moneyDesign: string;
  couponBgColor: string;
  couponTextColor: string;
  couponBorderColor: string;
  couponBorderStyle: 'dotted' | 'dashed' | 'solid';
  pointsTitle: string;
  pointsShowSchoolName: boolean;
  pointsShowBarcode: boolean;
  pointsShowDomain: boolean;
  moneyBgColor: string;
  moneyAccentColor: string;
  moneyTextColor: string;
  moneyDenominationPrefix: string;
  moneyBillTitle: string;
  moneyBorderStyle: 'ornate' | 'classic' | 'simple';
  moneyShowSerial: boolean;
  moneyShowGuilloche: boolean;
  moneyShowSchoolName: boolean;
};

function formStateFromSchool(cs: Database['currencySettings'] | undefined): FormState {
  return {
    currencyMode: cs?.mode || 'points',
    pointsDesign: cs?.pointsDesign || '⭐',
    moneyDesign: cs?.moneyDesign || '💵',
    couponBgColor: cs?.couponBgColor || '#ffffff',
    couponTextColor: cs?.couponTextColor || '#000000',
    couponBorderColor: cs?.couponBorderColor || '#94a3b8',
    couponBorderStyle: cs?.couponBorderStyle || 'dotted',
    pointsTitle: cs?.pointsTitle || '',
    pointsShowSchoolName: cs?.pointsShowSchoolName ?? true,
    pointsShowBarcode: cs?.pointsShowBarcode ?? true,
    pointsShowDomain: cs?.pointsShowDomain ?? true,
    moneyBgColor: cs?.moneyBgColor || '#e8f5e9',
    moneyAccentColor: cs?.moneyAccentColor || '#2e7d32',
    moneyTextColor: cs?.moneyTextColor || '#1b5e20',
    moneyDenominationPrefix: cs?.moneyDenominationPrefix ?? '$',
    moneyBillTitle: cs?.moneyBillTitle || 'SCHOOL BUCKS',
    moneyBorderStyle: cs?.moneyBorderStyle || 'ornate',
    moneyShowSerial: cs?.moneyShowSerial ?? true,
    moneyShowGuilloche: cs?.moneyShowGuilloche ?? true,
    moneyShowSchoolName: cs?.moneyShowSchoolName ?? true,
  };
}

export function AdminCurrencyDesignTab({
  schoolId,
  firestore,
  schoolDocRef,
  schoolData,
}: AdminCurrencyDesignTabProps) {
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const cs = schoolData?.currencySettings;

  const [saved, setSaved] = useState<FormState>(() => formStateFromSchool(cs));
  const [form, setForm] = useState<FormState>(() => formStateFromSchool(cs));
  const [isSaving, setIsSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const handleSave = async () => {
    if (!firestore || !schoolDocRef) return;
    setIsSaving(true);
    try {
      await updateDoc(schoolDocRef, {
        'currencySettings.mode': form.currencyMode,
        'currencySettings.pointsDesign': form.pointsDesign,
        'currencySettings.moneyDesign': form.moneyDesign,
        // Points coupon
        'currencySettings.couponBgColor': form.couponBgColor,
        'currencySettings.couponTextColor': form.couponTextColor,
        'currencySettings.couponBorderColor': form.couponBorderColor,
        'currencySettings.couponBorderStyle': form.couponBorderStyle,
        'currencySettings.pointsTitle': form.pointsTitle,
        'currencySettings.pointsShowSchoolName': form.pointsShowSchoolName,
        'currencySettings.pointsShowBarcode': form.pointsShowBarcode,
        'currencySettings.pointsShowDomain': form.pointsShowDomain,
        // Money bill
        'currencySettings.moneyBgColor': form.moneyBgColor,
        'currencySettings.moneyAccentColor': form.moneyAccentColor,
        'currencySettings.moneyTextColor': form.moneyTextColor,
        'currencySettings.moneyDenominationPrefix': form.moneyDenominationPrefix,
        'currencySettings.moneyBillTitle': form.moneyBillTitle,
        'currencySettings.moneyBorderStyle': form.moneyBorderStyle,
        'currencySettings.moneyShowSerial': form.moneyShowSerial,
        'currencySettings.moneyShowGuilloche': form.moneyShowGuilloche,
        'currencySettings.moneyShowSchoolName': form.moneyShowSchoolName,
      });
      setSaved(form);
      playSound('success');
      toast({ title: 'Currency & Design settings saved' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => setForm(saved);

  const previewCoupon = {
    id: 'preview',
    schoolId,
    code: 'A12345B',
    points: 10,
    value: 10,
    category: 'Good Behavior Award',
    teacher: 'Mr. Teacher',
    teacherId: 't1',
    studentId: 's1',
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    color: form.couponBorderColor,
    used: false,
    printed: false,
  };

  const previewCurrency = form.currencyMode === 'money'
    ? {
        mode: 'money' as const,
        icon: form.moneyDesign,
        label: 'Money',
        moneyBgColor: form.moneyBgColor,
        moneyAccentColor: form.moneyAccentColor,
        moneyTextColor: form.moneyTextColor,
        moneyDenominationPrefix: form.moneyDenominationPrefix,
        moneyBillTitle: form.moneyBillTitle,
        moneyBorderStyle: form.moneyBorderStyle,
        moneyShowSerial: form.moneyShowSerial,
        moneyShowGuilloche: form.moneyShowGuilloche,
        moneyShowSchoolName: form.moneyShowSchoolName,
      }
    : {
        mode: 'points' as const,
        icon: form.pointsDesign,
        label: 'Points',
        couponBgColor: form.couponBgColor,
        couponTextColor: form.couponTextColor,
        couponBorderColor: form.couponBorderColor,
        couponBorderStyle: form.couponBorderStyle,
        pointsTitle: form.pointsTitle,
        pointsShowSchoolName: form.pointsShowSchoolName,
        pointsShowBarcode: form.pointsShowBarcode,
        pointsShowDomain: form.pointsShowDomain,
      };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            Currency & Coupon Design
            {isDirty && (
              <Badge variant="secondary" className="ml-1 font-semibold normal-case tracking-normal">
                Unsaved changes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">

          {/* ── Mode Selector ── */}
          <div className="space-y-4 mb-8">
            <Label className="text-lg font-bold">Reward System</Label>
            <div className="flex gap-4">
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  form.currencyMode === 'points' ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => set('currencyMode', 'points')}
              >
                <div className={cn("font-bold text-lg mb-1", form.currencyMode === 'points' ? 'text-primary' : '')}>⭐ Points</div>
                <div className="text-sm">Classic coupon-style reward system</div>
              </div>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  form.currencyMode === 'money' ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 shadow-sm" : "border-border hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => set('currencyMode', 'money')}
              >
                <div className={cn("font-bold text-lg mb-1", form.currencyMode === 'money' ? 'text-emerald-600' : '')}>💵 Play Money</div>
                <div className="text-sm">Dollar-bill style reward system</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-10">

            {/* ── Left: Controls ── */}
            <div className="space-y-6 min-w-0">
              {/* Emoji pickers */}
              <div className="grid grid-cols-2 gap-4">
                <EmojiPickerField label="Points Icon" value={form.pointsDesign} onChange={(v) => set('pointsDesign', v)} presets={POINTS_ICON_PRESETS} />
                <EmojiPickerField label="Money Icon" value={form.moneyDesign} onChange={(v) => set('moneyDesign', v)} presets={MONEY_ICON_PRESETS} />
              </div>

              <div className="border-t pt-6">
                {form.currencyMode === 'points' ? (
                  /* ── Points Coupon Styling ── */
                  <div className="space-y-5">
                    <Label className="text-base font-bold flex items-center gap-2">
                      ⭐ Points Coupon Designer
                    </Label>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Quick Themes</Label>
                      <ThemeSwatchRow
                        themes={POINTS_THEMES}
                        swatchKeys={['bg', 'border', 'text']}
                        isActive={(v) => v.bg === form.couponBgColor && v.text === form.couponTextColor && v.border === form.couponBorderColor}
                        onApply={(v) => setForm((prev) => ({ ...prev, couponBgColor: v.bg, couponTextColor: v.text, couponBorderColor: v.border }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs font-semibold">Custom Title (Optional)</Label>
                        <Input value={form.pointsTitle} onChange={(e) => set('pointsTitle', e.target.value)} placeholder="e.g. REWARD COUPON" maxLength={30} className="h-9 font-bold uppercase" />
                        <div className="text-[10px] text-muted-foreground">Leave blank to use the default app name.</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <ColorField label="Background" value={form.couponBgColor} onChange={(v) => set('couponBgColor', v)} />
                      <ColorField label="Text Color" value={form.couponTextColor} onChange={(v) => set('couponTextColor', v)} />
                      <ColorField label="Border Color" value={form.couponBorderColor} onChange={(v) => set('couponBorderColor', v)} />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Border Style</Label>
                        <Select value={form.couponBorderStyle} onValueChange={(v: FormState['couponBorderStyle']) => set('couponBorderStyle', v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dotted">Dotted</SelectItem>
                            <SelectItem value="dashed">Dashed</SelectItem>
                            <SelectItem value="solid">Solid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-1">
                      <ToggleField label="School Name" description="Append school name to the title" checked={form.pointsShowSchoolName} onChange={(v) => set('pointsShowSchoolName', v)} />
                      <ToggleField label="Barcode/QR Code" description="Show scannable code on the coupon" checked={form.pointsShowBarcode} onChange={(v) => set('pointsShowBarcode', v)} />
                      <ToggleField label="App Domain" description="Show LevelUp Rewards domain at the bottom" checked={form.pointsShowDomain} onChange={(v) => set('pointsShowDomain', v)} />
                    </div>
                  </div>
                ) : (
                  /* ── Money Bill Designer ── */
                  <div className="space-y-5">
                    <Label className="text-base font-bold flex items-center gap-2">
                      💰 Money Bill Designer
                    </Label>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">Quick Themes</Label>
                      <ThemeSwatchRow
                        themes={MONEY_THEMES}
                        swatchKeys={['bg', 'accent', 'text']}
                        isActive={(v) => v.bg === form.moneyBgColor && v.accent === form.moneyAccentColor && v.text === form.moneyTextColor}
                        onApply={(v) => setForm((prev) => ({ ...prev, moneyBgColor: v.bg, moneyAccentColor: v.accent, moneyTextColor: v.text }))}
                      />
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-3 gap-4">
                      <ColorField label="Bill Background" value={form.moneyBgColor} onChange={(v) => set('moneyBgColor', v)} />
                      <ColorField label="Accent / Border" value={form.moneyAccentColor} onChange={(v) => set('moneyAccentColor', v)} />
                      <ColorField label="Text Color" value={form.moneyTextColor} onChange={(v) => set('moneyTextColor', v)} />
                    </div>

                    {/* Text fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Denomination Prefix</Label>
                        <Input value={form.moneyDenominationPrefix} onChange={(e) => set('moneyDenominationPrefix', e.target.value)} placeholder="$" maxLength={5} className="h-9 font-bold text-lg" />
                        <div className="text-[10px] text-muted-foreground">e.g. $, €, or leave blank</div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Bill Title</Label>
                        <Input value={form.moneyBillTitle} onChange={(e) => set('moneyBillTitle', e.target.value)} placeholder="SCHOOL BUCKS" maxLength={30} className="h-9 font-bold uppercase" />
                        <div className="text-[10px] text-muted-foreground">e.g. TIGER CASH, EAGLE BUCKS</div>
                      </div>
                    </div>

                    {/* Border style */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Border Style</Label>
                      <div className="flex gap-3">
                        {(['ornate', 'classic', 'simple'] as const).map((style) => (
                          <div
                            key={style}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all text-center",
                              form.moneyBorderStyle === style
                                ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
                                : "border-border hover:bg-muted/50"
                            )}
                            onClick={() => set('moneyBorderStyle', style)}
                          >
                            <div className="text-sm font-bold capitalize">{style}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {style === 'ornate' ? 'Double border + inner frame' : style === 'classic' ? 'Double border, dashed inner' : 'Single clean border'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Toggles */}
                    <div className="border-t pt-4 space-y-1">
                      <ToggleField label="Guilloche Corners" description="Ornamental corner patterns like real currency" checked={form.moneyShowGuilloche} onChange={(v) => set('moneyShowGuilloche', v)} />
                      <ToggleField label="Serial Number" description="Show coupon code styled as bill serial number" checked={form.moneyShowSerial} onChange={(v) => set('moneyShowSerial', v)} />
                      <ToggleField label="School Name" description="Display school name across the top" checked={form.moneyShowSchoolName} onChange={(v) => set('moneyShowSchoolName', v)} />
                    </div>
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Button onClick={handleSave} disabled={isSaving || !isDirty} className="px-8 h-11 font-bold">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
                {isDirty && (
                  <Button onClick={handleReset} variant="ghost" disabled={isSaving} className="h-11 font-semibold text-muted-foreground">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Discard changes
                  </Button>
                )}
              </div>
            </div>

            {/* ── Right: Live Preview ── */}
            <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-2xl border min-h-[420px] lg:w-[480px]">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Live Preview</h3>
              <div
                style={{ fontSize: form.currencyMode === 'money' ? '32px' : '36px' }}
                className="pointer-events-none drop-shadow-lg"
              >
                <CouponPreview
                  coupon={previewCoupon}
                  schoolId={schoolId}
                  previewCurrency={previewCurrency}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-6 text-center max-w-[300px]">
                {form.currencyMode === 'money'
                  ? 'This is how your printed money bills will look. Every element above updates the preview in real time.'
                  : 'This is how your printed coupons will look. Adjust colors and styles above.'}
              </p>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
