import Link from 'next/link';
import { LegalPageFooter } from '@/components/LegalPageFooter';
import { getContactFormHref } from '@/lib/appBranding';

export const dynamic = 'force-dynamic';

export default function TermsPage() {
  const termsUrl =
    process.env.NEXT_PUBLIC_TERMS_URL?.trim() ||
    '/terms/LevelUp-EdTech-Enterprises-LLC-Terms-of-Service-2026.pdf';

  return (
    <main className="bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Effective Date: May 6, 2026
            </p>
          </div>
          <a
            href={termsUrl}
            target={termsUrl.startsWith('http') ? '_blank' : undefined}
            rel={termsUrl.startsWith('http') ? 'noreferrer' : undefined}
            className="w-full sm:w-auto text-center justify-center shrink-0 inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-accent transition-colors"
          >
            [Download Official PDF Version]
          </a>
        </div>

        <div className="mt-10 space-y-8 text-sm leading-7 text-foreground/90">
          <p>
            Welcome to LevelUp Rewards, operated by{' '}
            <span className="font-bold text-foreground">LevelUp EdTech Enterprises LLC</span> (&quot;we,&quot; &quot;us,&quot; or
            &quot;our&quot;). By accessing or using our website, platform, and behavioral incentive services (the
            &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">1. Use of the Service</h2>
            <p>
              LevelUp Rewards is designed for educational use by schools, teachers, and students. You agree to use the
              Service only for lawful purposes and in accordance with these Terms. You are responsible for maintaining
              the confidentiality of your login credentials and for all activities that occur under your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">2. Eligibility and Authority</h2>
            <p>
              If you are an individual teacher or administrator using this Service on behalf of a school or district,
              you represent that you have the authority to bind that entity to these Terms. Use by students must be
              overseen by an authorized educational professional.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">3. Intellectual Property Rights</h2>
            <p>
              The Service, including its source code (Next.js/Firebase architecture), user interface design, logos, and
              original content, is the exclusive property of{' '}
              <span className="font-bold text-foreground">LevelUp EdTech Enterprises LLC</span> and is protected by
              United States and international copyright, trademark, and other intellectual property laws.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-bold text-foreground">License</span>: We grant you a limited, non-exclusive,
                non-transferable license to access the Service for educational purposes.
              </li>
              <li>
                <span className="font-bold text-foreground">Restrictions</span>: You may not reverse engineer,
                decompile, or attempt to extract the source code of the Service.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">4. User Content</h2>
            <p>
              You retain ownership of any data or content you upload to the Service (&quot;User Content&quot;). However,
              by using the Service, you grant us the right to process this content solely for the purpose of providing
              the rewards and incentive features to you and your students.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">5. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, without notice, for
              conduct that we believe violates these Terms or is harmful to other users or the Service&apos;s integrity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">6. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law,{' '}
              <span className="font-bold text-foreground">LevelUp EdTech Enterprises LLC</span> shall not be liable for
              any indirect, incidental, or consequential damages arising out of your use of the Service. The Service is
              provided &quot;as is&quot; without warranties of any kind.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">7. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of New York, without regard to its conflict of law
              principles. Any legal action related to these Terms shall be brought in the courts located in Kings
              County, New York.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">8. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of any significant changes by posting the
              new Terms on this page and updating the &quot;Effective Date.&quot;
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">Contact Us</h2>
            <p>
              If you have questions about these Terms, please{' '}
              <Link
                href={getContactFormHref()}
                className="font-bold underline underline-offset-4 hover:text-foreground"
              >
                contact us
              </Link>
              .
            </p>
          </section>
        </div>

        <LegalPageFooter />
        <div className="mt-6 print:hidden">
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

