'use client';

import { useState } from 'react';
import {
  Loader2,
  Trash2,
  UploadCloud,
  Palette,
  User,
  Megaphone,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Calendar,
  Smartphone,
  Plus,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Monitor,
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
import { useSettings, type Settings, type KioskProfile } from '@/components/providers/SettingsProvider';
import { ThemeGeneratorModal } from '@/components/themes/ThemeGeneratorModal';
import { normalizeStudentTheme } from '@/lib/themeContrast';
import type { StudentTheme } from '@/lib/types';
import { cn } from '@/lib/utils';
import { KioskSponsorBanner } from '@/components/kiosk/KioskSponsorBanner';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { OpenSchoolSettingsLink } from '@/components/settings/OpenSchoolSettingsLink';

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
  const [section, setSection] = useState<'logo' | 'photos' | 'theme' | 'sponsor' | 'kiosk_profiles'>('logo');

  // Kiosk Profile Management States
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState('');
  const [editingProfileName, setEditingProfileName] = useState('');
  const [editingProfileSettings, setEditingProfileSettings] = useState<Partial<Settings>>({});
  const [activePreviewProfileId, setActivePreviewProfileId] = useState<string | null>(null);
  const [simulatorOrientation, setSimulatorOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [simulatorScreen, setSimulatorScreen] = useState<'login' | 'welcome' | 'checkout'>('login');

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
          { id: 'sponsor', label: 'Sponsor Banner' },
          { id: 'kiosk_profiles', label: 'Kiosk Profiles' },
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
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.svg"
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
                    Supported extensions: PNG, JPG, JPEG, WebP, and SVG under 10MB. Raster logos can be cropped after upload; SVG uploads as-is. We recommend high-contrast square shapes (min. 256×256px for raster).
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
                    <Monitor className="w-4 h-4" /> Sponsor banner is currently disabled.
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

      {/* 6. KIOSK PROFILES */}
      {section === 'kiosk_profiles' && (
        <>
          <Card className="border-0 bg-background shadow-lg rounded-3xl overflow-hidden">
          <CardHeader className="p-6 md:p-8 border-b bg-gradient-to-r from-muted/50 via-background to-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-amber-500" />
                Kiosk Layout Profiles
              </CardTitle>
              <Button
                onClick={() => {
                  setNewProfileName('');
                  setIsCreateDialogOpen(true);
                  playSound?.('click');
                }}
                className="rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="text-xs text-muted-foreground leading-relaxed max-w-2xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 space-y-3">
              <p className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                💡 Managing Multiple Physical Kiosks
              </p>
              By default, all kiosk screens use your general school settings. Define distinct profiles below (e.g. <em>&ldquo;Portrait Lobby Kiosk&rdquo;</em> vs <em>&ldquo;Landscape Gym Tablet&rdquo;</em>) to enforce specific layout behaviors, active login tabs, sounds, or visual schemes on different screens.
              <div className="flex flex-wrap gap-2 pt-1">
                <OpenSchoolSettingsLink view="general" label="Kiosk defaults (gear menu)" />
                <OpenSchoolSettingsLink view="device" label="Link this device to a profile" />
              </div>
            </div>

            {(() => {
              const profiles = Object.values(settings.kioskProfiles || {});
              if (profiles.length === 0) {
                return (
                  <div className="text-center py-12 border border-dashed rounded-3xl bg-muted/10">
                    <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40 animate-pulse" />
                    <p className="text-sm font-bold text-muted-foreground">No custom profiles defined yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Click the &ldquo;Create Profile&rdquo; button above to create your first customized layout override.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                  {/* Profiles List Column */}
                  <div className={cn("space-y-4", activePreviewProfileId ? "lg:col-span-3" : "lg:col-span-5")}>
                    <div className={cn("grid gap-4", activePreviewProfileId ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3")}>
                      {profiles.map((p) => {
                        const setupUrl = typeof window !== 'undefined'
                          ? `${window.location.origin}/${schoolId}/student?kioskProfileId=${p.id}`
                          : `/${schoolId}/student?kioskProfileId=${p.id}`;
                        const isCurrentlyPreviewed = activePreviewProfileId === p.id;

                        return (
                          <div
                            key={p.id}
                            className={cn(
                              "rounded-3xl border p-5 space-y-4 hover:shadow-md transition-all relative overflow-hidden group",
                              isCurrentlyPreviewed 
                                ? "border-amber-500 bg-amber-50/5 dark:bg-amber-950/10 shadow-sm ring-1 ring-amber-500/20" 
                                : "border-border/80 bg-card"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-black text-sm text-card-foreground flex items-center gap-2">
                                  <span className={cn("w-2.5 h-2.5 rounded-full transition-colors", isCurrentlyPreviewed ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/40")} />
                                  {p.name}
                                </h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  ID: <span className="font-mono text-muted-foreground/80">{p.id}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted"
                                  title="Edit settings"
                                  onClick={() => {
                                    setEditingProfileId(p.id);
                                    setEditingProfileName(p.name);
                                    setEditingProfileSettings(p.settings || {});
                                    setIsEditDialogOpen(true);
                                    playSound?.('click');
                                  }}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive"
                                  title="Delete profile"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the profile "${p.name}"? Devices using this profile will fall back to default school settings.`)) {
                                      const nextProfiles = { ...(settings.kioskProfiles || {}) };
                                      delete nextProfiles[p.id];
                                      updateSettings({ kioskProfiles: nextProfiles });
                                      if (activePreviewProfileId === p.id) {
                                        setActivePreviewProfileId(null);
                                      }
                                      playSound?.('click');
                                      toast({
                                        title: 'Profile deleted',
                                        description: `Kiosk profile "${p.name}" has been removed.`,
                                      });
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="bg-muted/30 dark:bg-muted/10 rounded-2xl p-3 text-[11px] space-y-1.5 border">
                              <p className="text-[9px] uppercase tracking-wider font-black text-muted-foreground mb-1">
                                Configuration Overrides
                              </p>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-muted-foreground">
                                <div>
                                  Mode:{' '}
                                  <span className="font-bold text-foreground capitalize">
                                    {p.settings?.graphicMode || 'General Default'}
                                  </span>
                                </div>
                                <div>
                                  Color:{' '}
                                  <span className="font-bold text-foreground capitalize">
                                    {p.settings?.colorScheme || 'General Default'}
                                  </span>
                                </div>
                                <div>
                                  Dark Mode:{' '}
                                  <span className="font-bold text-foreground">
                                    {p.settings?.darkMode === undefined
                                      ? 'General Default'
                                      : p.settings.darkMode
                                      ? 'On'
                                      : 'Off'}
                                  </span>
                                </div>
                                <div>
                                  Sounds:{' '}
                                  <span className="font-bold text-foreground">
                                    {p.settings?.soundEnabled === undefined
                                      ? 'General Default'
                                      : p.settings.soundEnabled
                                      ? 'On'
                                      : 'Off'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 text-xs font-bold rounded-xl h-9 hover:bg-muted flex items-center justify-center gap-1.5"
                                onClick={() => {
                                  navigator.clipboard.writeText(setupUrl);
                                  toast({
                                      title: 'URL copied',
                                      description: 'Open this link on any kiosk browser to set it up.',
                                  });
                                  playSound?.('success');
                                }}
                              >
                                <Copy className="w-3 h-3" /> Copy Link
                              </Button>
                              <Button
                                type="button"
                                variant={isCurrentlyPreviewed ? "secondary" : "outline"}
                                className={cn(
                                  "text-xs font-bold rounded-xl h-9 px-3 flex items-center gap-1.5",
                                  isCurrentlyPreviewed && "bg-amber-100 hover:bg-amber-200 text-amber-900 border-transparent dark:bg-amber-900/30 dark:text-amber-300"
                                )}
                                onClick={() => {
                                  if (isCurrentlyPreviewed) {
                                    setActivePreviewProfileId(null);
                                  } else {
                                    setActivePreviewProfileId(p.id);
                                  }
                                  playSound?.('click');
                                }}
                              >
                                {isCurrentlyPreviewed ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" /> Close Live
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5" /> Live View
                                  </>
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="text-xs font-bold rounded-xl h-9 hover:bg-muted px-2.5"
                                title="Open full preview in new tab"
                                onClick={() => {
                                  window.open(setupUrl, '_blank');
                                  playSound?.('click');
                                }}
                              >
                                Preview
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Live Simulator Column */}
                  {activePreviewProfileId && (() => {
                    const p = settings.kioskProfiles?.[activePreviewProfileId];
                    if (!p) return null;

                    const activeTheme = p.settings?.colorScheme || settings.colorScheme || 'default';
                    const activeMode = (p.settings?.graphicMode || settings.graphicMode || 'graphics') as string;
                    const isDark = p.settings?.darkMode !== undefined ? p.settings.darkMode : !!settings.darkMode;

                    // Compute background gradient class based on selected theme
                    let themeBgClass = "from-slate-700 via-slate-800 to-slate-900 text-slate-100";
                    if (activeTheme === 'rose') {
                      themeBgClass = "from-pink-500 via-fuchsia-600 to-violet-700 text-white";
                    } else if (activeTheme === 'sunset') {
                      themeBgClass = "from-amber-500 via-orange-600 to-rose-700 text-white";
                    } else if (activeTheme === 'ocean') {
                      themeBgClass = "from-cyan-500 via-blue-600 to-indigo-700 text-white";
                    } else if (activeTheme === 'mint') {
                      themeBgClass = "from-emerald-500 via-green-600 to-teal-700 text-white";
                    }

                    const scanEnabled = p.settings?.kioskLoginTabScanEnabled !== false;
                    const faceEnabled = p.settings?.kioskLoginTabFaceEnabled === true;
                    const cardEnabled = p.settings?.kioskLoginTabCardEnabled !== false;
                    const typeEnabled = p.settings?.kioskLoginTabTypeEnabled !== false;

                    return (
                      <Card className="lg:col-span-2 border bg-background/50 backdrop-blur-md shadow-xl rounded-3xl sticky top-6 border-border/40 overflow-hidden">
                        <CardHeader className="p-5 border-b bg-muted/40">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-sm font-black flex items-center gap-2">
                              <Monitor className="w-4 h-4 text-amber-500" />
                              Kiosk Live Simulator
                            </CardTitle>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              ONLINE
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-5">
                          {/* Simulator Options Deck */}
                          <div className="space-y-3 bg-muted/30 rounded-2xl p-3.5 border text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-muted-foreground">Orientation:</span>
                              <div className="flex rounded-lg bg-background p-0.5 border">
                                <button
                                  type="button"
                                  onClick={() => setSimulatorOrientation('portrait')}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md font-bold text-[10px]",
                                    simulatorOrientation === 'portrait' ? "bg-amber-500 text-white shadow-sm" : "hover:bg-muted"
                                  )}
                                >
                                  Portrait
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSimulatorOrientation('landscape')}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md font-bold text-[10px]",
                                    simulatorOrientation === 'landscape' ? "bg-amber-500 text-white shadow-sm" : "hover:bg-muted"
                                  )}
                                >
                                  Landscape
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-bold text-muted-foreground">Mock View:</span>
                              <div className="flex rounded-lg bg-background p-0.5 border">
                                <button
                                  type="button"
                                  onClick={() => setSimulatorScreen('login')}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md font-bold text-[10px]",
                                    simulatorScreen === 'login' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                                  )}
                                >
                                  Login
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSimulatorScreen('welcome')}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md font-bold text-[10px]",
                                    simulatorScreen === 'welcome' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                                  )}
                                >
                                  Welcome
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSimulatorScreen('checkout')}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md font-bold text-[10px]",
                                    simulatorScreen === 'checkout' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"
                                  )}
                                >
                                  Checkout
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Device Hardware Mockup */}
                          <div className="py-4 flex justify-center bg-slate-950/5 dark:bg-slate-950/20 rounded-3xl border border-dashed p-6">
                            <div
                              className={cn(
                                "relative bg-slate-900 border-[10px] border-slate-950 shadow-2xl rounded-[2.2rem] overflow-hidden transition-all duration-500 ease-in-out flex flex-col",
                                simulatorOrientation === 'portrait' ? "w-[240px] aspect-[9/16]" : "w-full max-w-[380px] aspect-[16/9]"
                              )}
                            >
                              {/* Screen Glares / Lens */}
                              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-950 rounded-full z-20 flex items-center justify-center gap-1.5 px-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-900" />
                                <span className="w-1 h-1 rounded-full bg-slate-800" />
                              </div>

                              {/* Live Screen Simulated Content */}
                              <div
                                className={cn(
                                  "flex-1 relative overflow-hidden flex flex-col p-4 select-none font-sans text-left",
                                  themeBgClass,
                                  isDark ? "dark bg-slate-950" : ""
                                )}
                              >
                                {/* Retro scanlines overlay */}
                                {activeMode === 'retro' && (
                                  <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[size:100%_4px] opacity-30 z-10" />
                                )}

                                {/* Header block */}
                                <div className="flex items-center justify-between border-b border-white/20 pb-2 mb-3 z-10">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-white/25 border border-white/30 flex items-center justify-center font-black text-[9px]">
                                      🏫
                                    </div>
                                    <div className="leading-none">
                                      <h4 className="text-[10px] font-black truncate max-w-[100px] tracking-tight">Kiosk Screen</h4>
                                      <p className="text-[7px] opacity-70">Active Overrides</p>
                                    </div>
                                  </div>
                                  <div className="text-[7px] bg-white/20 px-1.5 py-0.5 rounded-md font-bold">
                                    {activeTheme.toUpperCase()}
                                  </div>
                                </div>

                                {/* Main Inner Content Display */}
                                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2 z-10">
                                  {simulatorScreen === 'login' && (
                                    <>
                                      <p className="text-[9px] font-black tracking-wide uppercase opacity-90">
                                        Scan Passcode to Login
                                      </p>
                                      
                                      {/* QR scanner mockup */}
                                      {scanEnabled && (
                                        <div className="relative w-20 h-20 border-2 border-white/40 rounded-xl bg-black/15 flex items-center justify-center overflow-hidden">
                                          <div className="w-14 h-14 border border-dashed border-white/50 rounded-lg flex items-center justify-center opacity-70">
                                            📱
                                          </div>
                                          {/* Scanning Laser Line */}
                                          <div className="absolute left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_8px_#34d399] animate-bounce top-2" />
                                        </div>
                                      )}

                                      {/* Face viewfinder mockup */}
                                      {!scanEnabled && faceEnabled && (
                                        <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-cyan-400/60 bg-black/15 flex items-center justify-center overflow-hidden">
                                          <div className="w-12 h-14 rounded-full border border-cyan-400/30 opacity-70 flex items-center justify-center text-base animate-pulse">
                                            👤
                                          </div>
                                        </div>
                                      )}

                                      {/* Default card keypad */}
                                      {!scanEnabled && !faceEnabled && (
                                        <div className="grid grid-cols-3 gap-1 w-20">
                                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                                            <div key={n} className="w-6 h-5 rounded bg-white/20 text-[8px] flex items-center justify-center font-bold">
                                              {n}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Small tab bar mockup */}
                                      <div className="flex gap-1 bg-white/10 rounded-lg p-0.5 text-[7px] border border-white/15">
                                        {scanEnabled && <span className="px-1 py-0.5 rounded bg-white/20 font-bold">QR</span>}
                                        {faceEnabled && <span className="px-1 py-0.5 rounded bg-white/20 font-bold">Face</span>}
                                        {cardEnabled && <span className="px-1 py-0.5 rounded bg-white/20 font-bold font-mono">Card</span>}
                                        {typeEnabled && <span className="px-1 py-0.5 rounded bg-white/20 font-bold">Name</span>}
                                      </div>
                                    </>
                                  )}

                                  {simulatorScreen === 'welcome' && (
                                    <div className="space-y-1.5 animate-in zoom-in-95 duration-300">
                                      <div className="text-2xl animate-bounce">👋</div>
                                      <h3 className="text-xs font-black tracking-tight leading-none">
                                        Welcome back, Alex!
                                      </h3>
                                      <p className="text-[8px] opacity-80 leading-none">Your account is linked.</p>
                                      
                                      <div className="inline-block bg-white/20 border border-white/30 px-2.5 py-1 rounded-xl text-[10px] font-black tracking-tight shadow-sm text-yellow-300 dark:text-yellow-200 mt-2">
                                        +10 POINTS!
                                      </div>
                                      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          playSound?.('success');
                                          toast({
                                            title: "🔊 Audio Triggered",
                                            description: `Simulated kiosk login sound chime played.`
                                          });
                                        }}
                                        className="block mt-3 mx-auto text-[7px] font-black uppercase tracking-wider bg-black/30 hover:bg-black/45 border border-white/20 px-2 py-1 rounded-md text-white active:scale-95 transition-transform"
                                      >
                                        📣 Trigger Audio
                                      </button>
                                    </div>
                                  )}

                                  {simulatorScreen === 'checkout' && (
                                    <div className="space-y-2 py-1">
                                      <div className="text-xl animate-pulse">📚</div>
                                      <p className="text-[8px] font-bold opacity-90 max-w-[120px] mx-auto leading-tight">
                                        Scan Library Book UPC or Student ID Card
                                      </p>
                                      <div className="w-16 h-8 bg-white/20 rounded-md border border-white/25 flex flex-col justify-between p-1 mx-auto">
                                        <div className="flex justify-between h-4 items-center">
                                          {[...Array(8)].map((_, i) => (
                                            <div key={i} className="w-[1.5px] bg-white h-full" style={{ width: i % 3 === 0 ? '3px' : '1px' }} />
                                          ))}
                                        </div>
                                        <span className="text-[5px] font-mono opacity-80 leading-none text-center">978019852</span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Footer footer */}
                                <div className="text-[7px] text-center opacity-60 border-t border-white/10 pt-1.5 mt-2 z-10 flex items-center justify-between">
                                  <span>👤 Student Screen</span>
                                  <span>Mode: {activeMode.toUpperCase()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}
          </CardContent>
        </Card>

      {/* Create Profile Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Create Kiosk Profile</DialogTitle>
            <DialogDescription className="text-xs">
              Give this kiosk layout override configuration a recognizable name (e.g. Portrait Front Gate).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="createProfileName" className="text-xs font-bold">Profile Name</Label>
              <Input
                id="createProfileName"
                placeholder="e.g. Portraits Lobby Screen"
                className="rounded-xl h-10"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
              disabled={!newProfileName.trim()}
              onClick={() => {
                const nextId = 'kp_' + Math.random().toString(36).substring(2, 11);
                const nextProfiles: Record<string, KioskProfile> = {
                  ...(settings.kioskProfiles || {}),
                  [nextId]: {
                    id: nextId,
                    name: newProfileName.trim(),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    settings: {
                      graphicMode: 'graphics' as const,
                      colorScheme: 'default' as const,
                      kioskLoginTabScanEnabled: true,
                      kioskLoginTabFaceEnabled: true,
                      kioskLoginTabCardEnabled: true,
                      kioskLoginTabTypeEnabled: true,
                      soundEnabled: true,
                      kioskSessionTimeoutSec: 45,
                    },
                  } as KioskProfile,
                };
                updateSettings({ kioskProfiles: nextProfiles });
                setIsCreateDialogOpen(false);
                setNewProfileName('');
                playSound?.('success');
                toast({
                  title: 'Profile created',
                  description: `Kiosk profile "${newProfileName}" was created successfully.`,
                });
              }}
            >
              Create &amp; Configure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-500" />
              Configure Kiosk Settings: {editingProfileName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Customize settings specifically for this device group profile. Unconfigured options fall back to school defaults.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="editProfileName" className="text-xs font-bold">Profile Name</Label>
              <Input
                id="editProfileName"
                className="rounded-xl h-10"
                value={editingProfileName}
                onChange={(e) => setEditingProfileName(e.target.value)}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Look &amp; Feel Overrides
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Graphic Mode</Label>
                  <Select
                    value={editingProfileSettings.graphicMode || 'graphics'}
                    onValueChange={(val) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        graphicMode: val as any,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue placeholder="Graphics mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="graphics">Graphics (Full Animations)</SelectItem>
                      <SelectItem value="classic">Classic (Reduced Graphics)</SelectItem>
                      <SelectItem value="retro">Retro Arcade Style</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Color Theme</Label>
                  <Select
                    value={editingProfileSettings.colorScheme || 'default'}
                    onValueChange={(val) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        colorScheme: val as any,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-xl h-10">
                      <SelectValue placeholder="Theme color..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Arcade Orange</SelectItem>
                      <SelectItem value="candy">Sweet Candy Pink</SelectItem>
                      <SelectItem value="sunset">Sunset Gold</SelectItem>
                      <SelectItem value="ocean">Deep Ocean Blue</SelectItem>
                      <SelectItem value="forest">Forest Moss Green</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between border bg-muted/20 rounded-2xl p-3.5">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Force Dark Mode</Label>
                  <p className="text-[10px] text-muted-foreground">Force this kiosk interface to stay in night mode.</p>
                </div>
                <Switch
                  checked={!!editingProfileSettings.darkMode}
                  onCheckedChange={(val) =>
                    setEditingProfileSettings((prev) => ({
                      ...prev,
                      darkMode: val,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between border bg-muted/20 rounded-2xl p-3.5">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Auditory Feedback (Sounds)</Label>
                  <p className="text-[10px] text-muted-foreground">Play custom chimes and arcade sounds on interactions.</p>
                </div>
                <Switch
                  checked={editingProfileSettings.soundEnabled !== false}
                  onCheckedChange={(val) =>
                    setEditingProfileSettings((prev) => ({
                      ...prev,
                      soundEnabled: val,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Active Student Login Tabs
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between border rounded-2xl p-3 text-xs">
                  <span className="font-bold">Scan Badge (QR)</span>
                  <Switch
                    checked={editingProfileSettings.kioskLoginTabScanEnabled !== false}
                    onCheckedChange={(val) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        kioskLoginTabScanEnabled: val,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border rounded-2xl p-3 text-xs">
                  <span className="font-bold">Face Login (Camera)</span>
                  <Switch
                    checked={editingProfileSettings.kioskLoginTabFaceEnabled !== false}
                    onCheckedChange={(val) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        kioskLoginTabFaceEnabled: val,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border rounded-2xl p-3 text-xs">
                  <span className="font-bold">Enter Card ID</span>
                  <Switch
                    checked={editingProfileSettings.kioskLoginTabCardEnabled !== false}
                    onCheckedChange={(val) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        kioskLoginTabCardEnabled: val,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between border rounded-2xl p-3 text-xs">
                  <span className="font-bold">Type Student Name</span>
                  <Switch
                    checked={editingProfileSettings.kioskLoginTabTypeEnabled !== false}
                    onCheckedChange={(val) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        kioskLoginTabTypeEnabled: val,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Session Constraints
              </h4>

              <div className="flex flex-wrap items-center justify-between gap-4 border rounded-2xl p-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold block">Auto Logout</span>
                  <span className="text-[10px] text-muted-foreground">
                    {editingProfileSettings.kioskAutoLogoutEnabled !== false
                      ? 'Log student out after idle time (seconds).'
                      : 'Students stay signed in until manual logout or kiosk lock.'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={editingProfileSettings.kioskAutoLogoutEnabled !== false}
                    onCheckedChange={(checked) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        kioskAutoLogoutEnabled: checked,
                      }))
                    }
                    aria-label="Enable kiosk auto-logout for this profile"
                  />
                  <Input
                    type="number"
                    className="w-20 rounded-lg text-center h-8 font-bold disabled:opacity-40"
                    disabled={editingProfileSettings.kioskAutoLogoutEnabled === false}
                    value={editingProfileSettings.kioskSessionTimeoutSec ?? 45}
                    onChange={(e) =>
                      setEditingProfileSettings((prev) => ({
                        ...prev,
                        kioskSessionTimeoutSec: parseInt(e.target.value) || 45,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
              onClick={() => {
                const nextProfiles = {
                  ...(settings.kioskProfiles || {}),
                  [editingProfileId]: {
                    id: editingProfileId,
                    name: editingProfileName.trim(),
                    createdAt: settings.kioskProfiles?.[editingProfileId]?.createdAt || Date.now(),
                    updatedAt: Date.now(),
                    settings: editingProfileSettings as any,
                  },
                };
                updateSettings({ kioskProfiles: nextProfiles });
                setIsEditDialogOpen(false);
                playSound?.('success');
                toast({
                  title: 'Profile updated',
                  description: `Kiosk profile "${editingProfileName}" was saved successfully.`,
                });
              }}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
