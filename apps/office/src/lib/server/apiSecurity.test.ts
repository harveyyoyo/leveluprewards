import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { BodyTooLargeError, readJsonBodyWithLimit } from './apiSecurity';

function requestWithBody(body: string) {
  return new NextRequest('https://leveluprewards.app/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

describe('readJsonBodyWithLimit', () => {
  it('parses a body within the limit', async () => {
    const req = requestWithBody(JSON.stringify({ a: 1 }));
    await expect(readJsonBodyWithLimit(req, 1024)).resolves.toEqual({ a: 1 });
  });

  it('rejects a body over the limit by actual byte count, not a header', async () => {
    // No Content-Length can be forged in a real fetch stream, but the same code path
    // (counting bytes as they arrive) is what protects against a missing/lying header
    // under chunked transfer-encoding - simulate that by setting a tiny limit.
    const big = 'x'.repeat(2000);
    const req = requestWithBody(JSON.stringify({ big }));
    await expect(readJsonBodyWithLimit(req, 100)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it('returns an empty object for a bodyless request', async () => {
    const req = new NextRequest('https://leveluprewards.app/api/test', { method: 'POST' });
    await expect(readJsonBodyWithLimit(req, 1024)).resolves.toEqual({});
  });
});
