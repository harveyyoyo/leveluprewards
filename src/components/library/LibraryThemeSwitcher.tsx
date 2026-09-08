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
          className={cn('h-9 gap-1.5 rounded-lg border bg-background/80 px-2.5 text-xs font-semibold shadow-sm', className)}
          aria-label={`Current library theme: ${currentTheme.label}. Click to switch theme.`}
        >
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">{currentTheme.icon}</span>
          <span className="hidden md:inline">{currentTheme.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-1 text-xs font-bold text-muted-foreground">
          Library Atmosphere
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
                'flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer',
                isActive && 'bg-primary/10 font-bold text-primary'
              )}
            >
              <div className="flex items-center gap-2">
                <span>{theme.icon}</span>
                <span>{theme.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded-full border border-black/10"
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
