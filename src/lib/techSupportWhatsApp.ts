/**
 * Server-only: send a tech-support notification to the operator’s WhatsApp.
 * Configure one of the providers via environment variables.
 */

const MAX_OUT_LEN = 1600;

export interface TechSupportContext {
  message: string;
  schoolId: string;
  loginState?: string;
  pathname?: string;
  userLabel?: string;
  userId?: string;
}

function buildBody(c: TechSupportContext): string {
  const lines = [
    `*levelUp EDU — tech support*`,
    `School: ${c.schoolId}`,
    c.userLabel ? `From: ${c.userLabel}` : null,
    c.loginState ? `Role: ${c.loginState}` : null,
    c.userId ? `UID: ${c.userId}` : null,
    c.pathname ? `Page: ${c.pathname}` : null,
    `—`,
    c.message.trim(),
  ].filter((x): x is string => Boolean(x));
  const text = lines.join('\n');
  return text.length > MAX_OUT_LEN ? `${text.slice(0, MAX_OUT_LEN - 1)}…` : text;
}

function toWhatsappAddress(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('whatsapp:')) return t;
  const digits = t.replace(/\D/g, '');
  if (!digits) return t;
  return `whatsapp:+${digits.replace(/^\+?/, '')}`;
}

async function sendViaTwilio(body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const fromRaw = process.env.TWILIO_WHATSAPP_FROM?.trim();
  const toRaw = process.env.TECH_SUPPORT_WHATSAPP_TO?.trim();
  if (!sid || !token || !fromRaw || !toRaw) {
    return { ok: false, error: 'not_configured' };
  }

  const fromAddr = fromRaw.startsWith('whatsapp:') ? fromRaw : toWhatsappAddress(fromRaw);
  const toAddr = toRaw.startsWith('whatsapp:') ? toRaw : toWhatsappAddress(toRaw);

  const params = new URLSearchParams();
  params.set('From', fromAddr);
  params.set('To', toAddr);
  params.set('Body', body);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { ok: false, error: `twilio_http_${res.status}: ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}

/**
 * CallMeBot: get an API key from their setup flow, then only the key is required
 * to message the linked WhatsApp. Optional CALLMEBOT_PHONE if your account needs it.
 * @see https://www.callmebot.com/
 */
async function sendViaCallMeBot(body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const apikey = process.env.CALLMEBOT_APIKEY?.trim();
  const phone = process.env.CALLMEBOT_PHONE?.trim();
  if (!apikey) {
    return { ok: false, error: 'not_configured' };
  }

  const q = new URLSearchParams();
  if (phone) q.set('phone', phone);
  q.set('apikey', apikey);
  q.set('text', body);

  const url = `https://api.callmebot.com/whatsapp.php?${q.toString()}`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!res.ok) {
    return { ok: false, error: `callmebot_http_${res.status}` };
  }
  const t = (await res.text()).trim();
  if (!/success|sent|ok|message queued/i.test(t) && t.length > 0 && /error|fail|invalid/i.test(t)) {
    return { ok: false, error: `callmebot: ${t.slice(0, 120)}` };
  }
  return { ok: true };
}

/**
 * Returns whether any outbound WhatsApp provider is configured.
 */
export function isTechSupportWhatsAppConfigured(): boolean {
  const twilio =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM &&
    process.env.TECH_SUPPORT_WHATSAPP_TO;
  const callme = Boolean(process.env.CALLMEBOT_APIKEY?.trim());
  return Boolean(twilio || callme);
}

export async function deliverTechSupportWhatsApp(
  context: TechSupportContext
): Promise<{ ok: true; provider: 'twilio' | 'callmebot' } | { ok: false; error: string }> {
  const body = buildBody(context);

  const tw = await sendViaTwilio(body);
  if (tw.ok) return { ok: true, provider: 'twilio' };
  if (tw.error !== 'not_configured') {
    return { ok: false, error: 'WhatsApp could not be sent (Twilio). Ask the developer to check server logs.' };
  }

  const cb = await sendViaCallMeBot(body);
  if (cb.ok) return { ok: true, provider: 'callmebot' };
  if (cb.error !== 'not_configured') {
    return { ok: false, error: 'WhatsApp could not be sent (CallMeBot). Ask the developer to check server logs.' };
  }

  return {
    ok: false,
    error:
      'Tech support WhatsApp is not configured. Set Twilio WhatsApp variables or CALLMEBOT_APIKEY on the server.',
  };
}
