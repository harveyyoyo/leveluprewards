'use client';

import { useState } from 'react';
import { updateDoc, type DocumentReference, type Firestore } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { Coupon as CouponPreview } from '@/components/coupons/Coupon';
import type { Database } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/* ── helpers ── */

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="flex gap-2">
        <Input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-9 p-0.5 cursor-pointer shrink-0 rounded-lg border-2" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono uppercase text-xs h-9" />
      </div>
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

/* ── component ── */

export type AdminCurrencyDesignTabProps = {
  schoolId: string;
  firestore: Firestore | null;
  schoolDocRef: DocumentReference | null;
  schoolData: Database | null | undefined;
};

export function AdminCurrencyDesignTab({
  schoolId,
  firestore,
  schoolDocRef,
  schoolData,
}: AdminCurrencyDesignTabProps) {
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const cs = schoolData?.currencySettings;

  // ── Shared state ──
  const [currencyMode, setCurrencyMode] = useState<'points' | 'money'>(cs?.mode || 'points');
  const [pointsDesign, setPointsDesign] = useState(cs?.pointsDesign || '⭐');
  const [moneyDesign, setMoneyDesign] = useState(cs?.moneyDesign || '💵');

  // ── Points coupon styling ──
  const [couponBgColor, setCouponBgColor] = useState(cs?.couponBgColor || '#ffffff');
  const [couponTextColor, setCouponTextColor] = useState(cs?.couponTextColor || '#000000');
  const [couponBorderColor, setCouponBorderColor] = useState(cs?.couponBorderColor || '#94a3b8');
  const [couponBorderStyle, setCouponBorderStyle] = useState<'dotted' | 'dashed' | 'solid'>(cs?.couponBorderStyle || 'dotted');
  const [pointsTitle, setPointsTitle] = useState(cs?.pointsTitle || '');
  const [pointsShowSchoolName, setPointsShowSchoolName] = useState(cs?.pointsShowSchoolName ?? true);
  const [pointsShowBarcode, setPointsShowBarcode] = useState(cs?.pointsShowBarcode ?? true);
  const [pointsShowDomain, setPointsShowDomain] = useState(cs?.pointsShowDomain ?? true);

  // ── Money bill design ──
  const [moneyBgColor, setMoneyBgColor] = useState(cs?.moneyBgColor || '#e8f5e9');
  const [moneyAccentColor, setMoneyAccentColor] = useState(cs?.moneyAccentColor || '#2e7d32');
  const [moneyTextColor, setMoneyTextColor] = useState(cs?.moneyTextColor || '#1b5e20');
  const [moneyDenominationPrefix, setMoneyDenominationPrefix] = useState(cs?.moneyDenominationPrefix ?? '$');
  const [moneyBillTitle, setMoneyBillTitle] = useState(cs?.moneyBillTitle || 'SCHOOL BUCKS');
  const [moneyBorderStyle, setMoneyBorderStyle] = useState<'ornate' | 'classic' | 'simple'>(cs?.moneyBorderStyle || 'ornate');
  const [moneyShowSerial, setMoneyShowSerial] = useState(cs?.moneyShowSerial ?? true);
  const [moneyShowGuilloche, setMoneyShowGuilloche] = useState(cs?.moneyShowGuilloche ?? true);
  const [moneyShowSchoolName, setMoneyShowSchoolName] = useState(cs?.moneyShowSchoolName ?? true);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!firestore || !schoolDocRef) return;
    setIsSaving(true);
    try {
      await updateDoc(schoolDocRef, {
        'currencySettings.mode': currencyMode,
        'currencySettings.pointsDesign': pointsDesign,
        'currencySettings.moneyDesign': moneyDesign,
        // Points coupon
        'currencySettings.couponBgColor': couponBgColor,
        'currencySettings.couponTextColor': couponTextColor,
        'currencySettings.couponBorderColor': couponBorderColor,
        'currencySettings.couponBorderStyle': couponBorderStyle,
        'currencySettings.pointsTitle': pointsTitle,
        'currencySettings.pointsShowSchoolName': pointsShowSchoolName,
        'currencySettings.pointsShowBarcode': pointsShowBarcode,
        'currencySettings.pointsShowDomain': pointsShowDomain,
        // Money bill
        'currencySettings.moneyBgColor': moneyBgColor,
        'currencySettings.moneyAccentColor': moneyAccentColor,
        'currencySettings.moneyTextColor': moneyTextColor,
        'currencySettings.moneyDenominationPrefix': moneyDenominationPrefix,
        'currencySettings.moneyBillTitle': moneyBillTitle,
        'currencySettings.moneyBorderStyle': moneyBorderStyle,
        'currencySettings.moneyShowSerial': moneyShowSerial,
        'currencySettings.moneyShowGuilloche': moneyShowGuilloche,
        'currencySettings.moneyShowSchoolName': moneyShowSchoolName,
      });
      playSound('success');
      toast({ title: 'Currency & Design settings saved' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

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
    color: couponBorderColor,
    used: false,
    printed: false,
  };

  const previewCurrency = currencyMode === 'money'
    ? {
        mode: 'money' as const,
        icon: moneyDesign,
        label: 'Money',
        moneyBgColor,
        moneyAccentColor,
        moneyTextColor,
        moneyDenominationPrefix,
        moneyBillTitle,
        moneyBorderStyle,
        moneyShowSerial,
        moneyShowGuilloche,
        moneyShowSchoolName,
      }
    : {
        mode: 'points' as const,
        icon: pointsDesign,
        label: 'Points',
        couponBgColor,
        couponTextColor,
        couponBorderColor,
        couponBorderStyle,
        pointsTitle,
        pointsShowSchoolName,
        pointsShowBarcode,
        pointsShowDomain,
      };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            Currency & Coupon Design
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">

          {/* ── Mode Selector ── */}
          <div className="space-y-4 mb-8">
            <Label className="text-lg font-bold">Reward System</Label>
            <div className="flex gap-4">
              <div
                className={cn(
                  "flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  currencyMode === 'points' ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => setCurrencyMode('points')}
              >
                <div className={cn("font-bold text-lg mb-1", currencyMode === 'points' ? 'text-primary' : '')}>⭐ Points</div>
                <div className="text-sm">Classic coupon-style reward system</div>
              </div>
              <div
                className={cn(
                  "flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  currencyMode === 'money' ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500 shadow-sm" : "border-border hover:bg-muted/50 text-muted-foreground"
                )}
                onClick={() => setCurrencyMode('money')}
              >
                <div className={cn("font-bold text-lg mb-1", currencyMode === 'money' ? 'text-emerald-600' : '')}>💵 Fake Money</div>
                <div className="text-sm">Dollar-bill style reward system</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-10">

            {/* ── Left: Controls ── */}
            <div className="space-y-6 min-w-0">
              {/* Emoji pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Points Icon</Label>
                  <Input value={pointsDesign} onChange={(e) => setPointsDesign(e.target.value)} placeholder="⭐" maxLength={10} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Money Icon</Label>
                  <Input value={moneyDesign} onChange={(e) => setMoneyDesign(e.target.value)} placeholder="💵" maxLength={10} className="h-9" />
                </div>
              </div>

              <div className="border-t pt-6">
                {currencyMode === 'points' ? (
                  /* ── Points Coupon Styling ── */
                  <div className="space-y-5">
                    <Label className="text-base font-bold flex items-center gap-2">
                      ⭐ Points Coupon Designer
                    </Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-xs font-semibold">Custom Title (Optional)</Label>
                        <Input value={pointsTitle} onChange={(e) => setPointsTitle(e.target.value)} placeholder="e.g. REWARD COUPON" maxLength={30} className="h-9 font-bold uppercase" />
                        <div className="text-[10px] text-muted-foreground">Leave blank to use the default app name.</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <ColorField label="Background" value={couponBgColor} onChange={setCouponBgColor} />
                      <ColorField label="Text Color" value={couponTextColor} onChange={setCouponTextColor} />
                      <ColorField label="Border Color" value={couponBorderColor} onChange={setCouponBorderColor} />
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Border Style</Label>
                        <Select value={couponBorderStyle} onValueChange={(v: any) => setCouponBorderStyle(v)}>
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
                      <ToggleField label="School Name" description="Append school name to the title" checked={pointsShowSchoolName} onChange={setPointsShowSchoolName} />
                      <ToggleField label="Barcode/QR Code" description="Show scannable code on the coupon" checked={pointsShowBarcode} onChange={setPointsShowBarcode} />
                      <ToggleField label="App Domain" description="Show LevelUp Rewards domain at the bottom" checked={pointsShowDomain} onChange={setPointsShowDomain} />
                    </div>
                  </div>
                ) : (
                  /* ── Money Bill Designer ── */
                  <div className="space-y-5">
                    <Label className="text-base font-bold flex items-center gap-2">
                      💰 Money Bill Designer
                    </Label>

                    {/* Colors */}
                    <div className="grid grid-cols-3 gap-4">
                      <ColorField label="Bill Background" value={moneyBgColor} onChange={setMoneyBgColor} />
                      <ColorField label="Accent / Border" value={moneyAccentColor} onChange={setMoneyAccentColor} />
                      <ColorField label="Text Color" value={moneyTextColor} onChange={setMoneyTextColor} />
                    </div>

                    {/* Text fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Denomination Prefix</Label>
                        <Input value={moneyDenominationPrefix} onChange={(e) => setMoneyDenominationPrefix(e.target.value)} placeholder="$" maxLength={5} className="h-9 font-bold text-lg" />
                        <div className="text-[10px] text-muted-foreground">e.g. $, €, or leave blank</div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Bill Title</Label>
                        <Input value={moneyBillTitle} onChange={(e) => setMoneyBillTitle(e.target.value)} placeholder="SCHOOL BUCKS" maxLength={30} className="h-9 font-bold uppercase" />
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
                            className={cn(
                              "flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all text-center",
                              moneyBorderStyle === style
                                ? "border-emerald-500 bg-emerald-500/5 shadow-sm"
                                : "border-border hover:bg-muted/50"
                            )}
                            onClick={() => setMoneyBorderStyle(style)}
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
                      <ToggleField label="Guilloche Corners" description="Ornamental corner patterns like real currency" checked={moneyShowGuilloche} onChange={setMoneyShowGuilloche} />
                      <ToggleField label="Serial Number" description="Show coupon code styled as bill serial number" checked={moneyShowSerial} onChange={setMoneyShowSerial} />
                      <ToggleField label="School Name" description="Display school name across the top" checked={moneyShowSchoolName} onChange={setMoneyShowSchoolName} />
                    </div>
                  </div>
                )}
              </div>

              {/* Save */}
              <div className="pt-4">
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto px-8 h-11 font-bold">
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </div>

            {/* ── Right: Live Preview ── */}
            <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-2xl border min-h-[420px] lg:w-[480px]">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-6">Live Preview</h3>
              <div
                style={{ fontSize: currencyMode === 'money' ? '32px' : '36px' }}
                className="pointer-events-none drop-shadow-lg"
              >
                <CouponPreview
                  coupon={previewCoupon}
                  schoolId={schoolId}
                  previewCurrency={previewCurrency}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-6 text-center max-w-[300px]">
                {currencyMode === 'money'
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
