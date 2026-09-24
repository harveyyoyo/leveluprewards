// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it } from 'vitest';
import { GET } from './route';

const originalToken = process.env.TRANSPORT_PHONE_STATUS_TOKEN;

function request(token?: string) {
  return new NextRequest('https://example.com/api/office/transport/phone-status?schoolId=springfield&routeId=route-1', {
    headers: token ? { 'x-phone-status-token': token } : undefined,
  });
}

afterEach(() => {
  if (originalToken == null) delete process.env.TRANSPORT_PHONE_STATUS_TOKEN;
  else process.env.TRANSPORT_PHONE_STATUS_TOKEN = originalToken;
});

describe('private bus phone status', () => {
  it('stays unavailable until a phone-service token is configured', async () => {
    delete process.env.TRANSPORT_PHONE_STATUS_TOKEN;
    const response = await GET(request('anything'));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/not set up/i);
  });

  it('does not reveal bus status without the private token', async () => {
    process.env.TRANSPORT_PHONE_STATUS_TOKEN = 'correct-token';
    const response = await GET(request('wrong-token'));
    expect(response.status).toBe(401);
  });

  it('rejects an unknown run instead of guessing from the server clock', async () => {
    process.env.TRANSPORT_PHONE_STATUS_TOKEN = 'correct-token';
    const response = await GET(new NextRequest('https://example.com/api/office/transport/phone-status?schoolId=springfield&routeId=route-1&run=evening', {
      headers: { 'x-phone-status-token': 'correct-token' },
    }));
    expect(response.status).toBe(400);
  });

  it('rejects malformed school or route names before reading data', async () => {
    process.env.TRANSPORT_PHONE_STATUS_TOKEN = 'correct-token';
    const response = await GET(new NextRequest('https://example.com/api/office/transport/phone-status?schoolId=bad%2Fid&routeId=route-1', {
      headers: { 'x-phone-status-token': 'correct-token' },
    }));
    expect(response.status).toBe(400);
  });
});
