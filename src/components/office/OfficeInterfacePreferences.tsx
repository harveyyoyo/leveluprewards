'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOfficeLayoutMode } from '@/lib/office/useOfficeLayoutMode';
import { OFFICE_APPEARANCES, OFFICE_COLOR_THEMES, useOfficeAppearance, useOfficeColorTheme } from '@/lib/office/useOfficeColorTheme';
import { cn } from '@/lib/utils';
import { useOfficeHiddenSections } from '@/lib/office/useOfficeHiddenSections';
import { getOfficeNavItems } from '@/lib/office/officeNav';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';

/** Settings → Customize: personal display choices for the School Office on this device. */
export function OfficeInterfacePreferences() {
  const { isWide, setLayoutMode } = useOfficeLayoutMode();
  const { theme, setTheme } = useOfficeColorTheme();
  const { appearance, setAppearance } = useOfficeAppearance();
  const { settings } = useOfficePortalChrome();
  const { hidden, setSectionHidden } = useOfficeHiddenSections();
  const menuSections = getOfficeNavItems(settings).filter((item) => item.id !== 'home');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base font-bold">Customize</h2>
      <p className="text-xs text-muted-foreground">Just for you, on this computer — nobody else&apos;s screen changes.</p>
  <div className="mt-4 space-y-4">
    <div className="rounded-xl border p-4">
      <p className="text-sm font-semibold">Color theme</p>
      <p className="text-xs text-muted-foreground">Changes the menu and button colors.</p>
      <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Color theme">
        {OFFICE_COLOR_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={theme === t.id}
            onClick={() => setTheme(t.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl p-2 text-xs ring-1 transition-colors',
              theme === t.id ? 'ring-2 ring-slate-900 dark:ring-white' : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800',
            )}
          >
            <span className="flex h-8 w-full overflow-hidden rounded-lg" aria-hidden>
              <span className="w-1/2" style={{ backgroundColor: t.menu }} />
              <span className="w-1/2" style={{ backgroundColor: t.swatch }} />
            </span>
            {t.label}
          </button>
        ))}
      </div>
    </div>

    <div className="rounded-xl border p-4">
      <p className="text-sm font-semibold">Light or dark</p>
      <p className="text-xs text-muted-foreground">Dark screens are easier on the eyes in a dim room.</p>
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Light or dark">
        {OFFICE_APPEARANCES.map((a) => {
          const selected = (appearance ?? 'light') === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setAppearance(a.id)}
              className={cn(
                'rounded-xl px-2 py-2 text-xs font-medium ring-1 transition-colors',
                selected ? 'ring-2 ring-slate-900 dark:ring-white' : 'ring-slate-200 hover:bg-slate-50 dark:ring-slate-700 dark:hover:bg-slate-800',
              )}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>

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

    <div className="rounded-xl border p-4">
      <p className="text-sm font-semibold">Show in my menu</p>
      <p className="text-xs text-muted-foreground">
        Turn off sections you don&apos;t use to keep your menu short. This only changes your screen — nothing is
        removed, and you can turn them back on here anytime.
      </p>
      <div className="mt-3 space-y-1">
        {menuSections.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg px-1 py-1.5">
            <Label htmlFor={`office-show-${item.id}`} className="text-sm font-normal">
              {item.label}
            </Label>
            <Switch
              id={`office-show-${item.id}`}
              checked={!hidden.includes(item.id)}
              onCheckedChange={(checked) => setSectionHidden(item.id, !checked)}
            />
          </div>
        ))}
      </div>
    </div>
      </div>
    </section>
  );
}
