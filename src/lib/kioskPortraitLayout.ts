import { cn } from '@/lib/utils';

export type KioskPortraitSettings = {
  kioskPortraitDisplay?: boolean;
  /** @deprecated Renamed — still read for schools that saved the old key. */
  studentPortalPortraitDisplay?: boolean;
};

/** School setting: kiosk screens run on a portrait-mounted display. */
export function isKioskPortraitDisplay(settings: KioskPortraitSettings | undefined): boolean {
  return (
    settings?.kioskPortraitDisplay === true || settings?.studentPortalPortraitDisplay === true
  );
}

/** Portal hub outer scroll shell (`/[schoolId]/portal`). */
export function portalChoosePageShellClass(portrait: boolean, isAppDisplay: boolean): string {
  if (!portrait) return '';
  return cn(
    isAppDisplay
      ? 'px-3 pb-20 pt-[max(5rem,calc(env(safe-area-inset-top,0px)+3.5rem))]'
      : 'px-3 pb-6 pt-10 sm:pt-12',
  );
}

/** Portal “Where to?” headline when portrait kiosk. */
export function portalChooseTitleClass(portrait: boolean, isAppDisplay: boolean): string {
  if (!portrait) return '';
  return cn(
    isAppDisplay
      ? 'px-2 py-1 text-4xl sm:text-5xl'
      : 'px-2 py-2 text-5xl sm:text-6xl',
  );
}

/** Portal card grid container on portrait kiosk. */
export function portalChooseGridClass(portrait: boolean): string {
  return portrait ? 'max-w-[min(20rem,calc(100%-0.5rem))] gap-2.5' : '';
}
