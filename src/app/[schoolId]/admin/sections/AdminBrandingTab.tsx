'use client';

import { useState } from 'react';
import { Loader2, Trash2, UploadCloud, Palette } from 'lucide-react';
import type { DocumentReference, Firestore } from 'firebase/firestore';
import { updateDoc, setDoc } from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Helper } from '@/components/ui/helper';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ThemeGeneratorModal } from '@/components/ThemeGeneratorModal';
import { normalizeStudentTheme } from '@/lib/themeContrast';
import type { StudentTheme } from '@/lib/types';

export function AdminBrandingTab({
  schoolId,
  firestore,
  schoolDocRef,
  schoolData,
  logoPreviewUrl,
  setLogoPreviewUrl,
  previousSchoolLogos,
  isPreviousLogosOpen,
  setIsPreviousLogosOpen,
  logoDisplayMode,
  setLogoDisplayMode,
  handleLogoUpload,
  handleRemoveLogo,
  isLogoUploading,
  toast,
  playSound,
}: {
  schoolId: string | null | undefined;
  firestore: Firestore | null;
  schoolDocRef: DocumentReference | null;
  schoolData: { logoUrl?: string; logoHistory?: { url?: string; uploadedAt?: number }[] } | null | undefined;
  logoPreviewUrl: string | null;
  setLogoPreviewUrl: (v: string | null) => void;
  previousSchoolLogos: string[];
  isPreviousLogosOpen: boolean;
  setIsPreviousLogosOpen: (v: boolean) => void;
  logoDisplayMode: 'cover' | 'contain';
  setLogoDisplayMode: (v: 'cover' | 'contain') => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveLogo: () => void;
  isLogoUploading: boolean;
  toast: (args: { variant?: 'default' | 'destructive'; title: string; description?: string }) => void;
  playSound: (...args: any[]) => void;
}) {
  const currentLogo = logoPreviewUrl ?? schoolData?.logoUrl;
  const { settings, updateSettings } = useSettings();
  const [isDefaultThemeModalOpen, setIsDefaultThemeModalOpen] = useState(false);

  const handleSchoolDefaultThemeSave = (theme: StudentTheme) => {
    const normalized = normalizeStudentTheme(theme);
    if (!normalized) return;
    updateSettings({ defaultStudentTheme: normalized });
    setIsDefaultThemeModalOpen(false);
    playSound('success');
    toast({ title: 'Default theme updated', description: 'Student ID cards and kiosks will now use this look.' });
  };

  const handleClearSchoolDefaultTheme = () => {
    updateSettings({ defaultStudentTheme: null });
    playSound('click');
    toast({ title: 'Default theme cleared', description: 'Reverting to standard system style.' });
  };

  return (
    <div className="space-y-6">
      {/* LOGO CARD */}
      <Card className="border-t-4 border-primary shadow-md">
        <CardHeader className="py-6">
          <Helper content="Upload your school logo to show it next to the school name across the app.">
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" /> School Logo
            </CardTitle>
          </Helper>
          <CardDescription>Logo appears beside the school name in the header. PNG, JPG, or WebP under 5MB.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <div className="relative group">
              <div className={cn(
                "h-24 w-auto min-w-[6rem] max-w-[240px] bg-transparent flex items-center justify-center text-xs font-semibold text-muted-foreground transition-all duration-300",
                settings.logoDropShadow === 'sm' && 'drop-shadow-sm',
                settings.logoDropShadow === 'md' && 'drop-shadow-md',
                settings.logoDropShadow === 'lg' && 'drop-shadow-xl',
              )}>
                {currentLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentLogo}
                    alt="Current school logo"
                    className={cn(
                      "h-full w-auto object-contain transition-all duration-300",
                      logoDisplayMode === 'cover' && 'w-full object-cover',
                      settings.logoBorderRadius === 'sm' && 'rounded-sm',
                      settings.logoBorderRadius === 'md' && 'rounded-md',
                      settings.logoBorderRadius === 'lg' && 'rounded-2xl',
                      settings.logoBorderRadius === 'full' && 'rounded-full'
                    )}
                  />
                ) : (
                  <span className="h-20 w-20 rounded-full bg-muted border border-border/60 flex items-center justify-center shadow-lg shadow-primary/30">No logo</span>
                )}
              </div>
              {currentLogo && (
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove logo"
                  disabled={isLogoUploading}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-2">Current</span>
            <div className="mt-2 flex flex-col items-center gap-1">
              {previousSchoolLogos.length >= 1 ? (
                <>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-[11px] h-auto p-0 text-muted-foreground"
                    onClick={() => setIsPreviousLogosOpen(true)}
                  >
                    View previous logos
                  </Button>
                  <Dialog open={isPreviousLogosOpen} onOpenChange={setIsPreviousLogosOpen}>
                    <DialogContent size="sm">
                      <DialogHeader>
                        <DialogTitle>Previous School Logos</DialogTitle>
                        <DialogDescription>Select a previous logo to restore it.</DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-wrap justify-center gap-4 py-4 max-h-[400px] overflow-y-auto">
                        {previousSchoolLogos.map((url, idx) => (
                          <button
                            key={`${url}-${idx}`}
                            type="button"
                            onClick={async () => {
                              if (!schoolDocRef || !firestore || !schoolId) return;
                              try {
                                await updateDoc(schoolDocRef, { logoUrl: url });
                                await setDoc(
                                  schoolPublicDocRef(firestore, schoolId),
                                  { logoUrl: url, active: true, updatedAt: Date.now() },
                                  { merge: true },
                                );
                                setLogoPreviewUrl(url ?? null);
                                playSound('success');
                                toast({ title: 'Logo restored', description: 'Using selected previous logo.' });
                                setIsPreviousLogosOpen(false);
                              } catch (e) {
                                toast({ variant: 'destructive', title: 'Failed to restore logo', description: String(e) });
                              }
                            }}
                            className="h-24 w-24 rounded-2xl overflow-hidden border-2 border-border hover:border-primary transition-all bg-muted/60 flex-shrink-0"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt="Previous logo"
                              className={logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
                            />
                          </button>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsPreviousLogosOpen(false)}>
                          Close
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground text-center max-w-[200px]">
                  Previous logos will appear here after you upload new ones.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Display Mode</Label>
              <div className="flex gap-2">
                {(['contain', 'cover'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLogoDisplayMode(mode)}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold transition-all ${
                      logoDisplayMode === mode ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {mode === 'contain' ? 'Fit' : 'Fill'}
                  </button>
                ))}
              </div>

              <Label className="text-xs font-bold uppercase text-muted-foreground pt-2 block">Rounding</Label>
              <div className="flex flex-wrap gap-1">
                {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateSettings({ logoBorderRadius: r })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                      settings.logoBorderRadius === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <Label className="text-xs font-bold uppercase text-muted-foreground pt-2 block">Shadow</Label>
              <div className="flex flex-wrap gap-1">
                {(['none', 'sm', 'md', 'lg'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateSettings({ logoDropShadow: s })}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                      settings.logoDropShadow === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-logo">Upload new logo</Label>
              <Input
                id="school-logo"
                type="file"
                className="text-xs"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleLogoUpload}
                disabled={!schoolId || isLogoUploading}
              />
              {isLogoUploading && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Square image recommended, at least 128×128px.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STUDENT PHOTO STYLING */}
      <Card className="shadow-md border-l-4 border-indigo-500">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-lg">Student Photo Styling</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Customize how student profile photos appear across the app and on ID cards.
              </p>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Display Mode</Label>
                  <div className="flex gap-1">
                    {(['contain', 'cover'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateSettings({ photoDisplayMode: mode })}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                          settings.photoDisplayMode === mode ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {mode === 'contain' ? 'Fit' : 'Fill'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Rounding</Label>
                  <div className="flex flex-wrap gap-1">
                    {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => updateSettings({ photoBorderRadius: r })}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                          settings.photoBorderRadius === r ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Shadow</Label>
                  <div className="flex flex-wrap gap-1">
                    {(['none', 'sm', 'md', 'lg'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateSettings({ photoDropShadow: s })}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                          settings.photoDropShadow === s ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <div className={cn(
                "w-32 h-32 bg-white dark:bg-slate-800 border-2 border-indigo-500/20 overflow-hidden transition-all duration-300",
                settings.photoBorderRadius === 'none' && 'rounded-none',
                settings.photoBorderRadius === 'sm' && 'rounded-sm',
                settings.photoBorderRadius === 'md' && 'rounded-md',
                settings.photoBorderRadius === 'lg' && 'rounded-2xl',
                settings.photoBorderRadius === 'full' && 'rounded-full',
                settings.photoDropShadow === 'none' && 'drop-shadow-none',
                settings.photoDropShadow === 'sm' && 'drop-shadow-sm',
                settings.photoDropShadow === 'md' && 'drop-shadow-md',
                settings.photoDropShadow === 'lg' && 'drop-shadow-xl',
              )}>
                <img 
                  src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" 
                  alt="Preview" 
                  className={cn(
                    "w-full h-full transition-all duration-300",
                    settings.photoDisplayMode === 'cover' ? 'object-cover' : 'object-contain'
                  )}
                />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Photo Preview</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* THEME CARD */}
      <Card className="border-t-4 border-primary shadow-md">
        <CardHeader className="py-6">
          <Helper content="Configure the default visual theme for student ID cards and kiosks.">
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" /> Default ID Card Theme
            </CardTitle>
          </Helper>
          <CardDescription>
            This theme is used for Kiosk, prize shop, and ID cards when a student has no individual theme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold"
              onClick={() => {
                setIsDefaultThemeModalOpen(true);
                playSound('click');
              }}
            >
              {settings.defaultStudentTheme ? 'Edit default theme' : 'Set default theme'}
            </Button>
            {settings.defaultStudentTheme && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs font-bold text-muted-foreground"
                onClick={handleClearSchoolDefaultTheme}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ThemeGeneratorModal
        isOpen={isDefaultThemeModalOpen}
        onOpenChange={setIsDefaultThemeModalOpen}
        studentName="School default"
        currentTheme={settings.defaultStudentTheme || undefined}
        onSave={handleSchoolDefaultThemeSave}
        onRemoveTheme={() => {
          handleClearSchoolDefaultTheme();
        }}
      />
    </div>
  );
}
