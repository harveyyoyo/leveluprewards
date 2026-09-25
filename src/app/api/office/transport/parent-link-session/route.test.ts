// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('private parent bus link session', () => {
  it('rejects an invalid link before reading school data', async () => {
    const response = await POST(new NextRequest('https://example.com/api/office/transport/parent-link-session', {
      method: 'POST',
      headers: { Origin: 'https://example.com', Host: 'example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: 'springfield', linkToken: 'short' }),
    }));
    expect(response.status).toBe(400);
  });
});
