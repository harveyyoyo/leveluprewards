'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Laptop,
  Monitor,
  Projector,
  QrCode,
  Smartphone,
  Tv,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandedQrCode } from '@/components/qr/BrandedQrCode';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { buildClassroomFullscreenUrl } from '@/lib/classroomPointsUrl';

export interface ClassroomScreenPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  classId: string;
  classNameLabel: string;
  scope?: string;
}

export function ClassroomScreenPairModal({
  isOpen,
  onClose,
  schoolId,
  classId,
  classNameLabel,
  scope = 'admin',
}: ClassroomScreenPairModalProps) {
  const { toast } = useToast();
  const [targetScreen, setTargetScreen] = useState<'mirror' | 'live'>('mirror');
  const [copied, setCopied] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'promethean' | 'appletv' | 'tablet' | 'firetv'>('promethean');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cleanClassId = encodeURIComponent(classId || '');
  const path =
    targetScreen === 'mirror'
      ? `/${schoolId}/classroom-screen?classId=${cleanClassId}&scope=${encodeURIComponent(scope)}`
      : buildClassroomFullscreenUrl({ schoolId, classId, scope });
  const fullUrl = `${origin}${path}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Classroom Link Copied',
        description:
          targetScreen === 'mirror'
            ? 'Student Projector Mirror link copied to clipboard.'
            : 'Interactive Smartboard link copied to clipboard.',
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="classroom-native-colors max-w-xl grid-cols-1 rounded-3xl p-6 sm:p-8 text-foreground [&>*]:min-w-0">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Projector className="h-5 w-5" />
            </div>
            <div className="min-w-0 pr-3">
              <DialogTitle className="text-xl font-black tracking-tight sm:text-2xl">
                Pair Classroom Screen
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                Project &quot;{classNameLabel}&quot; onto your interactive whiteboard, projector, or tablet
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-3 space-y-5">
          {/* Audience Mode Switcher */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Screen Mode
            </label>
            <Tabs
              value={targetScreen}
              onValueChange={(val) => setTargetScreen(val as 'mirror' | 'live')}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl p-1 bg-muted">
                <TabsTrigger
                  value="mirror"
                  className="min-h-12 whitespace-normal rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Projector className="mr-2 h-4 w-4" />
                  Student Mirror (Clean)
                </TabsTrigger>
                <TabsTrigger
                  value="live"
                  className="min-h-12 whitespace-normal rounded-xl font-bold text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Laptop className="mr-2 h-4 w-4" />
                  Interactive Board (Teacher)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* QR Code & Direct URL Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border-2 border-emerald-500/20 bg-muted/40 p-5">
            <div className="shrink-0 rounded-2xl bg-white p-3 shadow-lg border border-border/80">
              <BrandedQrCode
                value={fullUrl}
                size={140}
                renderSize={280}
                hideCenterBadge
              />
            </div>

            <div className="flex-1 min-w-0 space-y-3 w-full text-center sm:text-left">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {targetScreen === 'mirror' ? 'Student Projector Mirror' : 'Interactive Whiteboard'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {targetScreen === 'mirror'
                    ? 'Class messages and today’s session leaderboard without teacher notes.'
                    : 'Full interactive teaching board allowing one-tap awards directly on touch displays.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={fullUrl}
                  className="font-mono text-xs bg-background/80 h-9 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0 font-bold h-9 px-3 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div>
                <Button
                  asChild
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 gap-1.5 rounded-xl shadow"
                >
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in New Tab
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions Tabs */}
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground">
              For matching session totals and display settings, open the mirror in another tab on your teaching computer and share it with HDMI or AirPlay. Separate devices need staff sign-in and their own display setup.
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Classroom Hardware Setup Guides
            </p>
            <div className="flex gap-1.5 border-b pb-2 overflow-x-auto">
              {[
                { id: 'promethean', label: 'SMART / Promethean', icon: Monitor },
                { id: 'appletv', label: 'Apple TV / AirPlay', icon: Tv },
                { id: 'tablet', label: 'Classroom iPad / Tablet', icon: Smartphone },
                { id: 'firetv', label: 'Fire TV / Chromecast', icon: Projector },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeGuideTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveGuideTab(tab.id as any)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                      active
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-muted/70 hover:bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border bg-muted/20 p-3.5 text-xs text-muted-foreground space-y-1.5">
              {activeGuideTab === 'promethean' && (
                <>
                  <p className="font-bold text-foreground">Interactive Whiteboard / Smart Board:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Open Chromium or Chrome on your Promethean, SMART Board, or ViewSonic panel.</li>
                    <li>Navigate to the direct URL or scan the QR code using the panel&apos;s camera app.</li>
                    <li>Press F11 or tap Fullscreen on the browser toolbar for an edge-to-edge touch experience.</li>
                  </ol>
                </>
              )}
              {activeGuideTab === 'appletv' && (
                <>
                  <p className="font-bold text-foreground">Apple TV &amp; AirPlay Mirroring:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Open this URL on your Mac, iPad, or iPhone.</li>
                    <li>Click the AirPlay or Screen Mirroring icon in Control Center.</li>
                    <li>Select your classroom Apple TV or AirPlay-compatible projector.</li>
                  </ol>
                </>
              )}
              {activeGuideTab === 'tablet' && (
                <>
                  <p className="font-bold text-foreground">Teacher Roaming iPad / Android Tablet:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Scan this QR code with your tablet camera.</li>
                    <li>Tap &quot;Add to Home Screen&quot; in Safari or Chrome for a dedicated fullscreen app icon.</li>
                    <li>Walk around the classroom awarding points from your palm in real-time!</li>
                  </ol>
                </>
              )}
              {activeGuideTab === 'firetv' && (
                <>
                  <p className="font-bold text-foreground">Amazon Fire TV / Chromecast with Google TV:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Open the Silk browser on Fire TV, or Chrome on Google TV.</li>
                    <li>Enter the URL once, then bookmark it or set as homepage.</li>
                    <li>Turn on the screen at the start of each class period for automatic live sync.</li>
                  </ol>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
