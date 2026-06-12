import type { Metadata } from 'next';
import { OfficeAppProvider } from '@/components/OfficeAppProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'School Office — LevelUp',
  description: 'Grades and billing for your school',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-office-portal="" data-hide-global-header="">
      <head>
        <meta name="theme-color" content="#0d9488" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <OfficeAppProvider>{children}</OfficeAppProvider>
      </body>
    </html>
  );
}
