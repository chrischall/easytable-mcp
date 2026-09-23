// chrischall/fleet-audit#84: a booking POST that times out must never be
// re-sent by the bridge, and a failure after the POST left must be reported
// as "outcome unknown", not as a plain failure the model retries blindly.
import { describe, it, expect, vi } from 'vitest';
import { isRetrySafeOnTimeout } from '@fetchproxy/server';
import { McpToolError } from '@chrischall/mcp-utils';

const fetchSpy = vi.fn(async () => ({ status: 200, body: '', url: '' }));
vi.mock('@chrischall/mcp-utils/fetchproxy', () => ({
  createFetchproxyTransport: () => ({
    fetch: fetchSpy,
    start: async () => {},
    close: async () => {},
    status: () => ({}),
    server: { readDom: async () => ({}) },
  }),
}));

const { createEasyTableBridge } = await import('../src/bridge-fetchproxy.js');
const { EasyTableClient } = await import('../src/client.js');

describe('bridge timeout replay (fleet-audit#84)', () => {
  it('fetchproxy never re-sends a timed-out POST by default', () => {
    expect(isRetrySafeOnTimeout('POST')).toBe(false);
    expect(isRetrySafeOnTimeout('GET')).toBe(true);
  });

  it('the adapter does not opt booking POSTs into timeout retries', async () => {
    const bridge = createEasyTableBridge('0.0.0');
    await bridge.fetch({ url: 'https://book.easytable.com/user/ajax/json_booking.asp', method: 'POST', body: '{}' });
    const init = fetchSpy.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(init.method).toBe('POST');
    expect(init).not.toHaveProperty('retryOnTimeout');
  });

  it('reports a POST that throws after sending as outcome unknown', async () => {
    const bridge = {
      async fetch(init: { url: string; method?: string }) {
        if (init.method === 'POST') throw new Error('fetchproxy request timed out after 30000ms');
        return { status: 200, body: '', url: init.url };
      },
      async readDom() {
        return { turnstileToken: '0.TK' };
      },
    };
    const err = await new EasyTableClient(bridge)
      .createBooking({
        id: 'x', type: 't', date: '2026-07-10', time: '17:15', persons: 2, name: 'N', mobile: '+46701234567',
      })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(McpToolError);
    const text = `${(err as McpToolError).message} ${(err as McpToolError).hint ?? ''}`;
    expect(text).toMatch(/unknown/i);
    expect(text).toMatch(/easytable_find_bookings/);
    expect(text).toMatch(/timed out/);
  });
});
