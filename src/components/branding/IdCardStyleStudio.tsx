'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Undo2,
  Redo2,
  RotateCcw,
  Sparkles,
  CreditCard,
  Check,
  Smartphone,
  Eye,
  Layers,
  Shield,
  Palette,
  QrCode,
  LayoutTemplate,
  Type,
  User,
  School,
  Save,
  Sliders,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { StudentIdCard } from '@/components/student/StudentIdCard';
import type { IdCardCustomOptions, Student } from '@/lib/types';
import { APP_NAME, APP_TAGLINE } from '@/lib/appBranding';

export interface IdCardStudioState {
  layout: 'classic' | 'credit_card' | 'modern' | 'minimalist' | 'high_vis';
  orientation: 'landscape' | 'portrait';
  useQrCode: boolean;
  cornerStyle: 'rounded' | 'rectangular';
  options: IdCardCustomOptions;
}

const DEFAULT_OPTIONS: IdCardCustomOptions = {
  orientation: 'landscape',
  cardFinish: 'none',
  showSchoolName: true,
  schoolNameOverride: '',
  showSchoolLogo: true,
  showAppName: true,
  showAppTagline: true,
  showDomain: true,
  nameFormat: 'full',
  nameCasing: 'standard',
  showClass: true,
  classPrefix: 'Class: ',
  showIdNumber: false,
  idNumberLabel: 'ID:',
  showPointsBadge: false,
  photoShape: 'rounded',
  photoBorder: true,
  showEmoji: true,
  showValidThru: false,
  validThruText: '06/27',
  showSecurityChip: false,
  showBarcodeDigits: true,
};

const DUMMY_STUDENT: Student = {
  id: 'preview_student',
  firstName: 'Jane',
  lastName: 'Doe',
  nickname: 'JD',
  points: 120,
  nfcId: '98452103',
};

type Preset = {
  name: string;
  desc: string;
  icon: string;
  config: Partial<IdCardStudioState>;
};

const CARD_PRESETS: Preset[] = [
  {
    name: 'Executive Card',
    desc: 'Bank-style VIP card with gloss sheen and chip',
    icon: '💳',
    config: {
      layout: 'credit_card',
      orientation: 'landscape',
      options: {
        ...DEFAULT_OPTIONS,
        cardFinish: 'gloss',
        nameCasing: 'uppercase',
        showValidThru: true,
        validThruText: '06/27',
      },
    },
  },
  {
    name: 'Lanyard VIP Badge',
    desc: 'Vertical portrait lanyard badge with circle photo',
    icon: '🎫',
    config: {
      layout: 'classic',
      orientation: 'portrait',
      options: {
        ...DEFAULT_OPTIONS,
        orientation: 'portrait',
        cardFinish: 'hologram',
        photoShape: 'circle',
        showPointsBadge: true,
        showIdNumber: true,
      },
    },
  },
  {
    name: 'Primary School Fun',
    desc: 'Bold high-visibility badge with stars and points',
    icon: '⭐',
    config: {
      layout: 'high_vis',
      orientation: 'landscape',
      options: {
        ...DEFAULT_OPTIONS,
        photoShape: 'rounded',
        showPointsBadge: true,
        showEmoji: true,
      },
    },
  },
  {
    name: 'Clean Modernist',
    desc: 'Sleek sidebar layout with matte finish and QR',
    icon: '✨',
    config: {
      layout: 'modern',
      orientation: 'landscape',
      useQrCode: true,
      options: {
        ...DEFAULT_OPTIONS,
        cardFinish: 'matte',
        nameFormat: 'full',
        nameCasing: 'titlecase',
      },
    },
  },
];

export function IdCardStyleStudio({
  schoolId,
  schoolName,
  schoolLogoUrl,
  toast,
  playSound,
}: {
  schoolId?: string | null;
  schoolName?: string;
  schoolLogoUrl?: string | null;
  toast: (args: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  playSound: (sound: 'click' | 'success' | 'arcade' | 'error') => void;
}) {
  const { settings, updateSettings } = useSettings();

  // Initial State derived from current settings
  const getInitialState = useCallback((): IdCardStudioState => ({
    layout: settings.idCardLayout || 'classic',
    orientation: settings.idCardOrientation || 'landscape',
    useQrCode: settings.idCardUseQrCode === true,
    cornerStyle: settings.idCardCornerStyle || 'rounded',
    options: {
      ...DEFAULT_OPTIONS,
      ...(settings.idCardCustomOptions || {}),
    },
  }), [settings]);

  const [current, setCurrent] = useState<IdCardStudioState>(getInitialState);
  const [history, setHistory] = useState<IdCardStudioState[]>([]);
  const [future, setFuture] = useState<IdCardStudioState[]>([]);
  const [activeTab, setActiveTab] = useState<'layout' | 'surface' | 'branding' | 'student' | 'scanner'>('layout');
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  // Check dirty state against saved settings
  const isDirty = useMemo(() => {
    const saved = getInitialState();
    return JSON.stringify(current) !== JSON.stringify(saved);
  }, [current, getInitialState]);

  // Push new state with history tracking
  const updateState = useCallback((updater: (prev: IdCardStudioState) => IdCardStudioState) => {
    setCurrent((prev) => {
      const next = updater(prev);
      setHistory((h) => [...h.slice(-25), prev]);
      setFuture([]);
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, h.length - 1));
    setFuture((f) => [current, ...f]);
    setCurrent(prev);
    playSound('click');
  }, [history, current, playSound]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setHistory((h) => [...h, current]);
    setCurrent(next);
    playSound('click');
  }, [future, current, playSound]);

  // Keyboard shortcut for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleSave = () => {
    updateSettings({
      idCardLayout: current.layout,
      idCardOrientation: current.orientation,
      idCardUseQrCode: current.useQrCode,
      idCardCornerStyle: current.cornerStyle,
      idCardCustomOptions: current.options,
    });
    setHistory([]);
    setFuture([]);
    playSound('success');
    toast({
      title: 'Card styles saved',
      description: 'Student ID cards will now be printed with your custom styling.',
    });
  };

  const handleReset = () => {
    setCurrent(getInitialState());
    setHistory([]);
    setFuture([]);
    playSound('click');
    toast({ title: 'Changes discarded', description: 'Reverted to your last saved settings.' });
  };

  const applyPreset = (preset: Preset) => {
    updateState((prev) => ({
      ...prev,
      ...preset.config,
      options: {
        ...prev.options,
        ...(preset.config.options || {}),
      },
    }));
    playSound('arcade');
    toast({ title: `Applied "${preset.name}" preset` });
  };

  const isPortrait = current.orientation === 'portrait';

  return (
    <div className="space-y-6">
      {/* Top Header with Undo/Redo & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/30 border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              ID Card Style Studio
              {isDirty && (
                <Badge variant="secondary" className="text-[10px] font-bold">
                  Unsaved changes
                </Badge>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Customize layouts, orientation, finishes, and card details with instant live preview.
            </p>
          </div>
        </div>

        {/* Action Buttons: Undo, Redo, Discard, Save */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="rounded-xl h-9 px-3 gap-1.5 font-bold"
            title="Undo last change (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden md:inline">Undo</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={future.length === 0}
            className="rounded-xl h-9 px-3 gap-1.5 font-bold"
            title="Redo change (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
            <span className="hidden md:inline">Redo</span>
          </Button>
          {isDirty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="rounded-xl h-9 px-3 text-muted-foreground font-bold"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Discard
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty}
            className="rounded-xl h-9 px-4 font-bold shadow-md bg-primary hover:bg-primary/90 text-white"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Card Look
          </Button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Quick Style Presets
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CARD_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className="flex items-start gap-2.5 p-3 rounded-2xl border bg-card hover:bg-muted/40 hover:border-primary/40 transition-all text-left group shadow-sm"
            >
              <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                {preset.icon}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  {preset.name}
                </div>
                <div className="text-[10px] text-muted-foreground line-clamp-1 leading-snug">
                  {preset.desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Area: Studio Controls on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Controls Tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Navigation Bar for Settings Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-2xl border">
            {[
              { id: 'layout', label: 'Layout & Shape', icon: LayoutTemplate },
              { id: 'surface', label: 'Finish & Surface', icon: Sparkles },
              { id: 'branding', label: 'School Branding', icon: School },
              { id: 'student', label: 'Student Info', icon: User },
              { id: 'scanner', label: 'Scan & Security', icon: QrCode },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as typeof activeTab);
                    playSound('click');
                  }}
                  className={cn(
                    'flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all',
                    isActive
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: LAYOUT & ORIENTATION */}
          {activeTab === 'layout' && (
            <div className="space-y-6 p-6 rounded-3xl border bg-card shadow-sm">
              {/* Orientation Switcher */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Card Orientation
                </Label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => {
                      updateState((s) => ({
                        ...s,
                        orientation: 'landscape',
                        options: { ...s.options, orientation: 'landscape' },
                      }));
                      playSound('click');
                    }}
                    className={cn(
                      'flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition-all',
                      !isPortrait
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/40',
                    )}
                  >
                    <div className="w-5 h-3 rounded-sm border border-current" />
                    Landscape (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateState((s) => ({
                        ...s,
                        orientation: 'portrait',
                        options: { ...s.options, orientation: 'portrait' },
                      }));
                      playSound('click');
                    }}
                    className={cn(
                      'flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-xs transition-all',
                      isPortrait
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/40',
                    )}
                  >
                    <div className="w-3 h-5 rounded-sm border border-current" />
                    Portrait (Lanyard Badge)
                  </button>
                </div>
              </div>

              {/* Layout Choices */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Card Arrangement Style
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'classic' as const, label: 'Classic School ID', desc: 'Photo left, name right, barcode along bottom strip.' },
                    { id: 'credit_card' as const, label: 'Credit Card Style', desc: 'Embossed banking layout with metallic chip and PAN number.' },
                    { id: 'modern' as const, label: 'Modern Split Sidebar', desc: 'Vertical brand sidebar with centered student info.' },
                    { id: 'minimalist' as const, label: 'Minimalist Clean', desc: 'No heavy borders, delicate airy typography.' },
                    { id: 'high_vis' as const, label: 'High-Vis Badge', desc: 'Extra large name and bold colors for easy visibility.' },
                  ].map((item) => {
                    const isActive = current.layout === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          updateState((s) => ({ ...s, layout: item.id }));
                          playSound('click');
                        }}
                        className={cn(
                          'p-3 rounded-2xl border-2 text-left transition-all',
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:bg-muted/30',
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn('text-xs font-bold', isActive ? 'text-primary' : 'text-foreground')}>
                            {item.label}
                          </span>
                          {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Corner Rounding */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Card Corner Cutting
                </Label>
                <div className="flex gap-3 max-w-sm">
                  {[
                    { id: 'rounded' as const, label: 'Rounded Corners (ISO ID-1)' },
                    { id: 'rectangular' as const, label: 'Square Cut (Easy scissor cut)' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        updateState((s) => ({ ...s, cornerStyle: c.id }));
                        playSound('click');
                      }}
                      className={cn(
                        'flex-1 p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-center',
                        current.cornerStyle === c.id
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SURFACE FINISH & TEXTURES */}
          {activeTab === 'surface' && (
            <div className="space-y-6 p-6 rounded-3xl border bg-card shadow-sm">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Card Surface Finish
                </Label>
                <p className="text-xs text-muted-foreground">
                  Simulate premium protective overlays and security lamination on printed badges.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'none' as const, label: 'Standard', desc: 'Natural card surface', icon: '📄' },
                    { id: 'gloss' as const, label: 'Gloss Laminated', desc: 'Reflective gloss shine', icon: '✨' },
                    { id: 'hologram' as const, label: 'Holographic VIP', desc: 'Prismatic rainbow foil', icon: '🌈' },
                    { id: 'matte' as const, label: 'Velvet Matte', desc: 'Sleek frosted frame', icon: '🛡️' },
                  ].map((f) => {
                    const isActive = (current.options.cardFinish || 'none') === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          updateState((s) => ({
                            ...s,
                            options: { ...s.options, cardFinish: f.id },
                          }));
                          playSound('click');
                        }}
                        className={cn(
                          'p-3 rounded-2xl border-2 text-center transition-all flex flex-col items-center gap-1.5',
                          isActive
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border hover:bg-muted/40',
                        )}
                      >
                        <span className="text-2xl">{f.icon}</span>
                        <span className={cn('text-xs font-bold', isActive ? 'text-primary' : 'text-foreground')}>
                          {f.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{f.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCHOOL BRANDING */}
          {activeTab === 'branding' && (
            <div className="space-y-6 p-6 rounded-3xl border bg-card shadow-sm">
              <div className="space-y-4">
                {/* School Name Settings */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold">Show School Name</Label>
                    <p className="text-xs text-muted-foreground">Print school name in header</p>
                  </div>
                  <Switch
                    checked={current.options.showSchoolName !== false}
                    onCheckedChange={(checked) =>
                      updateState((s) => ({
                        ...s,
                        options: { ...s.options, showSchoolName: checked },
                      }))
                    }
                  />
                </div>

                {current.options.showSchoolName !== false && (
                  <div className="space-y-1.5 pl-4 border-l-2 border-primary/30">
                    <Label className="text-xs font-semibold">Custom School Name Override</Label>
                    <Input
                      value={current.options.schoolNameOverride || ''}
                      placeholder={schoolName || schoolId || 'Your School'}
                      onChange={(e) =>
                        updateState((s) => ({
                          ...s,
                          options: { ...s.options, schoolNameOverride: e.target.value },
                        }))
                      }
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">Leave blank to use default school name.</p>
                  </div>
                )}

                {/* School Logo */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <Label className="text-sm font-bold">Show School Crest / Logo</Label>
                    <p className="text-xs text-muted-foreground">Include school crest in badge header</p>
                  </div>
                  <Switch
                    checked={current.options.showSchoolLogo !== false}
                    onCheckedChange={(checked) =>
                      updateState((s) => ({
                        ...s,
                        options: { ...s.options, showSchoolLogo: checked },
                      }))
                    }
                  />
                </div>

                {/* LevelUp App Branding */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <Label className="text-sm font-bold">Show App Branding</Label>
                    <p className="text-xs text-muted-foreground">Show {APP_NAME} logo and tagline</p>
                  </div>
                  <Switch
                    checked={current.options.showAppName !== false}
                    onCheckedChange={(checked) =>
                      updateState((s) => ({
                        ...s,
                        options: { ...s.options, showAppName: checked },
                      }))
                    }
                  />
                </div>

                {/* Domain link */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div>
                    <Label className="text-sm font-bold">Show App Web Address</Label>
                    <p className="text-xs text-muted-foreground">Print portal URL on card</p>
                  </div>
                  <Switch
                    checked={current.options.showDomain !== false}
                    onCheckedChange={(checked) =>
                      updateState((s) => ({
                        ...s,
                        options: { ...s.options, showDomain: checked },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STUDENT INFO & PHOTO */}
          {activeTab === 'student' && (
            <div className="space-y-6 p-6 rounded-3xl border bg-card shadow-sm">
              {/* Name format */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Name Format & Display
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'full' as const, label: 'Full Name', ex: 'Jane Doe' },
                    { id: 'first_only' as const, label: 'First Name Only', ex: 'Jane' },
                    { id: 'nickname_preferred' as const, label: 'Prefer Nickname', ex: 'JD' },
                  ].map((nf) => (
                    <button
                      key={nf.id}
                      type="button"
                      onClick={() =>
                        updateState((s) => ({
                          ...s,
                          options: { ...s.options, nameFormat: nf.id },
                        }))
                      }
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all',
                        (current.options.nameFormat || 'full') === nf.id
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      <div>{nf.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{nf.ex}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Casing */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Name Letter Casing
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'standard' as const, label: 'Standard', ex: 'Jane Doe' },
                    { id: 'uppercase' as const, label: 'ALL CAPS', ex: 'JANE DOE' },
                    { id: 'titlecase' as const, label: 'Title Case', ex: 'Jane Doe' },
                  ].map((nc) => (
                    <button
                      key={nc.id}
                      type="button"
                      onClick={() =>
                        updateState((s) => ({
                          ...s,
                          options: { ...s.options, nameCasing: nc.id },
                        }))
                      }
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all',
                        (current.options.nameCasing || 'standard') === nc.id
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      <div>{nc.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Shape */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Photo Crop Shape
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'rounded' as const, label: 'Rounded Rect', icon: 'rounded-xl' },
                    { id: 'circle' as const, label: 'Circle Badge', icon: 'rounded-full' },
                    { id: 'square' as const, label: 'Sharp Square', icon: 'rounded-none' },
                  ].map((ps) => (
                    <button
                      key={ps.id}
                      type="button"
                      onClick={() =>
                        updateState((s) => ({
                          ...s,
                          options: { ...s.options, photoShape: ps.id },
                        }))
                      }
                      className={cn(
                        'p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all flex items-center justify-center gap-2',
                        (current.options.photoShape || 'rounded') === ps.id
                          ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      <div className={cn('w-4 h-4 border border-current', ps.icon)} />
                      {ps.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Prefix & Toggle */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold">Show Class / Homeroom</Label>
                    <p className="text-xs text-muted-foreground">Display student classroom line</p>
                  </div>
                  <Switch
                    checked={current.options.showClass !== false}
                    onCheckedChange={(checked) =>
                      updateState((s) => ({
                        ...s,
                        options: { ...s.options, showClass: checked },
                      }))
                    }
                  />
                </div>

                {current.options.showClass !== false && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-1">
                    <Label className="text-xs font-semibold">Class Label Prefix</Label>
                    <Input
                      value={current.options.classPrefix ?? 'Class: '}
                      onChange={(e) =>
                        updateState((s) => ({
                          ...s,
                          options: { ...s.options, classPrefix: e.target.value },
                        }))
                      }
                      placeholder="e.g. Room: or Grade: "
                      className="h-8 max-w-xs text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Points Badge */}
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label className="text-sm font-bold">Show Points Badge</Label>
                  <p className="text-xs text-muted-foreground">Display current reward points pill</p>
                </div>
                <Switch
                  checked={current.options.showPointsBadge === true}
                  onCheckedChange={(checked) =>
                    updateState((s) => ({
                      ...s,
                      options: { ...s.options, showPointsBadge: checked },
                    }))
                  }
                />
              </div>

              {/* Theme Emoji */}
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <Label className="text-sm font-bold">Show Theme Mascot / Emoji</Label>
                  <p className="text-xs text-muted-foreground">Include student mascot emoji</p>
                </div>
                <Switch
                  checked={current.options.showEmoji !== false}
                  onCheckedChange={(checked) =>
                    updateState((s) => ({
                      ...s,
                      options: { ...s.options, showEmoji: checked },
                    }))
                  }
                />
              </div>
            </div>
          )}

          {/* TAB 5: SCANNER & SECURITY */}
          {activeTab === 'scanner' && (
            <div className="space-y-6 p-6 rounded-3xl border bg-card shadow-sm">
              {/* QR vs Barcode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold">QR Code Scanner Format</Label>
                  <p className="text-xs text-muted-foreground">
                    Show QR code with student initials instead of Code 128 barcode
                  </p>
                </div>
                <Switch
                  checked={current.useQrCode}
                  onCheckedChange={(checked) =>
                    updateState((s) => ({ ...s, useQrCode: checked }))
                  }
                />
              </div>

              {/* ID Number on card */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold">Print Student ID Number</Label>
                    <p className="text-xs text-muted-foreground">Show student scan ID code in text</p>
                  </div>
                  <Switch
                    checked={current.options.showIdNumber === true}
                    onCheckedChange={(checked) =>
                      updateState((s) => ({
                        ...s,
                        options: { ...s.options, showIdNumber: checked },
                      }))
                    }
                  />
                </div>

                {current.options.showIdNumber && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-1">
                    <Label className="text-xs font-semibold">ID Number Prefix</Label>
                    <Input
                      value={current.options.idNumberLabel ?? 'ID:'}
                      onChange={(e) =>
                        updateState((s) => ({
                          ...s,
                          options: { ...s.options, idNumberLabel: e.target.value },
                        }))
                      }
                      className="h-8 max-w-xs text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Valid Thru Date */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold">Expiration / Valid Thru Date</Label>
                    <p className="text-xs text-muted-foreground">Print school year or validity date</p>
                  </div>
                  <Switch
                    checked={current.options.showValidThru === true}
                    onCheckedChange={(checked) =>
                      updateState((s) => ({
                        ...s,
                        options: { ...s.options, showValidThru: checked },
                      }))
                    }
                  />
                </div>

                {current.options.showValidThru && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-1">
                    <Label className="text-xs font-semibold">Valid Thru Date Text</Label>
                    <Input
                      value={current.options.validThruText ?? '06/27'}
                      onChange={(e) =>
                        updateState((s) => ({
                          ...s,
                          options: { ...s.options, validThruText: e.target.value },
                        }))
                      }
                      placeholder="e.g. 06/27 or 2026-2027"
                      className="h-8 max-w-xs text-xs font-bold"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Interactive Card Preview (5 cols) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-muted/25 rounded-3xl border shadow-inner min-h-[440px]">
            <div className="flex items-center justify-between w-full mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-primary" />
                Live Card Preview
              </span>
              <Badge variant="outline" className="text-[10px] font-bold">
                {isPortrait ? 'Portrait 2.1" × 3.4"' : 'Landscape 3.4" × 2.1"'}
              </Badge>
            </div>

            {/* Container scaled to fit card comfortably */}
            <div
              className={cn(
                'relative flex items-center justify-center transition-all duration-300 drop-shadow-xl',
                isPortrait ? 'w-[210px] h-[330px]' : 'w-[325px] h-[210px]',
              )}
            >
              <div
                className="origin-center"
                style={{
                  transform: isPortrait ? 'scale(1)' : 'scale(1)',
                  width: isPortrait ? '204.1px' : '323.3px',
                  height: isPortrait ? '323.3px' : '204.1px',
                }}
              >
                <StudentIdCard
                  student={DUMMY_STUDENT}
                  schoolName={schoolName || schoolId || 'Your School'}
                  schoolLogoUrl={schoolLogoUrl}
                  className="Room 5B"
                  isColorEnabled={true}
                  forceStudentThemePreview={true}
                  overrideLayout={current.layout}
                  overrideOrientation={current.orientation}
                  overrideOptions={current.options}
                  cornerStyle={current.cornerStyle}
                />
              </div>
            </div>

            {/* Hint below card */}
            <p className="text-[11px] text-muted-foreground text-center mt-6 max-w-xs leading-relaxed">
              Every detail above updates this card immediately. When satisfied, click <strong>Save Card Look</strong> to apply it to all students.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
