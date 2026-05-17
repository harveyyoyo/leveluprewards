'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Printer } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { Coupon as CouponPreview } from '@/components/Coupon';
import { PrinterReminderCallout } from '@/components/PrinterReminderCallout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useToast } from '@/hooks/use-toast';
import {
  COUPONS_PER_PRINT_PAGE,
  COUPON_PRINT_PAGE_SIZE_OPTIONS,
  generateUniqueCouponCodes,
  normalizeCouponPrintPageSize,
  type CouponPrintPageSize,
} from '@/lib/couponPrint';
import { buildRedemptionPrintNote } from '@/lib/couponRedemptionRules';
import type { Category, Class, Coupon, CouponRedemptionScope, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_COUPON_PRINT_SHEETS = 100;

export type CouponPrintPanelProps = {
  schoolId: string;
  categories: Category[] | null | undefined;
  classes: Class[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  issuerDisplayName?: string;
  className?: string;
};

function localTodayYmd(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

export function CouponPrintPanel({
  schoolId,
  categories,
  classes,
  teachers,
  issuerDisplayName = 'Admin',
  className,
}: CouponPrintPanelProps) {
  const { addCoupons, setCouponsToPrint, addCategory } = useAppContext();
  const { settings } = useSettings();
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const teacherName = issuerDisplayName.trim() || 'Admin';
  const categoryList = categories ?? [];
  const classList = classes ?? [];
  const teacherList = teachers ?? [];

  const [printCategoryId, setPrintCategoryId] = useState('');
  const [printValue, setPrintValue] = useState('10');
  const [printStartsOn, setPrintStartsOn] = useState('');
  const [printExpiresOn, setPrintExpiresOn] = useState('');
  const [printSheetCount, setPrintSheetCount] = useState('1');
  const [printCouponsPerPage, setPrintCouponsPerPage] = useState<CouponPrintPageSize>(COUPONS_PER_PRINT_PAGE);
  const [printRedemptionScope, setPrintRedemptionScope] = useState<CouponRedemptionScope>('school');
  const [printScopeClassIds, setPrintScopeClassIds] = useState<string[]>([]);
  const [printScopeTeacherIds, setPrintScopeTeacherIds] = useState<string[]>([]);
  const [isPrintCategoryDialogOpen, setIsPrintCategoryDialogOpen] = useState(false);
  const [newPrintCategoryName, setNewPrintCategoryName] = useState('');
  const [newPrintCategoryPoints, setNewPrintCategoryPoints] = useState('10');

  useEffect(() => {
    if (categoryList.length > 0 && !printCategoryId) {
      setPrintCategoryId(categoryList[0].id);
    }
  }, [categoryList, printCategoryId]);

  useEffect(() => {
    const category = categoryList.find((c) => c.id === printCategoryId);
    if (category) {
      setPrintValue(category.points.toString());
    }
  }, [printCategoryId, categoryList]);

  useEffect(() => {
    const valid = new Set(classList.map((c) => c.id));
    setPrintScopeClassIds((prev) => prev.filter((id) => valid.has(id)));
  }, [classList]);

  useEffect(() => {
    const valid = new Set(teacherList.map((t) => t.id));
    setPrintScopeTeacherIds((prev) => prev.filter((id) => valid.has(id)));
  }, [teacherList]);

  const computeStartsAt = useCallback(() => {
    if (!printStartsOn) return undefined;
    const date = new Date(printStartsOn + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return undefined;
    return date.getTime();
  }, [printStartsOn]);

  const computeExpiresAt = useCallback(() => {
    if (!printExpiresOn) return undefined;
    if (printExpiresOn < localTodayYmd()) return undefined;
    const date = new Date(printExpiresOn + 'T23:59:59');
    if (Number.isNaN(date.getTime())) return undefined;
    return date.getTime();
  }, [printExpiresOn]);

  const handleCreatePrintCategory = async () => {
    if (!newPrintCategoryName || !newPrintCategoryPoints) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a name and point value for the category.',
      });
      return;
    }
    const points = parseInt(newPrintCategoryPoints, 10);
    if (Number.isNaN(points) || points <= 0) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Invalid Points',
        description: 'Points must be a positive number.',
      });
      return;
    }
    const { pickDistinctCategoryColor } = await import('@/lib/utils');
    const used = categoryList.map((c) => c.color);
    const newCategory = await addCategory({
      name: newPrintCategoryName,
      points,
      color: pickDistinctCategoryColor(used),
    });
    if (newCategory) {
      setPrintCategoryId(newCategory.id);
    }
    setNewPrintCategoryName('');
    setNewPrintCategoryPoints('10');
    setIsPrintCategoryDialogOpen(false);
    playSound('success');
    toast({ title: 'Category Added' });
  };

  const handlePrintSheet = async () => {
    const value = parseInt(printValue, 10);
    const sheets = parseInt(printSheetCount, 10);
    if (!teacherName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'An error occurred. Please try again.' });
      return;
    }
    if (!value || value <= 0) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Invalid Value',
        description: 'Coupon value must be a positive number.',
      });
      return;
    }
    if (Number.isNaN(sheets) || sheets < 1 || sheets > MAX_COUPON_PRINT_SHEETS) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Invalid sheet count',
        description: `Enter between 1 and ${MAX_COUPON_PRINT_SHEETS} sheets (${printCouponsPerPage} coupons per sheet).`,
      });
      return;
    }
    const couponCount = sheets * printCouponsPerPage;
    const selectedCategory = categoryList.find((c) => c.id === printCategoryId);
    if (!selectedCategory) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Category Not Found',
        description: 'Please select a valid category.',
      });
      return;
    }

    if (printExpiresOn && printExpiresOn < localTodayYmd()) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Invalid expiration',
        description: 'Expiration date cannot be before today (the day you print).',
      });
      return;
    }

    if (printStartsOn && printExpiresOn && printStartsOn > printExpiresOn) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Invalid date range',
        description: 'Valid-from date cannot be after the expiration date.',
      });
      return;
    }

    if (printRedemptionScope === 'classes' && printScopeClassIds.length === 0) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Select classes',
        description: 'Choose at least one class, or switch assignment to schoolwide or teachers.',
      });
      return;
    }
    if (printRedemptionScope === 'teachers' && printScopeTeacherIds.length === 0) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Select teachers',
        description: 'Choose at least one teacher, or switch assignment to schoolwide or classes.',
      });
      return;
    }

    const startsAt = computeStartsAt();
    const expiresAt = computeExpiresAt();
    if (startsAt !== undefined && expiresAt !== undefined && startsAt >= expiresAt) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Invalid date range',
        description: 'The coupon must begin before it expires (same calendar day is OK).',
      });
      return;
    }

    const codes = generateUniqueCouponCodes(couponCount);
    const scopeExtra: Partial<Pick<Coupon, 'redemptionScope' | 'allowedClassIds' | 'allowedTeacherIds'>> =
      printRedemptionScope === 'classes'
        ? { redemptionScope: 'classes', allowedClassIds: [...printScopeClassIds] }
        : printRedemptionScope === 'teachers'
          ? { redemptionScope: 'teachers', allowedTeacherIds: [...printScopeTeacherIds] }
          : { redemptionScope: 'school' };

    const redemptionScopeForNote: CouponRedemptionScope =
      printRedemptionScope === 'classes' || printRedemptionScope === 'teachers'
        ? printRedemptionScope
        : 'school';

    const redemptionPrintNote = buildRedemptionPrintNote({
      scope: redemptionScopeForNote,
      issuingTeacherDisplayName: teacherName,
      classNamesInOrder: classList
        .filter((c) => printScopeClassIds.includes(c.id))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => c.name),
      teacherNamesInOrder: teacherList
        .filter((t) => printScopeTeacherIds.includes(t.id))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => t.name),
    });

    const couponsToCreate: Coupon[] = codes.map((code) => ({
      id: code,
      code,
      value,
      category: selectedCategory.name,
      teacher: teacherName,
      used: false,
      createdAt: Date.now(),
      color: selectedCategory.color,
      ...scopeExtra,
      ...(redemptionPrintNote ? { redemptionPrintNote } : {}),
      ...(startsAt !== undefined ? { startsAt } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    }));

    await addCoupons(couponsToCreate);
    setCouponsToPrint(couponsToCreate, { couponsPerPage: printCouponsPerPage });
    playSound('success');
    toast({
      title: 'Coupons ready to print',
      description: `${couponCount} coupon${couponCount === 1 ? '' : 's'} generated.`,
    });
  };

  const selectedCategoryForPreview = categoryList.find((c) => c.id === printCategoryId);
  const redemptionPreviewScope: CouponRedemptionScope =
    printRedemptionScope === 'classes' || printRedemptionScope === 'teachers'
      ? printRedemptionScope
      : 'school';
  const redemptionPreviewNote = buildRedemptionPrintNote({
    scope: redemptionPreviewScope,
    issuingTeacherDisplayName: teacherName,
    classNamesInOrder: classList
      .filter((c) => printScopeClassIds.includes(c.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.name),
    teacherNamesInOrder: teacherList
      .filter((t) => printScopeTeacherIds.includes(t.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => t.name),
  });
  const previewScopeFields: Partial<Pick<Coupon, 'redemptionScope' | 'allowedClassIds' | 'allowedTeacherIds'>> =
    printRedemptionScope === 'classes'
      ? { redemptionScope: 'classes' as const, allowedClassIds: [...printScopeClassIds] }
      : printRedemptionScope === 'teachers'
        ? { redemptionScope: 'teachers' as const, allowedTeacherIds: [...printScopeTeacherIds] }
        : { redemptionScope: 'school' as const };

  const previewStartsAt = computeStartsAt();
  const previewExpiresAt = computeExpiresAt();

  const previewCoupon: Coupon = useMemo(
    () => ({
      id: 'PREVIEW',
      code: '123456',
      value: parseInt(printValue, 10) || 0,
      category: selectedCategoryForPreview?.name || 'Category',
      teacher: teacherName,
      used: false,
      createdAt: Date.now(),
      color: selectedCategoryForPreview?.color,
      ...previewScopeFields,
      ...(redemptionPreviewNote ? { redemptionPrintNote: redemptionPreviewNote } : {}),
      ...(previewStartsAt !== undefined ? { startsAt: previewStartsAt } : {}),
      expiresAt: previewExpiresAt,
    }),
    [
      printValue,
      selectedCategoryForPreview,
      teacherName,
      previewScopeFields,
      redemptionPreviewNote,
      previewStartsAt,
      previewExpiresAt,
    ],
  );

  const sortedTeachers = useMemo(
    () => teacherList.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [teacherList],
  );

  const totalCoupons = (parseInt(printSheetCount, 10) || 0) * printCouponsPerPage;

  return (
    <Card className={cn('w-full border-t-4 border-primary shadow-md overflow-hidden', className)}>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary" aria-hidden>
            <Printer className="w-6 h-6" />
          </div>
          Print coupons
        </CardTitle>
        <CardDescription>
          Generate printable coupons for student kiosk redemption. Choose 10 or 30 coupons per letter page, set how many
          sheets to print, and match each cell to the preview layout.
        </CardDescription>
        <PrinterReminderCallout
          title="Coupon / slip printer"
          message={settings.printerReminderPrizeVouchers}
          className="mt-4 max-w-3xl"
        />
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        {categoryList.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted-foreground/35 bg-muted/10 px-6 py-12 text-center">
            <p className="text-sm font-bold text-foreground">No point categories yet</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Add at least one category under Admin → Point categories before printing coupons here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 w-full space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                    Incentive Category
                  </Label>
                  <div className="flex items-center gap-2">
                    <Select value={printCategoryId} onValueChange={setPrintCategoryId}>
                      <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryList.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={isPrintCategoryDialogOpen} onOpenChange={setIsPrintCategoryDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl shrink-0 bg-slate-50 border-slate-200"
                          type="button"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-black">Add Category</DialogTitle>
                          <DialogDescription>Create a new quick-selection category for rewards.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                          <div className="space-y-2">
                            <Label htmlFor="coupon-print-cat-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                              Name
                            </Label>
                            <Input
                              id="coupon-print-cat-name"
                              value={newPrintCategoryName}
                              onChange={(e) => setNewPrintCategoryName(e.target.value)}
                              className="h-12 rounded-xl bg-slate-50"
                              placeholder="e.g. Extra Recess"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="coupon-print-cat-pts" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                              Default Points
                            </Label>
                            <Input
                              id="coupon-print-cat-pts"
                              type="number"
                              value={newPrintCategoryPoints}
                              onChange={(e) => setNewPrintCategoryPoints(e.target.value)}
                              className="h-12 rounded-xl font-bold bg-slate-50"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            onClick={() => void handleCreatePrintCategory()}
                            className="rounded-2xl h-12 w-full font-black uppercase tracking-widest"
                          >
                            Create Category
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                    Point Value
                  </Label>
                  <Input
                    type="number"
                    value={printValue}
                    onChange={(e) => setPrintValue(e.target.value)}
                    className="h-12 rounded-xl text-lg font-black bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                    Coupons per page
                  </Label>
                  <Select
                    value={String(printCouponsPerPage)}
                    onValueChange={(value) => setPrintCouponsPerPage(normalizeCouponPrintPageSize(Number(value)))}
                  >
                    <SelectTrigger className="h-12 rounded-xl text-lg font-black bg-slate-50 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUPON_PRINT_PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} per page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                    Sheets
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_COUPON_PRINT_SHEETS}
                    value={printSheetCount}
                    onChange={(e) => setPrintSheetCount(e.target.value)}
                    className="h-12 rounded-xl text-lg font-black bg-slate-50 border-slate-200"
                  />
                  <p className="text-[11px] text-muted-foreground px-0.5">Total: {totalCoupons} coupons</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                    Valid from (optional)
                  </Label>
                  <Input
                    type="date"
                    value={printStartsOn}
                    onChange={(e) => setPrintStartsOn(e.target.value)}
                    className="h-12 rounded-xl text-xs font-bold tracking-widest bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide ml-1">
                    Expiration (optional)
                  </Label>
                  <Input
                    type="date"
                    min={localTodayYmd()}
                    value={printExpiresOn}
                    onChange={(e) => setPrintExpiresOn(e.target.value)}
                    className="h-12 rounded-xl text-xs font-bold tracking-widest bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 space-y-4">
                <Label className="text-xs font-semibold uppercase tracking-wide ml-0.5 text-muted-foreground">
                  Assign redemption to
                </Label>
                <p className="text-xs -mt-1 text-muted-foreground">
                  Restrict who can redeem at the student kiosk, or leave schoolwide.
                </p>
                <RadioGroup
                  value={printRedemptionScope}
                  onValueChange={(v) => setPrintRedemptionScope(v as CouponRedemptionScope)}
                  className="grid gap-3 sm:grid-cols-3"
                >
                  <div className="flex items-start gap-2 rounded-xl border p-3 bg-background/80">
                    <RadioGroupItem value="school" id="admin-crs-school" className="mt-1" />
                    <label htmlFor="admin-crs-school" className="text-sm leading-snug cursor-pointer">
                      <span className="font-bold">Schoolwide</span>
                      <span className="block text-xs mt-0.5 text-muted-foreground">
                        Any enrolled student may redeem.
                      </span>
                    </label>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border p-3 bg-background/80">
                    <RadioGroupItem value="classes" id="admin-crs-classes" className="mt-1" />
                    <label htmlFor="admin-crs-classes" className="text-sm leading-snug cursor-pointer">
                      <span className="font-bold">Class(es)</span>
                      <span className="block text-xs mt-0.5 text-muted-foreground">
                        Only students in the classes you select.
                      </span>
                    </label>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border p-3 bg-background/80">
                    <RadioGroupItem value="teachers" id="admin-crs-teachers" className="mt-1" />
                    <label htmlFor="admin-crs-teachers" className="text-sm leading-snug cursor-pointer">
                      <span className="font-bold">Teacher(s)</span>
                      <span className="block text-xs mt-0.5 text-muted-foreground">
                        Students linked to selected teachers (roster or primary class).
                      </span>
                    </label>
                  </div>
                </RadioGroup>
                {printRedemptionScope === 'classes' && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Classes</p>
                    <ScrollArea className="h-40 rounded-xl border p-2 bg-background">
                      <div className="space-y-2 pr-3">
                        {classList.map((cl) => (
                          <label key={cl.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={printScopeClassIds.includes(cl.id)}
                              onCheckedChange={(ch: boolean | 'indeterminate') =>
                                setPrintScopeClassIds((prev) =>
                                  ch === true ? [...prev, cl.id] : prev.filter((id) => id !== cl.id),
                                )
                              }
                            />
                            <span>{cl.name}</span>
                          </label>
                        ))}
                        {classList.length === 0 && (
                          <p className="text-xs text-muted-foreground px-1 py-2">No classes in this school yet.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                {printRedemptionScope === 'teachers' && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Teachers</p>
                    <ScrollArea className="h-40 rounded-xl border p-2 bg-background">
                      <div className="space-y-2 pr-3">
                        {sortedTeachers.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={printScopeTeacherIds.includes(t.id)}
                              onCheckedChange={(ch: boolean | 'indeterminate') =>
                                setPrintScopeTeacherIds((prev) =>
                                  ch === true ? [...prev, t.id] : prev.filter((id) => id !== t.id),
                                )
                              }
                            />
                            <span>{t.name}</span>
                          </label>
                        ))}
                        {sortedTeachers.length === 0 && (
                          <p className="text-xs text-muted-foreground px-1 py-2">No teachers in this school yet.</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={() => void handlePrintSheet()}
                className="w-full font-black text-lg uppercase tracking-widest h-16 rounded-2xl shadow-xl transition-all active:scale-95 group bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Printer className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                Generate &amp; print
              </Button>
            </div>

            <div className="w-full lg:w-80 lg:sticky lg:top-8 shrink-0">
              <div className="rounded-2xl border p-6 flex flex-col items-center shadow-sm bg-slate-50/50 border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-6 text-muted-foreground opacity-70">
                  Print Preview
                </p>
                <div
                  className={cn(
                    'coupon-print-preview-shell coupon-print-match-wrapper rounded-2xl border shadow-2xl border-border/40 bg-slate-100/80',
                    printCouponsPerPage === 30 && 'coupon-print-match-wrapper--30',
                  )}
                >
                  <CouponPreview coupon={previewCoupon} schoolId={schoolId} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-6 text-center italic opacity-60">
                  Each cell on the printed sheet matches this layout.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
