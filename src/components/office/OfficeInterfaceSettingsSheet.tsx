'use client';

import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useOfficeLayoutMode } from '@/lib/office/useOfficeLayoutMode';
import { officePublicHref } from '@/lib/officePublicUrl';
import Link from 'next/link';
import { useState } from 'react';

type OfficeInterfaceSettingsSheetProps = {
  schoolId: string;
};

export function OfficeInterfaceSettingsSheet({ schoolId }: OfficeInterfaceSettingsSheetProps) {
  const [open, setOpen] = useState(false);
  const { isWide, setLayoutMode } = useOfficeLayoutMode();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-lg"
        onClick={() => setOpen(true)}
        aria-label="Interface and display settings"
        title="Interface"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Interface</SheetTitle>
            <SheetDescription>
              Personal display preferences for School Office on this device.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div>
                <Label htmlFor="office-wide-layout" className="text-sm font-semibold">
                  Wide layout
                </Label>
                <p className="text-xs text-muted-foreground">Use the full screen instead of a centered column.</p>
              </div>
              <Switch
                id="office-wide-layout"
                checked={isWide}
                onCheckedChange={(checked) => setLayoutMode(checked ? 'wide' : 'standard')}
              />
            </div>

            <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
              School-wide options — marks vs grades label, family profiles, bus and medical sections, AI help — are
              in{' '}
              <Link
                href={officePublicHref(schoolId, 'settings')}
                className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                onClick={() => setOpen(false)}
              >
                Office Settings
              </Link>
              .
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
