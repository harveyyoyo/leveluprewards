'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/**
 * Replaces `window.confirm()` with a themed AlertDialog so every destructive
 * action uses the same look. Returns a promise resolved to true / false.
 *
 * Wrap the app in `<ConfirmProvider>` (inside the TooltipProvider) and call
 * `const confirm = useConfirm();` inside components.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<
    | null
    | (ConfirmOptions & { resolve: (v: boolean) => void })
  >(null);

  const confirm: ConfirmFn = React.useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleClose = (ok: boolean) => {
    if (state) state.resolve(ok);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!state} onOpenChange={(o) => { if (!o) handleClose(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            {state?.description && (
              <AlertDialogDescription className="leading-relaxed">
                {state.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {state?.cancelLabel || 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose(true)}
              className={cn(
                state?.destructive &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {state?.confirmLabel || 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

/** Promise-based confirm. Falls back to `window.confirm` if no provider is mounted. */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (ctx) return ctx;
  return async (opts) => {
    if (typeof window === 'undefined') return false;
    return window.confirm(opts.description ? `${opts.title}\n\n${opts.description}` : opts.title);
  };
}
