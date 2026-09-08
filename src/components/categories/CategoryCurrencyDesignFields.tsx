'use client';

import { motion } from 'framer-motion';
import type { CategoryCurrencyOverride } from '@/lib/types';
import { Coupon as CouponPreview, type PreviewCurrency } from '@/components/coupons/Coupon';
import { resolveCategoryCurrency } from '@/lib/currency/resolveCategoryCurrency';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const POINTS_ICONS = ['⭐', '🌟', '🏆', '🎖️', '💎', '🔥', '🎯', '✨'];
const MONEY_ICONS = ['💵', '💰', '🪙', '💲', '🏦', '💸'];

const POINTS_THEMES = [
  { name: 'Classic', bg: '#ffffff', text: '#000000', border: '#94a3b8' },
  { name: 'Sunshine', bg: '#fffbeb', text: '#92400e', border: '#f59e0b' },
  { name: 'Sky', bg: '#eff6ff', text: '#1e3a8a', border: '#3b82f6' },
  { name: 'Mint', bg: '#ecfdf5', text: '#065f46', border: '#10b981' },
];

const MONEY_THEMES = [
  { name: 'Greenback', bg: '#e8f5e9', accent: '#2e7d32', text: '#1b5e20' },
  { name: 'Gold', bg: '#fef9e7', accent: '#b8860b', text: '#78350f' },
  { name: 'Purple', bg: '#f3e8ff', accent: '#7e22ce', text: '#4c1d95' },
];

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer p-0.5"
          aria-label={label}
        />
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 font-mono text-xs uppercase"
        />
      </div>
    </div>
  );
}

type CategoryCurrencyDesignFieldsProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: CategoryCurrencyOverride;
  onChange: (next: CategoryCurrencyOverride) => void;
  schoolCurrency: PreviewCurrency;
  schoolId?: string | null;
  categoryName: string;
  points: number;
  color?: string;
};

export function CategoryCurrencyDesignFields({
  enabled,
  onEnabledChange,
  value,
  onChange,
  schoolCurrency,
  schoolId,
  categoryName,
  points,
  color,
}: CategoryCurrencyDesignFieldsProps) {
  const isMoney = value.mode === 'money';
  const icons = isMoney ? MONEY_ICONS : POINTS_ICONS;
  const iconValue = isMoney ? value.moneyDesign || '💵' : value.pointsDesign || '⭐';

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="cat-currency-override" className="text-sm font-bold">
            Custom currency & design
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Override the school-wide look. Printed coupons for this category use this design.
          </p>
        </div>
        <Switch id="cat-currency-override" checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled ? (
        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { type: 'spring', stiffness: 420, damping: 34, staggerChildren: 0.04 },
          }}
          className="space-y-3"
        >
          <RadioGroup
            value={value.mode}
            onValueChange={(mode) => onChange({ ...value, mode: mode as 'points' | 'money' })}
            className="flex flex-wrap gap-4"
          >
            <label className="flex items-center gap-2 text-sm font-semibold">
              <RadioGroupItem value="points" id="cat-currency-points" />
              Points coupon
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <RadioGroupItem value="money" id="cat-currency-money" />
              Money bill
            </label>
          </RadioGroup>

          <div className="space-y-1">
            <Label className="text-xs font-bold">Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {icons.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  title={emoji}
                  onClick={() =>
                    onChange(
                      isMoney ? { ...value, moneyDesign: emoji } : { ...value, pointsDesign: emoji },
                    )
                  }
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg border text-base transition-all hover:scale-110',
                    iconValue === emoji
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border/60',
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {isMoney ? (
            <div className="flex flex-wrap gap-2">
              {MONEY_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      moneyBgColor: theme.bg,
                      moneyAccentColor: theme.accent,
                      moneyTextColor: theme.text,
                    })
                  }
                  className="rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                >
                  {theme.name}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {POINTS_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...value,
                      couponBgColor: theme.bg,
                      couponTextColor: theme.text,
                      couponBorderColor: theme.border,
                    })
                  }
                  className="rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                >
                  {theme.name}
                </button>
              ))}
            </div>
          )}

          {isMoney ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorRow
                label="Bill color"
                value={value.moneyBgColor || '#e8f5e9'}
                onChange={(moneyBgColor) => onChange({ ...value, moneyBgColor })}
              />
              <ColorRow
                label="Accent"
                value={value.moneyAccentColor || '#2e7d32'}
                onChange={(moneyAccentColor) => onChange({ ...value, moneyAccentColor })}
              />
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Bill title</Label>
                <Input
                  value={value.moneyBillTitle || ''}
                  onChange={(e) => onChange({ ...value, moneyBillTitle: e.target.value })}
                  placeholder="SCHOOL BUCKS"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Prefix</Label>
                <Input
                  value={value.moneyDenominationPrefix || '$'}
                  onChange={(e) => onChange({ ...value, moneyDenominationPrefix: e.target.value })}
                  className="h-9"
                  maxLength={3}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <ColorRow
                label="Background"
                value={value.couponBgColor || '#ffffff'}
                onChange={(couponBgColor) => onChange({ ...value, couponBgColor })}
              />
              <ColorRow
                label="Text"
                value={value.couponTextColor || '#000000'}
                onChange={(couponTextColor) => onChange({ ...value, couponTextColor })}
              />
              <ColorRow
                label="Border"
                value={value.couponBorderColor || '#94a3b8'}
                onChange={(couponBorderColor) => onChange({ ...value, couponBorderColor })}
              />
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-muted-foreground">Coupon title</Label>
                <Input
                  value={value.pointsTitle || ''}
                  onChange={(e) => onChange({ ...value, pointsTitle: e.target.value })}
                  placeholder="School default"
                  className="h-9"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-2 rounded-xl border bg-background/80 px-3 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Coupon preview
            </p>
            <div className="coupon-print-preview-shell coupon-print-match-wrapper coupon-print-match-wrapper--30 rounded-xl border bg-muted/40">
              <CouponPreview
                schoolId={schoolId}
                previewCurrency={resolveCategoryCurrency(schoolCurrency, value)}
                coupon={{
                  id: 'preview',
                  code: 'PREVIEW',
                  value: Math.max(0, points),
                  category: categoryName || 'Category',
                  teacher: '',
                  used: false,
                  createdAt: 0,
                  color,
                }}
              />
            </div>
            <p className="text-center text-[10px] italic text-muted-foreground">
              Printed coupons for this category use this look. Other categories keep the school default.
            </p>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
