
import { AppProvider } from "@/components/AppProvider";
import { FirebaseClientProvider } from '@/firebase';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LayoutClientWrapper from "@/components/LayoutClientWrapper";
import "./globals.css";

export const metadata = {
  title: 'levelUp EDU',
  description: 'LevelUp rewards hub',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#13a58d" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="levelUp EDU" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&family=Source+Code+Pro:wght@400;600&family=Libre+Barcode+39&family=Fraunces:wght@600;700;800&family=DM+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground transition-colors duration-500 min-h-screen" suppressHydrationWarning>
        <ErrorBoundary name="RootFirebaseProvider">
          <FirebaseClientProvider>
            <AppProvider>
              <LayoutClientWrapper>
                {children}
              </LayoutClientWrapper>
            </AppProvider>
          </FirebaseClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
