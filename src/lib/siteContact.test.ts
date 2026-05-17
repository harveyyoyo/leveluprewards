import { describe, expect, it } from 'vitest';
import {
  buildSiteContactHref,
  parseSiteContactIntent,
  validateSiteContactBody,
} from './siteContact';

describe('siteContact', () => {
  it('parses demo intent from query values', () => {
    expect(parseSiteContactIntent('demo')).toBe('demo');
    expect(parseSiteContactIntent('DEMO')).toBe('demo');
    expect(parseSiteContactIntent('contact')).toBe('contact');
    expect(parseSiteContactIntent(null)).toBe('contact');
  });

  it('builds contact URLs', () => {
    expect(buildSiteContactHref('demo')).toBe('/contact?intent=demo');
    expect(buildSiteContactHref('contact')).toBe('/contact');
  });

  it('requires organization for demo requests', () => {
    const result = validateSiteContactBody({
      intent: 'demo',
      name: 'Jane Doe',
      email: 'jane@school.edu',
      message: 'Interested in a walkthrough.',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/organization/i);
  });

  it('accepts valid demo submissions', () => {
    const result = validateSiteContactBody({
      intent: 'demo',
      name: 'Jane Doe',
      email: 'jane@school.edu',
      organization: 'Example Elementary',
      message: 'We have 400 students.',
    });
    expect(result.ok).toBe(true);
  });

  it('rejects honeypot submissions', () => {
    const result = validateSiteContactBody({
      intent: 'contact',
      name: 'Bot',
      email: 'bot@example.com',
      message: 'spam',
      company: 'Acme Inc',
    });
    expect(result.ok).toBe(false);
  });
});
