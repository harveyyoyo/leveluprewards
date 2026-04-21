'use client';

import { useEffect } from 'react';
import { getReadableErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,900&family=Source+Code+Pro:wght@400;600&family=Libre+Barcode+39&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
            <Card className="max-w-lg w-full text-center">
                <CardHeader>
                <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                    <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <CardTitle className="text-2xl mt-4">Application Error</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                    {getReadableErrorMessage(
                        error,
                        'Something went wrong. You can try to recover by clicking the button below.',
                    )}
                </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => reset()}
                        className="mt-6 w-full"
                    >
                        Try again
                    </Button>
                </CardContent>
            </Card>
        </div>
      </body>
    </html>
  );
}
