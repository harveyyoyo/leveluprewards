import Link from 'next/link';
import { getContactFormHref, SITE_LEGAL_UMBRELLA } from '@/lib/appBranding';

export function LegalPageFooter() {
  return (
    <footer className="mt-10 border-t border-border/60 pt-6 text-center print:hidden">
      <p className="text-[11px] leading-snug text-muted-foreground/80">{SITE_LEGAL_UMBRELLA}</p>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        Questions?{' '}
        <Link
          href={getContactFormHref()}
          className="underline underline-offset-4 hover:text-foreground transition-colors"
        >
          Contact us
        </Link>
      </p>
    </footer>
  );
}
