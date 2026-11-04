// Context-group hints (`_meta.mint`, the mcp-host context-groups contract),
// read off the tool list this server SERVES — what a host sees — not off a
// hand-kept table of what the source meant to say.
//
// easyTable has no account and no listable set of subjects: every read needs a
// restaurant id plus (for bookings) the guest's mobile, and none takes a date
// range a host could fill. So nothing here answers a what's-new / what's-due /
// what's-on question on its own, and the surface ships lookup + write hints
// only. The canonical rules below are still asserted, so a future canonical
// read has to meet them.
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { registerBridgeHealthcheckTool } from '@chrischall/mcp-utils/fetchproxy';
import { registerAvailabilityTools } from '../src/tools/availability.js';
import { registerBookingTools } from '../src/tools/booking.js';
import { EasyTableClient, type Bridge } from '../src/client.js';
import { createTestHarness } from './helpers.js';

const noopBridge: Bridge = {
  async fetch() {
    return { status: 200, body: '', url: '' };
  },
  async readDom() {
    return {};
  },
};

type Mint = {
  domain?: string;
  intent?: string;
  canonical?: boolean;
  subject?: string;
  when?: { start: string; end: string };
  aliases?: string[];
};
type Listed = {
  name: string;
  inputSchema: { properties?: Record<string, { enum?: unknown[] }> };
  annotations?: { readOnlyHint?: boolean };
  _meta?: { mint?: Mint };
};

const DOMAINS = ['school', 'home', 'work', 'family', 'health', 'money', 'travel', 'food'];
const READ_INTENTS = ['whats-new', 'whats-due', 'whats-on', 'lookup'];
const WRITE_INTENTS = ['turn-on-off', 'send', 'change', 'other'];
const CANONICAL_INTENTS = ['whats-new', 'whats-due', 'whats-on'];
const KEYS = ['domain', 'intent', 'canonical', 'subject', 'when', 'aliases'];

/** The intent every tool declares — this table is the assertion. */
const EXPECTED_INTENT: Record<string, string> = {
  easytable_list_types: 'lookup',
  easytable_list_dates: 'lookup',
  easytable_list_times: 'lookup',
  easytable_find_bookings: 'lookup',
  easytable_create_booking: 'change',
  easytable_modify_booking: 'change',
  easytable_cancel_booking: 'change',
};

let harness: Awaited<ReturnType<typeof createTestHarness>>;
let tools: Listed[];

beforeAll(async () => {
  harness = await createTestHarness((server) => {
    registerAvailabilityTools(server, new EasyTableClient(noopBridge));
    registerBookingTools(server, new EasyTableClient(noopBridge));
    registerBridgeHealthcheckTool({
      server,
      prefix: 'easytable',
      probePath: '/robots.txt',
      hostLabel: 'book.easytable.com',
      transport: { runProbe: async () => ({}) as never, status: () => ({}) as never },
      probeFn: async () => '',
    });
  });
  tools = (await harness.client.listTools()).tools as Listed[];
});
afterAll(async () => {
  if (harness) await harness.close();
});

const hinted = () => tools.filter((t) => !t.name.endsWith('_healthcheck'));

describe('_meta.mint on every served tool', () => {
  it('enumerates every served tool, so a new one cannot skip the decision', () => {
    expect(hinted().map((t) => t.name).sort()).toEqual(Object.keys(EXPECTED_INTENT).sort());
    expect(tools.map((t) => t.name)).toContain('easytable_healthcheck');
  });

  it('gives every tool except the healthcheck domain food and its intent, in the contract’s shape', () => {
    for (const t of hinted()) {
      const m = t._meta?.mint;
      expect(m, t.name).toBeDefined();
      expect(Object.keys(m!).every((k) => KEYS.includes(k)), t.name).toBe(true);
      expect(DOMAINS).toContain(m!.domain);
      expect(m!.domain, t.name).toBe('food');
      expect(m!.intent, t.name).toBe(EXPECTED_INTENT[t.name]);
    }
  });

  it('uses a read intent on reads and a write intent on writes', () => {
    for (const t of hinted()) {
      const intent = t._meta!.mint!.intent!;
      if (t.annotations?.readOnlyHint === true) expect(READ_INTENTS, t.name).toContain(intent);
      else expect(WRITE_INTENTS, t.name).toContain(intent);
    }
  });

  it('keeps aliases to the words a person says: ≤ 8, lowercase, ≤ 40 chars, never a tool name', () => {
    for (const t of hinted()) {
      const aliases = t._meta!.mint!.aliases;
      if (!aliases) continue;
      expect(aliases.length, t.name).toBeGreaterThan(0);
      expect(aliases.length, t.name).toBeLessThanOrEqual(8);
      for (const a of aliases) {
        expect(a.length, `${t.name}: ${a}`).toBeLessThanOrEqual(40);
        expect(a, t.name).toBe(a.toLowerCase());
        expect(a, t.name).not.toMatch(/easytable_|_/);
      }
    }
  });

  it('names only arguments that exist in a declared subject or when', () => {
    for (const t of hinted()) {
      const m = t._meta!.mint!;
      const props = t.inputSchema.properties ?? {};
      if (m.subject) expect(props, t.name).toHaveProperty(m.subject);
      if (m.when) {
        expect(props, t.name).toHaveProperty(m.when.start);
        expect(props, t.name).toHaveProperty(m.when.end);
      }
    }
  });

  it('is canonical only on a read-only whats-new/due/on tool, at most one per intent', () => {
    const canonical = hinted().filter((t) => t._meta!.mint!.canonical !== undefined);
    for (const t of canonical) {
      expect(t._meta!.mint!.canonical, t.name).toBe(true);
      expect(t.annotations?.readOnlyHint, t.name).toBe(true);
      expect(CANONICAL_INTENTS, t.name).toContain(t._meta!.mint!.intent);
      expect(t.inputSchema.properties ?? {}, t.name).toHaveProperty('view');
      expect(t.inputSchema.properties!.view.enum, t.name).toContain('brief');
    }
    for (const intent of CANONICAL_INTENTS) {
      expect(canonical.filter((t) => t._meta!.mint!.intent === intent).length, intent).toBeLessThanOrEqual(1);
    }
  });

  it('declares no canonical read and no subject: nothing here is listable or answers a what’s-new/due/on ask', () => {
    for (const t of hinted()) {
      expect(t._meta!.mint!.canonical, t.name).toBeUndefined();
      expect(t._meta!.mint!.subject, t.name).toBeUndefined();
      expect(t._meta!.mint!.when, t.name).toBeUndefined();
    }
  });

  it('carries the everyday words for booking a table', () => {
    const create = tools.find((t) => t.name === 'easytable_create_booking')!;
    expect(create._meta!.mint!.aliases).toEqual(expect.arrayContaining(['book a table', 'reservation']));
    const cancel = tools.find((t) => t.name === 'easytable_cancel_booking')!;
    expect(cancel._meta!.mint!.aliases).toEqual(expect.arrayContaining(['cancel my reservation']));
  });
});
