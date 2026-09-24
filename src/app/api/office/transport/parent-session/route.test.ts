// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('private parent bus session gate', () => {
  it('rejects an invalid access code before reading school data', async () => {
    const response = await POST(new NextRequest('https://example.com/api/office/transport/parent-session', {
      method: 'POST',
      headers: { Origin: 'https://example.com', Host: 'example.com', 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: 'springfield', code: 'short' }),
    }));
    expect(response.status).toBe(400);
  });
});
