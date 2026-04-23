'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getReadableErrorMessage } from '@/lib/errorMessage';

/**
 * Route-level error boundary. Next.js automatically wraps every page inside
 * the nearest `error.tsx` — so a thrown render in any route falls into this
 * card instead of crashing the whole app shell.
 *
 * `global-error.tsx` handles the (rarer) case of a render error in the root
 * layout itself.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route-level error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/50 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="font-headline text-2xl text-destructive font-bold">
            Something went wrong
          </CardTitle>
          <CardDescription>
            This page hit an unexpected error. You can retry or head back to the
            portal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getReadableErrorMessage(error, 'Something went wrong. Please try again.')}
          </p>
          {error.digest && (
            <p className="text-[11px] text-muted-foreground/70 font-mono">
              Ref: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={reset} className="flex-1 font-bold">
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
            <Button asChild variant="outline" className="flex-1 font-bold">
              <a href="/">
                <Home className="mr-2 h-4 w-4" /> Home
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
