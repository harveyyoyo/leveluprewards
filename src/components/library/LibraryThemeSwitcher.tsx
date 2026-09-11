'use client';

import { Palette, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettings } from '@/components/providers/SettingsProvider';
import {
  LIBRARY_THEME_IDS,
  LIBRARY_THEMES,
  resolveLibraryTheme,
  type LibraryThemeId,
} from '@/lib/library/libraryThemes';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function LibraryThemeSwitcher({ className }: { className?: string }) {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const currentThemeId = (settings.libraryTheme as LibraryThemeId) || 'classic_oak';
  const currentTheme = resolveLibraryTheme(currentThemeId);

  const handleSelect = (id: LibraryThemeId) => {
    updateSettings({ libraryTheme: id });
    const chosen = resolveLibraryTheme(id);
    toast({
      title: `${chosen.label} theme active`,
      description: chosen.tagline,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 rounded-full border border-border/80 bg-background px-3.5 py-1.5 text-xs font-semibold shadow-2xs hover:bg-muted flex items-center gap-2 transition-all shrink-0',
            className
          )}
          aria-label={`Current library theme: ${currentTheme.label} (${currentTheme.styleName}). Click to switch theme.`}
        >
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: currentTheme.swatches.primary }}
          />
          <span className="font-bold text-xs">{currentTheme.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1 text-xs font-black text-muted-foreground flex items-center justify-between">
          <span>Look &amp; Feel Atmosphere</span>
          <span className="text-[10px] font-normal">{currentTheme.styleName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LIBRARY_THEME_IDS.map((id) => {
          const theme = LIBRARY_THEMES[id];
          const isActive = id === currentThemeId;

          return (
            <DropdownMenuItem
              key={id}
              onClick={() => handleSelect(id)}
              className={cn(
                'flex items-center justify-between px-2 py-1.5 text-xs cursor-pointer',
                theme.uiClasses.buttonRadius,
                isActive && 'bg-primary/10 font-bold text-primary'
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">{theme.icon}</span>
                <span className="truncate">{theme.label}</span>
                <span className="text-[10px] text-muted-foreground shrink-0 font-normal">({theme.styleName.split(' ')[0]})</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="h-3 w-3 rounded-full border border-black/10 shadow-xs"
                  style={{ backgroundColor: theme.swatches.primary }}
                />
                {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
