'use client';

import { useState } from 'react';
import { Loader2, Trash2, UploadCloud, Palette, User, Shield, Clock, Megaphone, Tv } from 'lucide-react';
import type { DocumentReference, Firestore } from 'firebase/firestore';
import { updateDoc, setDoc } from 'firebase/firestore';
import { schoolPublicDocRef } from '@/lib/schoolPublic';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        <CardHeader className="py-6 flex flex-row items-start justify-between gap-4">
          <div>
            <Helper content="Upload your school logo to show it next to the school name across the app.">
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary" /> School Logo
              </CardTitle>
            </Helper>
            <CardDescription>Logo appears beside the school name in the header. PNG, JPG, or WebP under 10MB.</CardDescription>
          </div>
          <TabWalkthroughHeaderAction />
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
                    This theme is used for the kiosk, rewards shop, and ID cards when a student has no individual theme.
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

      {/* BASIC SETTINGS CARD */}
      <Card className="border-t-4 border-amber-500 shadow-md">
        <CardHeader className="py-6">
          <Helper content="Configure session timeouts for admin and kiosk access.">
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" /> Basic settings
            </CardTitle>
          </Helper>
          <CardDescription>
            Manage how long sessions stay active before requiring re-authentication or returning to home.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-timeout" className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Admin Session Timeout
                </Label>
                <div className="flex items-center gap-3">
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
                    className="w-24 font-bold"
                  />
                  <span className="text-sm font-medium text-muted-foreground">minutes</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Inactivity before an admin/teacher is automatically logged out.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kiosk-timeout" className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Kiosk Session Timeout
                </Label>
                <div className="flex items-center gap-3">
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
                    className="w-24 font-bold"
                  />
                  <span className="text-sm font-medium text-muted-foreground">seconds</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                    Inactivity before the student dashboard or rewards shop returns to the home screen.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kiosk-ai-print-idle" className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> AI Fun + print vouchers idle timeout
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="kiosk-ai-print-idle"
                    type="number"
                    min={1}
                    max={240}
                    value={settings.kioskAiFunAndVoucherIdleOffMin ?? 6}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      const mins = Number.isFinite(n) ? Math.min(240, Math.max(1, n)) : 6;
                      updateSettings({ kioskAiFunAndVoucherIdleOffMin: mins });
                    }}
                    className="w-24 font-bold"
                  />
                  <span className="text-sm font-medium text-muted-foreground">minutes</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  After this long without taps or keys on the kiosk, AI Fun and redeem print vouchers pause until someone uses the screen again.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-freeze" className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Student sign-in freeze
                </Label>
                <div className="flex items-center gap-3">
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
                    className="w-24 font-bold"
                  />
                  <span className="text-sm font-medium text-muted-foreground">seconds</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  If a student tries to sign in again right after they just signed in, the kiosk will block them for this many seconds. Set 0 to disable.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcome-back-duration" className="text-sm font-bold flex items-center gap-2">
                  <Tv className="w-4 h-4" /> Welcome back splash duration
                </Label>
                <div className="flex items-center gap-3">
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
                    className="w-24 font-bold"
                  />
                  <span className="text-sm font-medium text-muted-foreground">seconds</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  How long the kiosk “Welcome back” screen stays up (1–60). Students can still tap Skip to dismiss sooner.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-t-4 border-indigo-500 shadow-md">
        <CardHeader className="py-6">
          <Helper content="Configure the scrolling sponsor banner message.">
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-indigo-500" /> Sponsor Banner
            </CardTitle>
          </Helper>
          <CardDescription>
            Show a sponsor or announcement banner at the top or bottom of student kiosk screens. Draft the content below, then turn on the banner so students see it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Preview */}
          <div className="mb-6 border-b border-border/40 pb-6">
             <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-3">Live Preview</Label>
             <div className="rounded-xl overflow-hidden shadow-sm border border-border/50 bg-slate-100 dark:bg-slate-900 min-h-[5rem] flex items-center justify-center p-2 relative">
                {(!settings.kioskSponsorEnabled && !settings.kioskSponsorSchedules?.length) ? (
                    <p className="text-sm text-muted-foreground">Sponsor banner is currently disabled.</p>
                ) : (!settings.kioskSponsorMessage?.trim() && !settings.kioskSponsorLogoUrl?.trim() && !settings.kioskSponsorLink?.trim()) ? (
                    <p className="text-sm text-muted-foreground">Add a message, logo, or link before students will see the banner.</p>
                ) : (
                    <div className="w-full relative overflow-hidden rounded-lg">
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

          <div className="flex items-start justify-between py-4 border-b border-border/40 transition-colors">
            <div className="flex items-start gap-4 mr-6">
              <div className="flex flex-col">
                <Label className="font-bold text-base block text-foreground mb-1" htmlFor="kioskSponsorEnabledBranding">
                  Enable Default Sponsor Banner
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Display this sponsor or announcement banner on student kiosk screens by default.
                </p>
              </div>
            </div>
            <Switch
              id="kioskSponsorEnabledBranding"
              checked={!!settings.kioskSponsorEnabled}
              onCheckedChange={(checked) => updateSettings({ kioskSponsorEnabled: checked })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 pb-6">
            <div className="space-y-3 col-span-2">
              <Label htmlFor="kioskSponsorMessageBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Sponsor Message
              </Label>
              <Input
                id="kioskSponsorMessageBranding"
                placeholder="e.g. Proudly sponsored by Acme Corp · Visit us at acme.com"
                value={settings.kioskSponsorMessage || ''}
                onChange={(e) => updateSettings({ kioskSponsorMessage: e.target.value })}
                className="text-sm rounded-xl"
                maxLength={300}
              />
              <p className="text-[10px] text-muted-foreground">
                {(settings.kioskSponsorMessage || '').length}/300 characters
                {!settings.kioskSponsorEnabled ? ' · Banner stays hidden for students until you enable it above.' : null}
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="kioskSponsorLinkBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Sponsor Website or Call to Action
              </Label>
              <Input
                id="kioskSponsorLinkBranding"
                placeholder="e.g. https://acme.com or @AcmeCorp"
                value={settings.kioskSponsorLink || ''}
                onChange={(e) => updateSettings({ kioskSponsorLink: e.target.value })}
                className="text-sm rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="kioskSponsorLogoUrlBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Sponsor Logo URL
              </Label>
              <Input
                id="kioskSponsorLogoUrlBranding"
                placeholder="e.g. https://example.com/logo.png"
                value={settings.kioskSponsorLogoUrl || ''}
                onChange={(e) => updateSettings({ kioskSponsorLogoUrl: e.target.value })}
                className="text-sm rounded-xl"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="kioskSponsorBannerStyleBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Visual Theme / Banner Style
              </Label>
              <Select
                value={settings.kioskSponsorBannerStyle || 'primary'}
                onValueChange={(val: any) => updateSettings({ kioskSponsorBannerStyle: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Style" />
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

            <div className="space-y-3">
              <Label htmlFor="kioskSponsorSpeedBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Scroll Speed
              </Label>
              <Select
                value={settings.kioskSponsorSpeed || 'normal'}
                onValueChange={(val: any) => updateSettings({ kioskSponsorSpeed: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Speed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                  <SelectItem value="very_fast">Very Fast</SelectItem>
                  <SelectItem value="static">Static (Fixed Banner)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="kioskSponsorPositionBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Banner Position
              </Label>
              <Select
                value={settings.kioskSponsorPosition || 'bottom'}
                onValueChange={(val: any) => updateSettings({ kioskSponsorPosition: val })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom of screen</SelectItem>
                  <SelectItem value="top">Top of screen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label htmlFor="kioskSponsorIconBranding" className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                Emoji / Icon Prefix
              </Label>
              <Input
                id="kioskSponsorIconBranding"
                placeholder="e.g. 🎉, 🌟, 💡, 🏫, 🍎, etc."
                value={settings.kioskSponsorIcon || ''}
                onChange={(e) => updateSettings({ kioskSponsorIcon: e.target.value })}
                className="text-sm rounded-xl"
                maxLength={10}
              />
            </div>
          </div>

          {/* Sponsor Schedules Sub-Section - Always visible regardless of default settings */}
          <div className="col-span-2 pt-6 border-t border-border/40 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-foreground">Scheduled Sponsor Banners</h4>
                  <p className="text-xs text-muted-foreground">Schedule sponsor banners or special announcements for specific days.</p>
                </div>

                {/* Form to add a new schedule */}
                <div className="p-4 bg-muted/40 rounded-2xl border border-border/40 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Target Date</Label>
                      <Input
                        type="date"
                        value={newSponsorDate}
                        onChange={(e) => setNewSponsorDate(e.target.value)}
                        className="text-sm rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Prefix Emoji</Label>
                      <Input
                        placeholder="🎉"
                        value={newSponsorIcon}
                        onChange={(e) => setNewSponsorIcon(e.target.value)}
                        className="text-sm rounded-xl"
                        maxLength={10}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Scheduled Message</Label>
                      <Input
                        placeholder="e.g. Happy Teacher Appreciation Day from the PTA"
                        value={newSponsorMessage}
                        onChange={(e) => setNewSponsorMessage(e.target.value)}
                        className="text-sm rounded-xl"
                        maxLength={300}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Custom Logo URL</Label>
                      <Input
                        placeholder="https://example.com/sponsor-logo.png"
                        value={newSponsorLogo}
                        onChange={(e) => setNewSponsorLogo(e.target.value)}
                        className="text-sm rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Sponsor Website</Label>
                      <Input
                        placeholder="https://acme.com"
                        value={newSponsorLink}
                        onChange={(e) => setNewSponsorLink(e.target.value)}
                        className="text-sm rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Theme Style</Label>
                      <Select value={newSponsorStyle} onValueChange={(val: any) => setNewSponsorStyle(val)}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Style" />
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
                          <SelectValue placeholder="Speed" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slow">Slow</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="fast">Fast</SelectItem>
                          <SelectItem value="very_fast">Very Fast</SelectItem>
                          <SelectItem value="static">Static (Fixed Banner)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase">Banner position</Label>
                      <Select value={newSponsorPosition} onValueChange={(val: any) => setNewSponsorPosition(val)}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom">Bottom of screen</SelectItem>
                          <SelectItem value="top">Top of screen</SelectItem>
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
                    <span>+ Add Scheduled Banner</span>
                  </Button>
                </div>

                {/* List of Scheduled Items */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active & Future Schedules</h5>
                  {(settings.kioskSponsorSchedules || []).length === 0 ? (
                    <div className="text-xs text-muted-foreground bg-muted/20 border border-border/40 p-4 rounded-xl text-center">
                      No future date-specific schedules configured.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(settings.kioskSponsorSchedules || []).map((s) => (
                        <div key={s.id} className="flex items-center justify-between p-3.5 bg-muted/30 border border-border/30 rounded-2xl hover:bg-muted/40 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold text-xs px-2.5 py-1 rounded-lg">
                                {s.date}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate max-w-xs">
                                {s.message}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5 flex-wrap">
                              <span>Style: <span className="font-semibold text-foreground/80">{s.bannerStyle || 'primary'}</span></span>
                              <span>Speed: <span className="font-semibold text-foreground/80">{s.speed || 'normal'}</span></span>
                              {s.link && <span>Link: <span className="font-semibold text-foreground/80">{s.link}</span></span>}
                              {s.logoUrl && <span>Logo: <span className="font-semibold text-foreground/80">Custom</span></span>}
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
    </div>
  );
}
