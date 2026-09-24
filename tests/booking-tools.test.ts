// Tool-level behaviour of the booking writes.
//  - fleet-audit#85: three outcomes (ok / rejected / unknown), raw body kept.
//  - fleet-audit#86: modify warns about fields it will blank.
//  - the confirm gate: a prompt where the client supports one, otherwise a
//    two-phase preview + confirmToken flow (MCP_CONFIRM_MODE).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TestHarnessOptions } from '@chrischall/mcp-utils/test';
import { registerBookingTools } from '../src/tools/booking.js';
import { EasyTableClient, type Bridge } from '../src/client.js';
import { createTestHarness, parseToolResult } from './helpers.js';

/** A bridge that answers every write with `writeBody` and counts what it was asked to do. */
function bridgeAnswering(writeBody: string) {
  const seen = { fetches: 0, writes: 0, domReads: 0 };
  const bridge: Bridge = {
    async fetch(init) {
      seen.fetches += 1;
      if (init.url.includes('/user/ajax/json_')) {
        seen.writes += 1;
        return { status: 200, body: writeBody, url: init.url };
      }
      return { status: 200, body: '', url: init.url };
    },
    async readDom() {
      seen.domReads += 1;
      return { turnstileToken: '0.TK' };
    },
  };
  return { bridge, seen };
}

const ENV_KEYS = ['MCP_CONFIRM_MODE', 'MCP_CONFIRM_TTL_SECONDS', 'MCP_CONFIRM_SECRET'] as const;
let savedEnv: Record<string, string | undefined>;
let harness: Awaited<ReturnType<typeof createTestHarness>> | undefined;
beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(async () => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  await harness?.close();
  harness = undefined;
});

async function open(bridge: Bridge, options?: TestHarnessOptions) {
  harness = await createTestHarness((server) => registerBookingTools(server, new EasyTableClient(bridge)), options);
  return harness;
}

type PhaseOne = {
  status: string;
  confirmToken: string;
  action: string;
  preview: Record<string, unknown>;
};

/** Phase 1, then phase 2 with the returned token — the confirmed write on a client that cannot be prompted. */
async function confirmedCall(bridge: Bridge, name: string, args: Record<string, unknown>) {
  const h = await open(bridge);
  const phaseOne = parseToolResult<PhaseOne>(await h.callTool(name, args));
  expect(phaseOne.status).toBe('confirmation-required');
  return parseToolResult<Record<string, unknown>>(await h.callTool(name, { ...args, confirmToken: phaseOne.confirmToken }));
}

const text = (r: { content?: unknown }) => (r.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

const createArgs = {
  id: '1fdfc', type: '13991', date: '2026-07-10', time: '17:15', persons: 2,
  name: 'Test Guest', mobile: '+46701234567',
};
const modifyArgs = { ...createArgs, existing: 'B1', email: 'a@b.se', comment: '', company: '' };
const cancelArgs = { id: '1fdfc', mobile: '+46701234567', bookingId: 'B1' };

describe('write outcomes (fleet-audit#85)', () => {
  it('Status 1 is ok', async () => {
    const { bridge } = bridgeAnswering('cb([{"Status":1,"confirmUrl":"/ok"}])');
    const out = await confirmedCall(bridge, 'easytable_create_booking', createArgs);
    expect(out).toMatchObject({ ok: true, outcome: 'ok', status: 1, confirmUrl: '/ok' });
  });

  it('Status 0 is rejected, with the error markup kept', async () => {
    const { bridge } = bridgeAnswering('cb([{"Status":0,"errHtml":"<p>Full</p>"}])');
    const out = await confirmedCall(bridge, 'easytable_create_booking', createArgs);
    expect(out).toMatchObject({ ok: false, outcome: 'rejected', status: 0 });
    expect(JSON.stringify(out.raw)).toContain('Full');
  });

  it('a non-JSON body is unknown, keeps the body text, and says to reconcile first', async () => {
    const { bridge } = bridgeAnswering('OK');
    const out = await confirmedCall(bridge, 'easytable_create_booking', createArgs);
    expect(out).toMatchObject({ ok: false, outcome: 'unknown', raw: 'OK' });
    expect(String(out.message)).toMatch(/easytable_find_bookings/);
    expect(String(out.message)).toMatch(/before retrying/i);
  });

  it('an object without a Status is unknown too', async () => {
    const { bridge } = bridgeAnswering('{"message":"done"}');
    const out = await confirmedCall(bridge, 'easytable_modify_booking', { ...modifyArgs, email: '' });
    expect(out).toMatchObject({ ok: false, outcome: 'unknown', raw: { message: 'done' } });
  });
});

describe('modify never silently blanks fields (fleet-audit#86)', () => {
  it('requires email, comment and company so the caller carries them over', async () => {
    const h = await open(bridgeAnswering('cb([{"Status":1}])').bridge);
    const { tools } = await h.client.listTools();
    const modify = tools.find((t) => t.name === 'easytable_modify_booking')!;
    expect(modify.inputSchema.required).toEqual(expect.arrayContaining(['email', 'comment', 'company']));
    expect(modify.description).toMatch(/replaces the whole booking/i);
    // create keeps them optional
    const create = tools.find((t) => t.name === 'easytable_create_booking')!;
    expect(create.inputSchema.required).not.toContain('email');
  });

  it('rejects a modify that leaves them out', async () => {
    const h = await open(bridgeAnswering('cb([{"Status":1}])').bridge);
    const { email: _e, comment: _c, company: _co, ...withoutCarried } = modifyArgs;
    const res = await h.client.callTool({ name: 'easytable_modify_booking', arguments: withoutCarried });
    expect(res.isError).toBe(true);
  });

  it('accepts empty strings and names the fields that will be cleared in the preview', async () => {
    const { bridge, seen } = bridgeAnswering('');
    const h = await open(bridge);
    const out = parseToolResult<PhaseOne>(await h.callTool('easytable_modify_booking', modifyArgs));
    expect(out.status).toBe('confirmation-required');
    expect(out.preview.clears).toEqual(['comment', 'company']);
    expect(String(out.preview.note)).toMatch(/cleared/i);
    expect(seen.fetches).toBe(0);
  });

  it('says nothing about clearing when every carried-over field is kept', async () => {
    const h = await open(bridgeAnswering('').bridge);
    const out = parseToolResult<PhaseOne>(
      await h.callTool('easytable_modify_booking', { ...modifyArgs, comment: 'Window seat', company: 'Acme' }),
    );
    expect(out.preview.clears).toEqual([]);
    expect(String(out.preview.note)).not.toMatch(/cleared/i);
  });

  it('reports the cleared fields on the confirmed write too', async () => {
    const { bridge } = bridgeAnswering('cb([{"Status":1}])');
    const out = await confirmedCall(bridge, 'easytable_modify_booking', modifyArgs);
    expect(out).toMatchObject({ action: 'modify_booking', ok: true, clears: ['comment', 'company'] });
  });
});

describe('confirm gate — every write tool', () => {
  const cases = [
    {
      name: 'easytable_create_booking',
      args: createArgs,
      action: 'create_booking',
      preview: { action: 'create_booking', preview: createArgs },
    },
    {
      name: 'easytable_modify_booking',
      args: modifyArgs,
      action: 'modify_booking',
      preview: { action: 'modify_booking', preview: modifyArgs, clears: ['comment', 'company'] },
    },
    {
      name: 'easytable_cancel_booking',
      args: cancelArgs,
      action: 'cancel_booking',
      preview: { action: 'cancel_booking', id: '1fdfc', bookingId: 'B1', mobile: '+46701234567' },
    },
  ] as const;

  for (const c of cases) {
    it(`${c.name}: phase 1 returns the preview and a token, and touches nothing`, async () => {
      const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
      const h = await open(bridge);
      const res = await h.callTool(c.name, c.args);
      const out = parseToolResult<PhaseOne>(res);
      expect(out.status).toBe('confirmation-required');
      expect(out.confirmToken).toEqual(expect.any(String));
      expect(out.preview).toMatchObject(c.preview);
      expect(String(out.preview.note)).toMatch(/confirmToken/);
      expect(seen).toEqual({ fetches: 0, writes: 0, domReads: 0 });
    });

    it(`${c.name}: phase 2 with the token writes exactly once`, async () => {
      const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
      const out = await confirmedCall(bridge, c.name, c.args);
      expect(out).toMatchObject({ action: c.action, ok: true, outcome: 'ok' });
      expect(seen.writes).toBe(1);
    });
  }

  it('no write tool still takes a confirm parameter; each takes confirmToken', async () => {
    const h = await open(bridgeAnswering('').bridge);
    const { tools } = await h.client.listTools();
    expect(tools).toHaveLength(3);
    for (const t of tools) {
      const props = (t.inputSchema as { properties?: Record<string, unknown> }).properties ?? {};
      expect(props).not.toHaveProperty('confirm');
      expect(props).toHaveProperty('confirmToken');
      expect(t.description).toMatch(/confirmToken/);
      expect(t.description).not.toMatch(/confirm: true/);
    }
  });
});

describe('confirm gate — token and mode rules', () => {
  it('replaying a used token is refused as TOKEN_REUSED with no second write', async () => {
    const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
    const h = await open(bridge);
    const { confirmToken } = parseToolResult<PhaseOne>(await h.callTool('easytable_cancel_booking', cancelArgs));
    await h.callTool('easytable_cancel_booking', { ...cancelArgs, confirmToken });
    const replay = await h.callTool('easytable_cancel_booking', { ...cancelArgs, confirmToken });
    expect(replay.isError).toBe(true);
    expect(text(replay)).toContain('TOKEN_REUSED');
    expect(seen.writes).toBe(1);
  });

  it('changing an argument between the phases is refused as DRAFT_CHANGED with no write', async () => {
    const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
    const h = await open(bridge);
    const { confirmToken } = parseToolResult<PhaseOne>(await h.callTool('easytable_create_booking', createArgs));
    const changed = await h.callTool('easytable_create_booking', { ...createArgs, persons: 6, confirmToken });
    expect(changed.isError).toBe(true);
    expect(text(changed)).toContain('DRAFT_CHANGED');
    expect(seen.fetches).toBe(0);
  });

  it('a token from one tool is not accepted by another', async () => {
    const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
    const h = await open(bridge);
    const { confirmToken } = parseToolResult<PhaseOne>(await h.callTool('easytable_create_booking', createArgs));
    const crossed = await h.callTool('easytable_cancel_booking', { ...cancelArgs, confirmToken });
    expect(crossed.isError).toBe(true);
    expect(text(crossed)).toContain('TOKEN_INVALID');
    expect(seen.fetches).toBe(0);
  });

  it('a client that accepts the elicitation prompt gets the write', async () => {
    const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
    const h = await open(bridge, { elicitation: async () => ({ action: 'accept', content: { confirmed: true } }) });
    const out = parseToolResult<Record<string, unknown>>(await h.callTool('easytable_cancel_booking', cancelArgs));
    expect(out).toMatchObject({ action: 'cancel_booking', ok: true });
    expect(seen.writes).toBe(1);
  });

  it('a client that declines the elicitation prompt gets no write', async () => {
    const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
    const h = await open(bridge, { elicitation: async () => ({ action: 'decline' }) });
    await h.callTool('easytable_create_booking', createArgs);
    expect(seen.fetches).toBe(0);
  });

  it('MCP_CONFIRM_MODE=refuse refuses on a client that cannot be prompted', async () => {
    process.env.MCP_CONFIRM_MODE = 'refuse';
    const { bridge, seen } = bridgeAnswering('cb([{"Status":1}])');
    const h = await open(bridge);
    const res = await h.callTool('easytable_modify_booking', modifyArgs);
    expect(parseToolResult<{ reason: string }>(res).reason).toBe('confirmation-unsupported');
    expect(seen.fetches).toBe(0);
  });
});
