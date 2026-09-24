// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchTransportParentStatus, TransportParentClientError } from './transportParentClient';

describe('transport parent client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the HTTP status so a temporary failure can be handled differently from an expired code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Private bus access expired.' }), { status: 401 })));
    const request = fetchTransportParentStatus('school');
    await expect(request).rejects.toMatchObject({ status: 401 });
    await request.catch((error) => expect(error).toBeInstanceOf(TransportParentClientError));
  });
});
