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
              <div className="h-20 w-auto min-w-[5rem] max-w-[200px] bg-transparent flex items-center justify-center text-xs font-semibold text-muted-foreground drop-shadow-md">
                {currentLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentLogo}
                    alt="Current school logo"
                    className={logoDisplayMode === 'cover' ? 'h-full w-full object-cover rounded-md' : 'h-full w-auto object-contain'}
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
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Current</span>
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

          <div className="space-y-2 flex-1 max-w-sm">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Display</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLogoDisplayMode('contain')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold ${
                  logoDisplayMode === 'contain' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setLogoDisplayMode('cover')}
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-bold ${
                  logoDisplayMode === 'cover' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                Fill (crop)
              </button>
            </div>
            <Label htmlFor="school-logo">Upload new logo</Label>
            <Input
              id="school-logo"
              type="file"
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
