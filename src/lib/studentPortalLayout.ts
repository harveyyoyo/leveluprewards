import { cn } from '@/lib/utils';

export type StudentPortalPortraitSettings = {
  studentPortalPortraitDisplay?: boolean;
};

/** School setting: student home is shown on a portrait-mounted display. */
export function isStudentPortalPortraitDisplay(
  settings: StudentPortalPortraitSettings | undefined,
): boolean {
  return settings?.studentPortalPortraitDisplay === true;
}

/** Outer shell on `/student-home` (login, loading, disabled states). */
export function studentPortalPageShellClass(portrait: boolean): string {
  return cn(
    'flex w-full flex-col items-center',
    portrait
      ? 'min-h-dvh justify-start px-3 py-4 sm:px-4'
      : 'min-h-[calc(100vh-5rem)] justify-center px-4 py-10',
  );
}

/** Main dashboard / login content width and vertical rhythm. */
export function studentPortalContentClass(portrait: boolean): string {
  return cn(
    'mx-auto w-full',
    portrait ? 'max-w-md space-y-4 px-0.5 py-2' : 'max-w-3xl space-y-6 px-4 py-8',
  );
}

/** Login card width on the sign-in screen. */
export function studentPortalLoginCardClass(portrait: boolean): string {
  return cn(
    'w-full border-t-8 border-primary shadow-lg',
    portrait ? 'max-w-md' : 'max-w-lg',
  );
}
