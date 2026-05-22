import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { AppProvider } from "@/components/AppProvider";
import { FirebaseClientProvider } from '@/firebase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
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
  const requestHost = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? '';
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
      </head>
      <body className="font-sans antialiased bg-background text-foreground transition-colors duration-500 min-h-screen" suppressHydrationWarning>
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
