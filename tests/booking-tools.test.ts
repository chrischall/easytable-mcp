// Tool-level behaviour of the booking writes.
//  - fleet-audit#85: three outcomes (ok / rejected / unknown), raw body kept.
//  - fleet-audit#86: modify warns about fields it will blank.
import { describe, it, expect, afterEach } from 'vitest';
import { registerBookingTools } from '../src/tools/booking.js';
import { EasyTableClient, type Bridge } from '../src/client.js';
import { createTestHarness, parseToolResult } from './helpers.js';

function bridgeAnswering(writeBody: string): Bridge {
  return {
    async fetch(init) {
      if (init.url.includes('/user/ajax/json_')) return { status: 200, body: writeBody, url: init.url };
      return { status: 200, body: '', url: init.url };
    },
    async readDom() {
      return { turnstileToken: '0.TK' };
    },
  };
}

let harness: Awaited<ReturnType<typeof createTestHarness>> | undefined;
afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

async function call(bridge: Bridge, name: string, args: Record<string, unknown>) {
  harness = await createTestHarness((server) => registerBookingTools(server, new EasyTableClient(bridge)));
  const res = await harness.client.callTool({ name, arguments: args });
  return parseToolResult<Record<string, unknown>>(res as never);
}

const createArgs = {
  id: '1fdfc', type: '13991', date: '2026-07-10', time: '17:15', persons: 2,
  name: 'Test Guest', mobile: '+46701234567', confirm: true,
};

describe('write outcomes (fleet-audit#85)', () => {
  it('Status 1 is ok', async () => {
    const out = await call(bridgeAnswering('cb([{"Status":1,"confirmUrl":"/ok"}])'), 'easytable_create_booking', createArgs);
    expect(out).toMatchObject({ ok: true, outcome: 'ok', status: 1, confirmUrl: '/ok' });
  });

  it('Status 0 is rejected, with the error markup kept', async () => {
    const out = await call(bridgeAnswering('cb([{"Status":0,"errHtml":"<p>Full</p>"}])'), 'easytable_create_booking', createArgs);
    expect(out).toMatchObject({ ok: false, outcome: 'rejected', status: 0 });
    expect(JSON.stringify(out.raw)).toContain('Full');
  });

  it('a non-JSON body is unknown, keeps the body text, and says to reconcile first', async () => {
    const out = await call(bridgeAnswering('OK'), 'easytable_create_booking', createArgs);
    expect(out).toMatchObject({ ok: false, outcome: 'unknown', raw: 'OK' });
    expect(String(out.message)).toMatch(/easytable_find_bookings/);
    expect(String(out.message)).toMatch(/before retrying/i);
  });

  it('an object without a Status is unknown too', async () => {
    const out = await call(bridgeAnswering('{"message":"done"}'), 'easytable_modify_booking', { ...createArgs, existing: 'B1' });
    expect(out).toMatchObject({ ok: false, outcome: 'unknown', raw: { message: 'done' } });
  });
});
