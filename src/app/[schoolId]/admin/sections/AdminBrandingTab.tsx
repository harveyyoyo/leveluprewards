'use client';

import { useState } from 'react';
import {
  Loader2,
  Trash2,
  UploadCloud,
  Palette,
  User,
  Shield,
  Clock,
  Megaphone,
  Tv,
  Image as ImageIcon,
  Sparkles,
  Maximize2,
  RotateCcw,
  Check,
  Calendar,
} from 'lucide-react';
import type { DocumentReference, Firestore } from 'firebase/firestore';
import { updateDoc, setDoc } from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Helper } from '@/components/ui/helper';
import { useSettings } from '@/components/providers/SettingsProvider';
import { ThemeGeneratorModal } from '@/components/ThemeGeneratorModal';
import { normalizeStudentTheme } from '@/lib/themeContrast';
import type { StudentTheme } from '@/lib/types';
import { cn } from '@/lib/utils';
import { KioskSponsorBanner } from '@/components/KioskSponsorBanner';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';

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
  const [newSponsorDate, setNewSponsorDate] = useState('');
  const [newSponsorMessage, setNewSponsorMessage] = useState('');
  const [newSponsorLink, setNewSponsorLink] = useState('');
  const [newSponsorLogo, setNewSponsorLogo] = useState('');
  const [newSponsorStyle, setNewSponsorStyle] = useState<'primary' | 'subtle' | 'neon_gold' | 'electric' | 'gradient' | 'glass'>('primary');
  const [newSponsorSpeed, setNewSponsorSpeed] = useState<'slow' | 'normal' | 'fast' | 'very_fast' | 'static'>('normal');
  const [newSponsorPosition, setNewSponsorPosition] = useState<'top' | 'bottom'>('bottom');
  const [newSponsorIcon, setNewSponsorIcon] = useState('🎉');
  const [section, setSection] = useState<'logo' | 'photos' | 'theme' | 'sessions' | 'sponsor'>('logo');

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
      <ContentSectionTreeNav
        branchLabel="Branding & Identity"
        items={[
          { id: 'logo', label: 'School Logo' },
          { id: 'photos', label: 'Student Photos' },
          { id: 'theme', label: 'ID Card Theme' },
          { id: 'sessions', label: 'Session Timeouts' },
          { id: 'sponsor', label: 'Sponsor Banner' },
        ]}
        value={section}
        onValueChange={(id) => setSection(id as typeof section)}
        className="bg-muted/50 p-1.5 rounded-2xl border"
      />

      {/* 1. SCHOOL LOGO */}
      {section === 'logo' && (
        <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <Helper content="Upload your school's official logo. It will appear next to the school name across all headers, kiosk stations, and printed receipts.">
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                  <UploadCloud className="w-5 h-5 text-primary" />
                  School Logo
                </CardTitle>
              </Helper>
              <TabWalkthroughHeaderAction />
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Logo Preview Panel */}
              <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 rounded-3xl border bg-muted/5 relative overflow-hidden group min-h-[220px]">
                <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
                <div className={cn(
                  "relative max-w-[200px] max-h-[140px] flex items-center justify-center transition-all duration-300",
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
                        "h-32 w-auto object-contain transition-all duration-300",
                        logoDisplayMode === 'cover' && 'w-full object-cover',
                        settings.logoBorderRadius === 'sm' && 'rounded-sm',
                        settings.logoBorderRadius === 'md' && 'rounded-md',
                        settings.logoBorderRadius === 'lg' && 'rounded-2xl',
                        settings.logoBorderRadius === 'full' && 'rounded-full'
                      )}
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-3xl bg-muted border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon className="w-8 h-8 opacity-40" />
                      <span className="text-[11px] font-bold tracking-wider uppercase opacity-60">No Logo</span>
                    </div>
                  )}

                  {currentLogo && (
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-3 -right-3 bg-destructive hover:bg-destructive/90 text-white rounded-full p-2 shadow-md transition-all hover:scale-110"
                      title="Remove logo"
                      disabled={isLogoUploading}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-6 flex flex-col items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Active Identity Logo</span>
                  {previousSchoolLogos.length >= 1 ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto py-1 px-3 rounded-lg text-primary hover:bg-primary/5 font-bold"
                        onClick={() => setIsPreviousLogosOpen(true)}
                      >
                        Restore previous logo
                      </Button>
                      <Dialog open={isPreviousLogosOpen} onOpenChange={setIsPreviousLogosOpen}>
                        <DialogContent className="sm:max-w-md rounded-3xl">
                          <DialogHeader>
                            <DialogTitle className="text-lg font-bold">Restore Previous Logo</DialogTitle>
                            <DialogDescription className="text-sm">Select an older upload to roll back to that visual brand.</DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-3 gap-4 py-4 max-h-[300px] overflow-y-auto pr-1">
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
                                className="h-20 w-full rounded-2xl overflow-hidden border-2 border-border hover:border-primary bg-muted/30 p-2 transition-all hover:scale-102 flex items-center justify-center group"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt="Previous logo"
                                  className="h-full w-auto object-contain transition-transform group-hover:scale-105"
                                />
                              </button>
                            ))}
                          </div>
                          <DialogFooter>
                            <Button variant="outline" className="rounded-xl font-bold" onClick={() => setIsPreviousLogosOpen(false)}>
                              Close
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Logo Layout Controls */}
              <div className="lg:col-span-2 space-y-6">
                {/* Upload Area */}
                <div className="space-y-2">
                  <Label htmlFor="school-logo" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload New Asset</Label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      id="school-logo"
                      type="file"
                      className="text-xs rounded-xl shadow-sm cursor-pointer bg-muted/20 file:font-semibold"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleLogoUpload}
                      disabled={!schoolId || isLogoUploading}
                    />
                    {isLogoUploading && (
                      <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2 shrink-0">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Uploading…
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Supported extensions: PNG, JPG, JPEG, and WebP under 10MB. We recommend uploading high-contrast square shapes (min. 256x256px).
                  </p>
                </div>

                {/* Preset Option Grids */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scaling Mode</Label>
                    <div className="flex bg-muted/65 p-1 rounded-xl gap-1">
                      {(['contain', 'cover'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setLogoDisplayMode(mode)}
                          className={cn(
                            'flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all uppercase tracking-wider',
                            logoDisplayMode === mode
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {mode === 'contain' ? 'Fit' : 'Fill'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corner Rounding</Label>
                    <div className="flex flex-wrap bg-muted/65 p-1 rounded-xl gap-1">
                      {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateSettings({ logoBorderRadius: r })}
                          className={cn(
                            'flex-1 min-w-[32px] py-1 px-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                            settings.logoBorderRadius === r
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Drop Shadow</Label>
                    <div className="flex flex-wrap bg-muted/65 p-1 rounded-xl gap-1">
                      {(['none', 'sm', 'md', 'lg'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateSettings({ logoDropShadow: s })}
                          className={cn(
                            'flex-1 min-w-[32px] py-1 px-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                            settings.logoDropShadow === s
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. STUDENT PHOTO STYLING */}
      {section === 'photos' && (
        <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <Helper content="Adjust visual styles applied to student portrait photos on badges, leaderboards, and dashboard accounts.">
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                  <User className="w-5 h-5 text-indigo-500" />
                  Student Photo Styling
                </CardTitle>
              </Helper>
              <TabWalkthroughHeaderAction />
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Photo Controls Panel */}
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fitting Mode</Label>
                  <div className="flex bg-muted/50 p-1.5 rounded-2xl gap-1 max-w-xs">
                    {(['contain', 'cover'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateSettings({ photoDisplayMode: mode })}
                        className={cn(
                          'flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-wider',
                          settings.photoDisplayMode === mode
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-muted-foreground hover:bg-muted/80',
                        )}
                      >
                        {mode === 'contain' ? 'Fit' : 'Fill'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">"Fill" will crop photos to cover the entire space, whereas "Fit" adds letterbox bars to maintain proportions.</p>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corners Rounding</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => {
                      const active = settings.photoBorderRadius === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateSettings({ photoBorderRadius: r })}
                          className={cn(
                            'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border',
                            active
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-600/10'
                              : 'bg-card border-border hover:bg-muted/40 text-muted-foreground',
                          )}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Depth Shadow</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['none', 'sm', 'md', 'lg'] as const).map((s) => {
                      const active = settings.photoDropShadow === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => updateSettings({ photoDropShadow: s })}
                          className={cn(
                            'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border',
                            active
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-600/10'
                              : 'bg-card border-border hover:bg-muted/40 text-muted-foreground',
                          )}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Photo Preview Card */}
              <div className="lg:col-span-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800/80">
                <div className={cn(
                  "w-36 h-36 bg-white dark:bg-slate-800 border-2 border-indigo-500/10 overflow-hidden transition-all duration-300",
                  settings.photoBorderRadius === 'none' && 'rounded-none',
                  settings.photoBorderRadius === 'sm' && 'rounded-sm',
                  settings.photoBorderRadius === 'md' && 'rounded-md',
                  settings.photoBorderRadius === 'lg' && 'rounded-3xl',
                  settings.photoBorderRadius === 'full' && 'rounded-full',
                  settings.photoDropShadow === 'none' && 'drop-shadow-none',
                  settings.photoDropShadow === 'sm' && 'drop-shadow-sm',
                  settings.photoDropShadow === 'md' && 'drop-shadow-md',
                  settings.photoDropShadow === 'lg' && 'drop-shadow-xl',
                )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://api.dicebear.com/9.x/avataaars/svg?seed=Felix"
                    alt="Preview"
                    className={cn(
                      "w-full h-full transition-all duration-300",
                      settings.photoDisplayMode === 'cover' ? 'object-cover' : 'object-contain'
                    )}
                  />
                </div>
                <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rendering Preview</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. ID CARD THEME */}
      {section === 'theme' && (
        <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <Helper content="Configure card background gradients, font themes, and textures as default presets for students, kiosk panels, and printouts.">
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                  <Palette className="w-5 h-5 text-primary" />
                  Default Student ID Card Theme
                </CardTitle>
              </Helper>
              <TabWalkthroughHeaderAction />
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="rounded-3xl border bg-muted/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground">Interactive Theme Designer</h4>
                <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                  Design bespoke color palettes matching your school's exact school colors. We'll automatically enforce AAA color contrast checks for clear, accessible text layouts.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto">
                <Button
                  type="button"
                  onClick={() => {
                    setIsDefaultThemeModalOpen(true);
                    playSound('click');
                  }}
                  className="rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 flex-1 sm:flex-initial"
                >
                  <Palette className="w-4 h-4 mr-2" />
                  {settings.defaultStudentTheme ? 'Customize Theme' : 'Configure Brand Theme'}
                </Button>
                {settings.defaultStudentTheme && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearSchoolDefaultTheme}
                    className="rounded-xl font-bold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 border-border"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Standard
                  </Button>
                )}
              </div>
            </div>

            {settings.defaultStudentTheme && (
              <div className="rounded-3xl border p-6 flex flex-col items-center justify-center bg-muted/10 relative min-h-[160px]">
                <div
                  className="w-full max-w-md rounded-2xl p-5 border shadow-xl flex items-center justify-between relative overflow-hidden"
                  style={{
                    background: settings.defaultStudentTheme.backgroundStyle || settings.defaultStudentTheme.cardBackground || '#ffffff',
                    borderColor: settings.defaultStudentTheme.primary || 'rgba(0,0,0,0.1)',
                  }}
                >
                  <div>
                    <h5
                      className="font-black text-sm tracking-wide uppercase"
                      style={{ color: settings.defaultStudentTheme.text || '#000000' }}
                    >
                      LevelUp Student ID
                    </h5>
                    <p
                      className="text-xs font-bold mt-1 opacity-80"
                      style={{ color: settings.defaultStudentTheme.accent || '#555555' }}
                    >
                      School Brand Standard
                    </p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase border"
                    style={{
                      backgroundColor: settings.defaultStudentTheme.cardBackground || '#ffffff',
                      borderColor: settings.defaultStudentTheme.primary || 'rgba(0,0,0,0.1)',
                      color: settings.defaultStudentTheme.text || '#000000',
                    }}
                  >
                    Kiosk Default
                  </div>
                </div>
              </div>
            )}

            <ThemeGeneratorModal
              isOpen={isDefaultThemeModalOpen}
              onOpenChange={setIsDefaultThemeModalOpen}
              studentName="School default"
              currentTheme={settings.defaultStudentTheme || undefined}
              onSave={handleSchoolDefaultThemeSave}
              onRemoveTheme={handleClearSchoolDefaultTheme}
            />
          </CardContent>
        </Card>
      )}

      {/* 4. SESSION TIMEOUTS */}
      {section === 'sessions' && (
        <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <Helper content="Adjust active login durations, student sign-in freeze locks, and screensaver reset timers.">
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                  <Shield className="w-5 h-5 text-amber-500" />
                  Security & Session Timeouts
                </CardTitle>
              </Helper>
              <TabWalkthroughHeaderAction />
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Admin */}
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 hover:border-amber-500/20 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
                    <Clock className="w-5 h-5" />
                  </div>
                  <Label htmlFor="admin-timeout" className="font-bold text-sm text-foreground">Admin Session Timeout</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Auto-log out teachers and admins after consecutive minutes of inactivity. Keep schools secure.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t">
                  <Input
                    id="admin-timeout"
                    type="number"
                    min={1}
                    max={1440}
                    value={Math.round((settings.adminSessionTimeoutMs ?? 300000) / 60000)}
                    onChange={(e) => {
                      const mins = Math.max(1, parseInt(e.target.value) || 1);
                      updateSettings({ adminSessionTimeoutMs: mins * 60000 });
                    }}
                    className="w-24 font-bold rounded-xl text-center"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Minutes</span>
                </div>
              </div>

              {/* Card 2: Kiosk Timeout */}
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 hover:border-amber-500/20 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
                    <Tv className="w-5 h-5" />
                  </div>
                  <Label htmlFor="kiosk-timeout" className="font-bold text-sm text-foreground">Kiosk Idle Reset</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Automatically return to the scan screen on the kiosk if a student leaves it idle.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t">
                  <Input
                    id="kiosk-timeout"
                    type="number"
                    min={1}
                    max={300}
                    value={settings.kioskSessionTimeoutSec ?? 10}
                    onChange={(e) => {
                      const secs = Math.max(1, parseInt(e.target.value) || 10);
                      updateSettings({ kioskSessionTimeoutSec: secs });
                    }}
                    className="w-24 font-bold rounded-xl text-center"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Seconds</span>
                </div>
              </div>

              {/* Card 3: Voucher Timeout */}
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 hover:border-indigo-500/10 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-4">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <Label htmlFor="kiosk-voucher-timeout" className="font-bold text-sm text-foreground">Voucher Modal Pause</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If no tap is received during printed voucher redemption prompts, pause auto-print until another tap.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t">
                  <Input
                    id="kiosk-voucher-timeout"
                    type="number"
                    min={1}
                    max={14400}
                    value={settings.kioskVoucherIdleOffSec ?? 360}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      const secs = Number.isFinite(n) ? Math.min(14400, Math.max(1, n)) : 360;
                      updateSettings({ kioskVoucherIdleOffSec: secs });
                    }}
                    className="w-24 font-bold rounded-xl text-center"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Seconds</span>
                </div>
              </div>

              {/* Card 4: Sign-in Freeze */}
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 hover:border-emerald-500/10 transition-all flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4">
                    <Shield className="w-5 h-5" />
                  </div>
                  <Label htmlFor="signin-freeze" className="font-bold text-sm text-foreground">Duplicate Tap Freeze Lock</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Prevent students from duplicate sign-ins by blocking subsequent scans for a freeze window. (0 to disable)
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t">
                  <Input
                    id="signin-freeze"
                    type="number"
                    min={0}
                    max={3600}
                    value={settings.studentSignInFreezeSec ?? 0}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      const secs = Number.isFinite(n) ? Math.min(3600, Math.max(0, n)) : 0;
                      updateSettings({ studentSignInFreezeSec: secs });
                    }}
                    className="w-24 font-bold rounded-xl text-center"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Seconds</span>
                </div>
              </div>

              {/* Card 5: Welcome Splash */}
              <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4 hover:border-purple-500/10 transition-all flex flex-col justify-between md:col-span-2">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <Label htmlFor="welcome-back-duration" className="font-bold text-sm text-foreground">Welcome Back Splash Duration</Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Number of seconds the personalized kiosk celebration screen stays active when checking in before auto-routing back.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t">
                  <Input
                    id="welcome-back-duration"
                    type="number"
                    min={1}
                    max={60}
                    value={settings.studentWelcomeBackDurationSec ?? 3}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      const secs = Number.isFinite(n) ? Math.min(60, Math.max(1, n)) : 3;
                      updateSettings({ studentWelcomeBackDurationSec: secs });
                    }}
                    className="w-24 font-bold rounded-xl text-center"
                  />
                  <span className="text-xs font-semibold text-muted-foreground">Seconds</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. SPONSOR BANNER */}
      {section === 'sponsor' && (
        <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <Helper content="Highlight local businesses, PTA announcements, or milestone notes on student-facing kiosk screens.">
                <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-indigo-500" />
                  Kiosk Sponsor & Announcement Banners
                </CardTitle>
              </Helper>
              <TabWalkthroughHeaderAction />
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-8">
            {/* Live Preview Container */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">Live Kiosk Preview</Label>
              <div className="rounded-2xl overflow-hidden shadow-inner border bg-slate-100 dark:bg-slate-900 min-h-[90px] flex items-center justify-center p-3 relative">
                {(!settings.kioskSponsorEnabled && !settings.kioskSponsorSchedules?.length) ? (
                  <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <Tv className="w-4 h-4" /> Sponsor banner is currently disabled.
                  </p>
                ) : (!settings.kioskSponsorMessage?.trim() && !settings.kioskSponsorLogoUrl?.trim() && !settings.kioskSponsorLink?.trim()) ? (
                  <p className="text-xs font-semibold text-muted-foreground">Add a banner message or logo below to generate the output preview.</p>
                ) : (
                  <div className="w-full relative overflow-hidden rounded-xl">
                    <KioskSponsorBanner
                      previewOverride={{
                        message: settings.kioskSponsorMessage || 'Thanks to our sponsor',
                        link: settings.kioskSponsorLink,
                        logoUrl: settings.kioskSponsorLogoUrl,
                        speed: settings.kioskSponsorSpeed,
                        position: settings.kioskSponsorPosition,
                        bannerStyle: settings.kioskSponsorBannerStyle,
                        icon: settings.kioskSponsorIcon
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between rounded-2xl border bg-muted/15 p-5 shadow-sm">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-bold text-foreground">Enable Default Sponsor Banner</p>
                <p className="text-xs text-muted-foreground mt-0.5">Show this announcement scrolling at all times on standard kiosk checks.</p>
              </div>
              <Switch
                id="kioskSponsorEnabledBranding"
                checked={!!settings.kioskSponsorEnabled}
                onCheckedChange={(checked) => updateSettings({ kioskSponsorEnabled: checked })}
              />
            </div>

            {/* Customizer Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="kioskSponsorMessageBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sponsor Message</Label>
                <Input
                  id="kioskSponsorMessageBranding"
                  placeholder="e.g. Proudly sponsored by Acme Corp · Visit us at acme.com"
                  value={settings.kioskSponsorMessage || ''}
                  onChange={(e) => updateSettings({ kioskSponsorMessage: e.target.value })}
                  className="rounded-xl"
                  maxLength={300}
                />
                <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                  <span>{(settings.kioskSponsorMessage || '').length}/300 characters</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kioskSponsorLinkBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Website or CTA link</Label>
                <Input
                  id="kioskSponsorLinkBranding"
                  placeholder="e.g. https://acme.com"
                  value={settings.kioskSponsorLink || ''}
                  onChange={(e) => updateSettings({ kioskSponsorLink: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kioskSponsorLogoUrlBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Custom Logo Image URL</Label>
                <Input
                  id="kioskSponsorLogoUrlBranding"
                  placeholder="e.g. https://example.com/logo.png"
                  value={settings.kioskSponsorLogoUrl || ''}
                  onChange={(e) => updateSettings({ kioskSponsorLogoUrl: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kioskSponsorBannerStyleBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Banner Style Preset</Label>
                <Select
                  value={settings.kioskSponsorBannerStyle || 'primary'}
                  onValueChange={(val: any) => updateSettings({ kioskSponsorBannerStyle: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary Brand Color</SelectItem>
                    <SelectItem value="subtle">Subtle Slate</SelectItem>
                    <SelectItem value="neon_gold">🌟 Neon Gold</SelectItem>
                    <SelectItem value="electric">⚡ Electric Blue</SelectItem>
                    <SelectItem value="gradient">🌈 Hyper Gradient</SelectItem>
                    <SelectItem value="glass">🔮 Glassmorphic Blur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kioskSponsorSpeedBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Scroll Speed</Label>
                <Select
                  value={settings.kioskSponsorSpeed || 'normal'}
                  onValueChange={(val: any) => updateSettings({ kioskSponsorSpeed: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="very_fast">Very Fast</SelectItem>
                    <SelectItem value="static">Static Banner (No scrolling)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kioskSponsorPositionBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kiosk Position</Label>
                <Select
                  value={settings.kioskSponsorPosition || 'bottom'}
                  onValueChange={(val: any) => updateSettings({ kioskSponsorPosition: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom">Bottom of screen</SelectItem>
                    <SelectItem value="top">Top of screen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kioskSponsorIconBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Emoji Prefix</Label>
                <Input
                  id="kioskSponsorIconBranding"
                  placeholder="🎉"
                  value={settings.kioskSponsorIcon || ''}
                  onChange={(e) => updateSettings({ kioskSponsorIcon: e.target.value })}
                  className="rounded-xl"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Scheduled announcements section */}
            <div className="col-span-2 pt-8 border-t space-y-6">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-foreground">Scheduled Date Announcements</h4>
                <p className="text-xs text-muted-foreground">Automatically swap out the standard banner for highly targeted schedules on specific calendar dates.</p>
              </div>

              {/* Form card */}
              <div className="p-6 bg-muted/15 rounded-3xl border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Target Calendar Date</Label>
                    <Input
                      type="date"
                      value={newSponsorDate}
                      onChange={(e) => setNewSponsorDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Emoji prefix</Label>
                    <Input
                      placeholder="🎉"
                      value={newSponsorIcon}
                      onChange={(e) => setNewSponsorIcon(e.target.value)}
                      className="rounded-xl"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Sponsor / Announcement Message</Label>
                    <Input
                      placeholder="e.g. Teacher Appreciation Week sponsored by LevelUp PTG!"
                      value={newSponsorMessage}
                      onChange={(e) => setNewSponsorMessage(e.target.value)}
                      className="rounded-xl"
                      maxLength={300}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">CTA link</Label>
                    <Input
                      placeholder="https://acme.com"
                      value={newSponsorLink}
                      onChange={(e) => setNewSponsorLink(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Custom Sponsor Logo URL</Label>
                    <Input
                      placeholder="https://example.com/logo.png"
                      value={newSponsorLogo}
                      onChange={(e) => setNewSponsorLogo(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Theme Style</Label>
                    <Select value={newSponsorStyle} onValueChange={(val: any) => setNewSponsorStyle(val)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primary">Primary Brand Color</SelectItem>
                        <SelectItem value="subtle">Subtle Slate</SelectItem>
                        <SelectItem value="neon_gold">Neon Gold</SelectItem>
                        <SelectItem value="electric">Electric Blue</SelectItem>
                        <SelectItem value="gradient">Hyper Gradient</SelectItem>
                        <SelectItem value="glass">Glassmorphic Blur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Scroll Speed</Label>
                    <Select value={newSponsorSpeed} onValueChange={(val: any) => setNewSponsorSpeed(val)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="slow">Slow</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                        <SelectItem value="very_fast">Very Fast</SelectItem>
                        <SelectItem value="static">Static Banner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    if (!newSponsorDate || !newSponsorMessage) {
                      toast({ variant: 'destructive', title: 'Missing fields', description: 'Date and scheduled message are required.' });
                      return;
                    }
                    const newItem = {
                      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                      date: newSponsorDate,
                      message: newSponsorMessage,
                      link: newSponsorLink || undefined,
                      logoUrl: newSponsorLogo || undefined,
                      bannerStyle: newSponsorStyle,
                      speed: newSponsorSpeed,
                      position: newSponsorPosition,
                      icon: newSponsorIcon || undefined,
                    };
                    updateSettings({
                      kioskSponsorSchedules: [...(settings.kioskSponsorSchedules || []), newItem],
                    });
                    setNewSponsorDate('');
                    setNewSponsorMessage('');
                    setNewSponsorLink('');
                    setNewSponsorLogo('');
                    setNewSponsorIcon('🎉');
                    toast({ title: 'Schedule added', description: `Sponsor banner scheduled for ${newSponsorDate}` });
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold py-2.5 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>+ Schedule Announcement</span>
                </Button>
              </div>

              {/* Scheduled listings */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Configured Announcements</h5>
                {(settings.kioskSponsorSchedules || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground bg-muted/5 border border-dashed p-6 rounded-2xl text-center">
                    No date-specific schedules configured yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(settings.kioskSponsorSchedules || []).map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-muted/10 border rounded-2xl hover:bg-muted/20 transition-colors">
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {s.date}
                            </span>
                            <span className="text-xs font-bold text-foreground truncate max-w-sm">
                              {s.message}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 flex-wrap font-medium">
                            <span>Style: <span className="text-foreground/80">{s.bannerStyle || 'primary'}</span></span>
                            <span>Speed: <span className="text-foreground/80">{s.speed || 'normal'}</span></span>
                            {s.link && <span>Link: <span className="text-foreground/80">{s.link}</span></span>}
                            {s.logoUrl && <span>Logo: <span className="text-foreground/80">Custom</span></span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 shrink-0 h-9 w-9 rounded-xl"
                          onClick={() => {
                            updateSettings({
                              kioskSponsorSchedules: (settings.kioskSponsorSchedules || []).filter(item => item.id !== s.id),
                            });
                            toast({ title: 'Schedule removed', description: 'The scheduled sponsor banner has been removed.' });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
