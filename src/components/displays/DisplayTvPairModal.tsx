"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, ExternalLink, Tv } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandedQrCode } from "@/components/qr/BrandedQrCode";

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
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const localOnly =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  const fullTvUrl = `${origin}/${encodeURIComponent(schoolId)}/displays?screen=${encodeURIComponent(screenId)}&fullscreen=1`;

  useEffect(() => {
    setCopied(false);
    setCopyError(false);
  }, [isOpen, screenId]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullTvUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Tv className="h-5 w-5 text-primary" />
            Show on TV
          </DialogTitle>
          <DialogDescription>
            Open “{screenName}” on a TV, projector, or another screen.
          </DialogDescription>
        </DialogHeader>
        {localOnly && (
          <p
            role="note"
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
          >
            This local preview link works only on this computer. For a separate
            TV, copy the screen link from your school’s published app.
          </p>
        )}
        <div className="space-y-2">
          <label htmlFor="tv-screen-link" className="text-sm font-semibold">
            Screen link
          </label>
          <div className="flex gap-2">
            <Input
              id="tv-screen-link"
              ref={inputRef}
              value={fullTvUrl}
              readOnly
              onFocus={(event) => event.target.select()}
              className="min-w-0 text-xs"
            />
            <Button variant="outline" onClick={copy} className="shrink-0 gap-2">
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          <p role="status" className="text-xs text-muted-foreground">
            {copyError
              ? "Copy didn’t work. The link is selected so you can copy it manually."
              : copied
                ? "Link copied."
                : "Keep this link bookmarked on the display device."}
          </p>
        </div>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              1
            </span>
            <div>
              <p className="font-semibold">Open the link on your display</p>
              <p className="mt-1 text-muted-foreground">
                Use the TV’s web browser, or a computer connected to the TV or
                projector.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              2
            </span>
            <div>
              <p className="font-semibold">Sign in if prompted</p>
              <p className="mt-1 text-muted-foreground">
                Use your school’s usual sign-in, including staff access when
                requested.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              3
            </span>
            <div>
              <p className="font-semibold">Select Full Screen</p>
              <p className="mt-1 text-muted-foreground">
                Move the pointer to reveal the display controls. Saved changes
                and school data update while the page is open.
              </p>
            </div>
          </li>
        </ol>
        <Button asChild className="w-full gap-2">
          <a href={fullTvUrl} target="_blank" rel="noopener noreferrer">
            Open display in a new tab
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        {!localOnly && (
          <details className="rounded-xl border p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Open the link on your phone
            </summary>
            <div className="mt-3 flex items-center gap-4">
              <div className="shrink-0 rounded-xl bg-white p-2">
                <BrandedQrCode
                  value={fullTvUrl}
                  size={112}
                  renderSize={224}
                  hideCenterBadge
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Scan to open the screen on your phone. This does not pair or
                remotely control a TV.
              </p>
            </div>
          </details>
        )}
      </DialogContent>
    </Dialog>
  );
}
