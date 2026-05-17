'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  parseSiteContactIntent,
  siteContactIntentLabel,
  type SiteContactIntent,
} from '@/lib/siteContact';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export function SiteContactForm({ initialIntent }: { initialIntent?: SiteContactIntent }) {
  const searchParams = useSearchParams();
  const intent = useMemo(
    () => initialIntent ?? parseSiteContactIntent(searchParams.get('intent')),
    [initialIntent, searchParams],
  );

  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const title = siteContactIntentLabel(intent);
  const subtitle =
    intent === 'demo'
      ? 'Tell us about your school and we will reach out to schedule a walkthrough.'
      : 'Send us a message about procurement, privacy, terms, or general questions.';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('submitting');
    setErrorMessage('');

    try {
      const res = await fetch('/api/site-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          name,
          email,
          organization,
          role,
          phone,
          message,
          company: '',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFormState('error');
        setErrorMessage(data.error || 'Could not send your message. Please try again.');
        return;
      }
      setFormState('success');
    } catch {
      setFormState('error');
      setErrorMessage('Network error. Check your connection and try again.');
    }
  }

  if (formState === 'success') {
    return <ContactSuccessPanel title={title} />;
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-black tracking-tight text-slate-100">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{subtitle}</p>
      </div>

      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="site-contact-company">Company</label>
        <input id="site-contact-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-contact-name" className="text-slate-200">
          Name <span className="text-rose-400">*</span>
        </Label>
        <Input
          id="site-contact-name"
          name="name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-slate-700 bg-slate-900/60 text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-contact-email" className="text-slate-200">
          Email <span className="text-rose-400">*</span>
        </Label>
        <Input
          id="site-contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-slate-700 bg-slate-900/60 text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-contact-organization" className="text-slate-200">
          School / organization {intent === 'demo' ? <span className="text-rose-400">*</span> : null}
        </Label>
        <Input
          id="site-contact-organization"
          name="organization"
          required={intent === 'demo'}
          autoComplete="organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="border-slate-700 bg-slate-900/60 text-slate-100"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="site-contact-role" className="text-slate-200">
            Role / title
          </Label>
          <Input
            id="site-contact-role"
            name="role"
            autoComplete="organization-title"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-slate-700 bg-slate-900/60 text-slate-100"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-contact-phone" className="text-slate-200">
            Phone
          </Label>
          <Input
            id="site-contact-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border-slate-700 bg-slate-900/60 text-slate-100"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="site-contact-message" className="text-slate-200">
          Message {intent === 'contact' ? <span className="text-rose-400">*</span> : null}
        </Label>
        <Textarea
          id="site-contact-message"
          name="message"
          required={intent === 'contact'}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            intent === 'demo'
              ? 'Grade levels, PBIS goals, timeline, or questions…'
              : 'How can we help?'
          }
          className="min-h-[120px] rounded-xl border-slate-700 bg-slate-900/60 text-slate-100"
        />
      </div>

      {formState === 'error' && errorMessage ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={formState === 'submitting'}
        className="h-12 w-full rounded-xl font-bold"
      >
        {formState === 'submitting' ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          'Send message'
        )}
      </Button>

      <p className="text-center text-xs text-slate-500">
        {intent === 'demo' ? (
          <>
            General question?{' '}
            <Link href="/contact" className="font-semibold text-sky-400 underline-offset-4 hover:underline">
              Contact us
            </Link>
          </>
        ) : (
          <>
            Want a walkthrough?{' '}
            <Link
              href="/contact?intent=demo"
              className="font-semibold text-sky-400 underline-offset-4 hover:underline"
            >
              Request a demo
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function ContactSuccessPanel({ title }: { title: string }) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-400" aria-hidden />
      <h1 className="text-2xl font-black tracking-tight text-slate-100">Message sent</h1>
      <p className="text-sm leading-relaxed text-slate-400">
        Thanks for reaching out about <span className="font-semibold text-slate-200">{title}</span>.
        We will reply to the email you provided as soon as we can.
      </p>
      <Button asChild className="h-11 w-full rounded-xl font-bold">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
