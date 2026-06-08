'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { TabWalkthroughConfig } from '@/lib/tabWalkthrough';
import { WizardHelpButtonClosing } from '@/components/support/WizardHelpButtonClosing';

type TabWalkthroughWizardProps = TabWalkthroughConfig & {
  triggerLabel?: string;
  className?: string;
};

export function TabWalkthroughWizard({
  title,
  subtitle,
  steps,
  triggerLabel = 'Wizard',
  className,
}: TabWalkthroughWizardProps) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const step = steps[idx];
  const last = idx >= steps.length - 1;

  const dialogDescription = useMemo(() => {
    const base = `Step ${idx + 1} of ${steps.length}`;
    return subtitle ? `${base} · ${subtitle}` : base;
  }, [idx, steps.length, subtitle]);

  if (!step || steps.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setIdx(0);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className ?? 'gap-2 shrink-0 rounded-xl font-semibold'}
          aria-label={`Open wizard for ${title}`}
        >
          <Wand2 className="w-4 h-4" aria-hidden />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent size="sm" data-settings-open="true">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription className="text-xs">{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-semibold text-sm">{step.title}</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            {step.checklist.map((line, i) => (
              <li key={i} className="pl-1 marker:font-medium marker:text-foreground">
                {line}
              </li>
            ))}
          </ol>
          {step.example ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs space-y-1.5">
              <p className="font-medium text-foreground">{step.example.heading}</p>
              <ul className="space-y-1 font-mono text-[11px] leading-snug text-foreground/90">
                {step.example.rows.map((row, i) => (
                  <li key={i}>{row}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {last ? <WizardHelpButtonClosing className="border-t border-border/60 pt-3" /> : null}
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={idx === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {last ? (
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
