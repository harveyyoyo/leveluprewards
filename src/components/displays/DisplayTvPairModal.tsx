'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
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
import { BrandedQrCode } from '@/components/qr/BrandedQrCode';
import { useToast } from '@/hooks/use-toast';

export interface DisplayTvPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string;
  screenId: string;
  screenName: string;
}

export function DisplayTvPairModal({
  isOpen,
  onClose,
  schoolId,
  screenId,
  screenName,
}: DisplayTvPairModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'firetv' | 'googletv' | 'appletv' | 'smarttv' | 'kiosk'>('firetv');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const tvPath = `/${schoolId}/displays?screen=${encodeURIComponent(screenId)}&fullscreen=1`;
  const fullTvUrl = `${origin}${tvPath}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTvUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'TV Link Copied',
        description: 'Ready to paste into your smart TV or digital signage browser.',
      });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight sm:text-2xl">
                Show on Hallway TV
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                Pair &quot;{screenName}&quot; to any TV, monitor, or projector in seconds
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* QR Code & Direct URL Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border-2 border-primary/20 bg-muted/40 p-5">
            <div className="shrink-0 rounded-2xl bg-white p-3 shadow-lg border border-border/80">
              <BrandedQrCode
                value={fullTvUrl}
                size={140}
                renderSize={280}
                hideCenterBadge
              />
            </div>

            <div className="flex-1 min-w-0 space-y-3 w-full text-center sm:text-left">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Instant TV Setup
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Scan this QR code with your phone camera or TV browser to open this display fullscreen immediately.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={fullTvUrl}
                  className="font-mono text-xs bg-background h-9 select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-9 shrink-0 gap-1.5 font-bold"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-3">
                <Button asChild size="sm" variant="default" className="h-8 gap-1.5 rounded-xl text-xs font-bold">
                  <a href={fullTvUrl} target="_blank" rel="noopener noreferrer">
                    Open in new tab
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Device Setup Guide */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Quick Setup Guides
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'firetv', label: 'Amazon Fire TV' },
                { id: 'googletv', label: 'Google TV / Chromecast' },
                { id: 'appletv', label: 'Apple TV / AirPlay' },
                { id: 'smarttv', label: 'Smart TV Browser' },
                { id: 'kiosk', label: 'Mini PC / Pi' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveGuideTab(tab.id as any)}
                  className={`rounded-xl px-3 py-1.5 font-bold whitespace-nowrap transition-colors ${
                    activeGuideTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border bg-card/60 p-4 text-xs sm:text-sm leading-relaxed text-muted-foreground space-y-2">
              {activeGuideTab === 'firetv' && (
                <div>
                  <p className="font-bold text-foreground mb-1">Amazon Fire Stick / Fire TV:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Open the free <strong>Amazon Silk Browser</strong> from the Fire TV home screen.</li>
                    <li>Enter the copied link or scan the QR code using your phone to push the URL.</li>
                    <li>Press the <strong>Menu (3 horizontal lines)</strong> button on your remote and select <strong>Full Screen</strong>.</li>
                    <li>Bookmark the page so it opens instantly next time!</li>
                  </ol>
                </div>
              )}

              {activeGuideTab === 'googletv' && (
                <div>
                  <p className="font-bold text-foreground mb-1">Google TV / Chromecast / Android TV:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Download a browser like <strong>TV Bro</strong> or <strong>Chrome</strong> from the Google Play Store.</li>
                    <li>Navigate to the TV link above and bookmark it.</li>
                    <li>Enable Full Screen mode in the browser settings.</li>
                    <li>Tip: You can also cast any Chrome tab from your laptop directly to the Chromecast!</li>
                  </ol>
                </div>
              )}

              {activeGuideTab === 'appletv' && (
                <div>
                  <p className="font-bold text-foreground mb-1">Apple TV / AirPlay:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Open the TV link in Safari on any Mac, iPad, or iPhone.</li>
                    <li>Click the <strong>AirPlay</strong> icon in Control Center.</li>
                    <li>Select your <strong>Apple TV</strong> and enter Full Screen mode in Safari.</li>
                  </ol>
                </div>
              )}

              {activeGuideTab === 'smarttv' && (
                <div>
                  <p className="font-bold text-foreground mb-1">Samsung (Tizen) or LG (webOS) Smart TV:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Open the built-in <strong>Web Browser</strong> on your TV.</li>
                    <li>Type in the copied link and press enter.</li>
                    <li>Select <strong>Full Screen</strong> in the browser toolbar to hide address bars.</li>
                    <li>Pin the page to your TV home bar for one-click launch when powering on.</li>
                  </ol>
                </div>
              )}

              {activeGuideTab === 'kiosk' && (
                <div>
                  <p className="font-bold text-foreground mb-1">Raspberry Pi or Mini PC Chromebox Kiosk:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Configure Chrome/Chromium to launch on startup with kiosk mode:</li>
                    <code className="block rounded-lg bg-black/80 text-emerald-400 p-2 my-1 font-mono text-[11px]">
                      chromium-browser --kiosk --noerrdialogs --disable-infobars &quot;{fullTvUrl}&quot;
                    </code>
                    <li>The display will automatically reboot and stay alive 24/7 without screensavers.</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
