import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  const termsUrl =
    process.env.NEXT_PUBLIC_TERMS_URL?.trim() ||
    '/terms/LevelUp-Rewards-Terms-of-Service-2026.pdf';

  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-muted-foreground">
          The Terms of Service are provided as a PDF.
        </p>

        <div className="mt-6">
          <a
            href={termsUrl}
            target={termsUrl.startsWith('http') ? '_blank' : undefined}
            rel={termsUrl.startsWith('http') ? 'noreferrer' : undefined}
            className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2 font-semibold hover:bg-accent transition-colors"
          >
            Open PDF
          </a>
        </div>

        <div className="mt-10">
          <Link
            href="/"
            className="text-sm font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

