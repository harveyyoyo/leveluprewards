// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('private parent arrival choices', () => {
  it('requires a signed-in parent session', async () => {
    const response = await POST(new NextRequest('https://example.com/api/office/transport/parent-preferences', {
      method: 'POST',
      headers: { Origin: 'https://example.com', Host: 'example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: 'springfield', email: true, sms: false, whatsapp: false }),
    }));
    expect(response.status).toBe(401);
  });
});
