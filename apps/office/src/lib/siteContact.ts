export type SiteContactIntent = 'demo' | 'contact';

export const SITE_CONTACT_PATH = '/contact';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseSiteContactIntent(raw: string | null | undefined): SiteContactIntent {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'demo' ? 'demo' : 'contact';
}

export function buildSiteContactHref(intent: SiteContactIntent = 'contact'): string {
  if (intent === 'demo') return `${SITE_CONTACT_PATH}?intent=demo`;
  return SITE_CONTACT_PATH;
}

export function siteContactIntentLabel(intent: SiteContactIntent): string {
  return intent === 'demo' ? 'Request a Demo' : 'Contact Us';
}

export type SiteContactPayload = {
  intent: SiteContactIntent;
  name: string;
  email: string;
  organization: string;
  role: string;
  phone: string;
  message: string;
  /** Honeypot — must be empty for real submissions. */
  company: string;
};

export type SiteContactValidationResult =
  | { ok: true; data: Omit<SiteContactPayload, 'company'> }
  | { ok: false; error: string };

function cleanField(raw: unknown, max: number): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\u0000/g, '').trim().slice(0, max);
}

export function validateSiteContactBody(body: unknown): SiteContactValidationResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request.' };
  }

  const record = body as Record<string, unknown>;
  const company = cleanField(record.company, 200);
  if (company) {
    return { ok: false, error: 'Invalid request.' };
  }

  const intent = parseSiteContactIntent(
    typeof record.intent === 'string' ? record.intent : undefined,
  );
  const name = cleanField(record.name, 120);
  const email = cleanField(record.email, 200);
  const organization = cleanField(record.organization, 200);
  const role = cleanField(record.role, 120);
  const phone = cleanField(record.phone, 40);
  const message = cleanField(record.message, 4000);

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required.' };
  if (intent === 'demo' && !organization) {
    return { ok: false, error: 'School or organization is required for demo requests.' };
  }
  if (intent === 'contact' && !message) {
    return { ok: false, error: 'Please include a message.' };
  }

  return {
    ok: true,
    data: { intent, name, email, organization, role, phone, message },
  };
}
