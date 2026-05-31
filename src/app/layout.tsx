import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { AppProvider } from "@/components/AppProvider";
import { FirebaseClientProvider } from '@/firebase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LayoutClientWrapper from "@/components/layout/LayoutClientWrapper";
import { isOfficeHostname, OFFICE_CHROME_REQUEST_HEADER } from '@/lib/officeRouting';
import "./globals.css";



/** Base URL for resolving relative OG / Twitter image paths (set NEXT_PUBLIC_SITE_URL in prod). */
function appMetadataBase(): URL {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      return new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`);
    } catch {
      /* fall through */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel.replace(/^https?:\/\//, '')}`);
    } catch {
      /* fall through */
    }
  }
  return new URL('http://localhost:3000');
}

export const metadata: Metadata = {
  metadataBase: appMetadataBase(),
  title: 'levelUp EDU',
  description: 'LevelUp rewards hub',
  manifest: '/manifest.json',
  /** Tab / PWA icons: `src/app/icon.png` / `apple-icon.png` (do not add `public/icon.png` — same URL conflicts with the app route). */
  openGraph: {
    title: 'levelUp EDU',
    description: 'LevelUp rewards hub',
    siteName: 'levelUp EDU',
    images: [{ url: '/logo.png', alt: 'levelUp EDU' }],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'levelUp EDU',
    description: 'LevelUp rewards hub',
    images: ['/logo.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const requestHost =
    headerList.get('x-fh-requested-host') ??
    headerList.get('x-forwarded-host') ??
    headerList.get('host') ??
    '';
  const isOfficeHost = isOfficeHostname(requestHost);
  const officeChromeFromMiddleware =
    headerList.get(OFFICE_CHROME_REQUEST_HEADER) === 'hidden';
  const hideGlobalHeader = officeChromeFromMiddleware || isOfficeHost;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-office-portal={hideGlobalHeader ? '' : undefined}
      data-hide-global-header={hideGlobalHeader ? '' : undefined}
    >
      <head>
        <meta name="theme-color" content="#13a58d" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="levelUp EDU" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Critical fonts – preloaded for fast text rendering */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Non-critical fonts – loaded after initial paint via low-priority link */}
        <link
          id="deferred-fonts"
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;600;700&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&family=Source+Code+Pro:wght@400;600&family=Libre+Barcode+39&family=Fraunces:wght@600;700;800&display=swap"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `requestIdleCallback?requestIdleCallback(function(){var l=document.getElementById('deferred-fonts');if(l)l.media='all'}):setTimeout(function(){var l=document.getElementById('deferred-fonts');if(l)l.media='all'},100)`,
          }}
        />
        {process.env.NODE_ENV === 'development' ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var compileMs=15000,staleMs=90000;setTimeout(function(){if(window.__LEVELUP_APP_MOUNTED__)return;var h=document.getElementById('levelup-js-boot-hint');var c=document.getElementById('levelup-js-boot-compiling');if(h&&c){h.hidden=false;c.hidden=false;}},compileMs);setTimeout(function(){if(window.__LEVELUP_APP_MOUNTED__)return;var h=document.getElementById('levelup-js-boot-hint');var c=document.getElementById('levelup-js-boot-compiling');var s=document.getElementById('levelup-js-boot-stale');if(h&&s){if(c)c.hidden=true;s.hidden=false;h.hidden=false;}},staleMs);})();`,
            }}
          />
        ) : null}
      </head>
      <body className="font-sans antialiased bg-background text-foreground transition-colors duration-500 min-h-screen" suppressHydrationWarning>
        {process.env.NODE_ENV === 'development' ? (
          <div
            id="levelup-js-boot-hint"
            hidden
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 p-6 text-center text-sm text-foreground"
          >
            <p id="levelup-js-boot-compiling" hidden className="max-w-md leading-relaxed">
              Still loading dev bundles… first visit to Admin can take up to a minute while webpack compiles.
              Use <code className="font-mono">http://127.0.0.1:3000</code> (not{' '}
              <code className="font-mono">localhost</code>) if the page never finishes loading.
            </p>
            <p id="levelup-js-boot-stale" hidden className="max-w-md leading-relaxed">
              App scripts did not load (stale dev build). Stop other <code className="font-mono">next dev</code>{' '}
              processes, run <code className="font-mono">npm run dev:reset</code>, then hard-refresh (
              <kbd className="font-mono">Ctrl+Shift+R</kbd>) at{' '}
              <code className="font-mono">http://127.0.0.1:3000</code>.
            </p>
          </div>
        ) : null}
        <div
          id="arcade-backdrop-host"
          className="arcade-animated-site-bg no-print pointer-events-none fixed inset-0 min-h-0 w-full overflow-visible"
          aria-hidden
        />
        <div data-app-view-root className="relative z-10 min-h-screen">
          <ErrorBoundary name="RootFirebaseProvider">
            <FirebaseClientProvider>
              <AppProvider>
                <LayoutClientWrapper
                  isOfficeHost={isOfficeHost}
                  hideGlobalHeader={hideGlobalHeader}
                >
                  {children}
                </LayoutClientWrapper>
              </AppProvider>
            </FirebaseClientProvider>
          </ErrorBoundary>
        </div>
      </body>
    </html>
  );
}
