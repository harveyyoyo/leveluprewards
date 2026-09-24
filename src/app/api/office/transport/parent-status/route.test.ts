// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET } from './route';

describe('private parent bus status gate', () => {
  it('requires a private parent session', async () => {
    const response = await GET(new NextRequest('https://example.com/api/office/transport/parent-status?schoolId=springfield'));
    expect(response.status).toBe(401);
  });
});
