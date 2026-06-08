import { cn } from '@/lib/utils';

type Props = {
  className?: string;
};

/** Shared closing note for wizard and walkthrough final steps. */
export function WizardHelpButtonClosing({ className }: Props) {
  return (
    <p className={cn('text-sm text-muted-foreground leading-relaxed', className)}>
      Questions later? Tap the <strong className="font-semibold text-foreground">Help</strong> button in the
      lower-right corner for AI answers and tech support.
    </p>
  );
}
