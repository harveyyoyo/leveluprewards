import Link from 'next/link';
import { LegalPageFooter } from '@/components/layout/LegalPageFooter';
import { getContactFormHref } from '@/lib/appBranding';

export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  const privacyUrl =
    process.env.NEXT_PUBLIC_PRIVACY_URL?.trim() ||
    '/privacy/LevelUp-EdTech-Enterprises-LLC-Data-Privacy-Agreement-DPSA-2026.pdf';

  return (
    <main className="bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Data Privacy and Security Agreement (DPSA)
            </p>
          </div>
          <a
            href={privacyUrl}
            target={privacyUrl.startsWith('http') ? '_blank' : undefined}
            rel={privacyUrl.startsWith('http') ? 'noreferrer' : undefined}
            className="w-full sm:w-auto text-center justify-center shrink-0 inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-accent transition-colors"
          >
            [Download Official PDF Version]
          </a>
        </div>

        <div className="mt-10 space-y-8 text-sm leading-7 text-foreground/90">
          <p>
            This Data Privacy and Security Agreement (&quot;Agreement&quot;) is entered into by and between{' '}
            <span className="font-bold text-foreground">LevelUp EdTech Enterprises LLC</span> (&quot;Provider&quot;) and
            the school, district, or educational organization listed in the signature block (&quot;Subscriber&quot;).
            This document establishes the protocols for the protection of Student Data and Personally Identifiable
            Information (PII) in accordance with 2026 industry standards and legal requirements.
          </p>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">1. Scope of Service</h2>
            <p>
              Provider provides a behavioral incentive and student rewards platform (&quot;LevelUp Rewards&quot;). To
              provide this service, certain data elements must be processed to track student progress, manage point
              ledgers, and facilitate check-ins.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">2. Data Collection and Usage Rubric</h2>
            <p>
              The following outlines the data elements collected and the specific purpose for each as required by FERPA
              and COPPA guidelines.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-bold text-foreground">Student Identity</span>: First Name, Last Initial, Grade
                Level — to identify participants in the rewards ledger.
              </li>
              <li>
                <span className="font-bold text-foreground">Behavioral Records</span>: Points Earned, Reward Redemptions
                — core functional data for the incentive system.
              </li>
              <li>
                <span className="font-bold text-foreground">Technical Logs</span>: IP Address, Browser Type, Login
                Timestamps — security monitoring and platform optimization.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">3. 2026 Artificial Intelligence (AI) Compliance</h2>
            <p>
              <span className="font-bold text-foreground">LevelUp EdTech Enterprises LLC</span> adheres to the 1EdTech
              Generative AI Data Rubric. We provide the following explicit guarantees:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-bold text-foreground">No Model Training</span>: Student PII, behavioral logs, and
                teacher comments are NEVER used to train, fine-tune, or iterate upon any Large Language Models (LLMs) or
                generative AI systems.
              </li>
              <li>
                <span className="font-bold text-foreground">Data Isolation</span>: All student data is stored in isolated
                environments. AI features (such as automated reward descriptions) are processed via
                &quot;Zero-Retention&quot; APIs where data is deleted immediately after the specific task is completed.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">4. New York Education Law 2-d Supplemental Information</h2>
            <p>
              As a Brooklyn-based entity, Provider complies with New York State Education Law 2-d and the Parents&apos;
              Bill of Rights.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-bold text-foreground">Storage Location</span>: Google Cloud / Firebase (US-East
                Multi-Region).
              </li>
              <li>
                <span className="font-bold text-foreground">Encryption Standards</span>: AES-256 at rest; TLS 1.3 in
                transit.
              </li>
              <li>
                <span className="font-bold text-foreground">Data Deletion Policy</span>: Data is purged within 90 days of
                contract termination or upon written request.
              </li>
              <li>
                <span className="font-bold text-foreground">Authorized Sub-processors</span>: Google Cloud Platform,
                Cloudflare Inc.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">5. Breach Notification</h2>
            <p>
              In the event of an unauthorized release of Student Data, Provider will notify the Subscriber within seven
              (7) days of discovery and will cooperate fully with the Subscriber&apos;s data protection officer to
              mitigate any impact.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">6. Execution</h2>
            <p>By signing below, the parties agree to be bound by the terms of this Agreement.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-bold text-foreground">Provider</span>: LevelUp EdTech Enterprises LLC
              </li>
              <li>
                <span className="font-bold text-foreground">Signature</span>: ________________________________{' '}
                <span className="font-bold text-foreground">Date</span>: May 6, 2026
              </li>
              <li>
                <span className="font-bold text-foreground">Name</span>: Dovid Teitelbaum{' '}
                <span className="font-bold text-foreground">Title</span>: Managing Member
              </li>
              <li>
                <span className="font-bold text-foreground">Subscriber</span>: [School/District Name]
              </li>
              <li>
                <span className="font-bold text-foreground">Signature</span>: ________________________________{' '}
                <span className="font-bold text-foreground">Date</span>: ___________
              </li>
              <li>
                <span className="font-bold text-foreground">Name</span>: ________________________________{' '}
                <span className="font-bold text-foreground">Title</span>: ________________
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-foreground">Contact Us</h2>
            <p>
              If you have questions about this Agreement or data privacy practices, please{' '}
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

