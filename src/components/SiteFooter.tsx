'use client';

import Link from 'next/link';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { getContactFormHref, SITE_LEGAL_UMBRELLA } from '@/lib/appBranding';

export function SiteFooter() {
  const playSound = useArcadeSound();

  return (
    <footer className="border-t border-border/60 bg-background/85 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
            beta · {process.env.NEXT_PUBLIC_VERSION || 'beta-1.1.0'} · {process.env.NEXT_PUBLIC_BUILD_TIME}
          </p>
          <p className="max-w-2xl text-[10px] leading-snug text-muted-foreground/65">
            {SITE_LEGAL_UMBRELLA}
          </p>
          <p className="text-[11px] leading-tight font-semibold text-muted-foreground/75">
            © 2026 LevelUp EdTech Enterprises LLC. All rights reserved.{' '}
            <span className="text-muted-foreground/50">|</span>{' '}
            <Link
              href="/terms"
              onClick={() => playSound('click')}
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>{' '}
            <span className="text-muted-foreground/50">|</span>{' '}
            <Link
              href="/privacy"
              onClick={() => playSound('click')}
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>{' '}
            <span className="text-muted-foreground/50">|</span>{' '}
            <Link
              href={getContactFormHref()}
              onClick={() => playSound('click')}
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Contact Us
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
