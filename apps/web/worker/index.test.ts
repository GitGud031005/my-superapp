// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { toApiRequest } from './index';

describe('toApiRequest', () => {
  const origin = 'https://backend.example.com';

  it('keeps path and query and swaps the origin', () => {
    const upstream = toApiRequest(new Request('https://app.example.com/api/ledger/debts?status=open&page=2'), origin);
    expect(upstream.url).toBe('https://backend.example.com/api/ledger/debts?status=open&page=2');
  });

  it('forwards method, body and headers', async () => {
    const request = new Request('https://app.example.com/api/ledger/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
      body: JSON.stringify({ amount: 5 }),
    });
    const upstream = toApiRequest(request, origin);
    expect(upstream.method).toBe('POST');
    expect(upstream.headers.get('Content-Type')).toBe('application/json');
    expect(upstream.headers.get('Authorization')).toBe('Bearer token');
    expect(await upstream.json()).toEqual({ amount: 5 });
  });

  it('records the public host and protocol', () => {
    const upstream = toApiRequest(new Request('https://app.example.com/api/x'), origin);
    expect(upstream.headers.get('X-Forwarded-Host')).toBe('app.example.com');
    expect(upstream.headers.get('X-Forwarded-Proto')).toBe('https');
  });

  it('does not mutate the incoming request headers', () => {
    const request = new Request('https://app.example.com/api/x');
    toApiRequest(request, origin);
    expect(request.headers.has('X-Forwarded-Host')).toBe(false);
  });
});
