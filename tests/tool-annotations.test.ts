// Fleet annotation meta-test (modelled on skylight-mcp's): reads the
// annotations each tool PUBLISHES over the MCP wire, not a hand-kept list.
//
// `destructiveHint` defaults to TRUE whenever readOnlyHint is false, so a write
// that forgets to declare it publishes as destructive and nothing fails — a
// considered `false` and a forgotten one look identical. Pin that each write
// CHOOSES, that no read claims to be destructive, and that every tool says
// whether it reaches the network (all of these do: they ride the bridge to
// book.easytable.com).
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

interface Ann {
  readOnlyHint?: unknown;
  destructiveHint?: unknown;
  openWorldHint?: unknown;
}

let harness: Awaited<ReturnType<typeof createTestHarness>>;
let ann: Record<string, Ann | undefined>;

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
  const { tools } = await harness.client.listTools();
  ann = Object.fromEntries(tools.map((t) => [t.name, t.annotations as Ann | undefined]));
});
afterAll(async () => {
  if (harness) await harness.close();
});

describe('every tool is annotated truthfully', () => {
  it('covers the full surface (a meta-test that silently shrinks is worse than none)', () => {
    expect(Object.keys(ann)).toHaveLength(8);
  });

  it('sets an explicit boolean readOnlyHint on every tool', () => {
    const missing = Object.entries(ann).filter(([, a]) => typeof a?.readOnlyHint !== 'boolean').map(([n]) => n);
    expect(missing).toEqual([]);
  });

  it('sets an explicit boolean destructiveHint on every write', () => {
    const undeclared = Object.entries(ann)
      .filter(([, a]) => a?.readOnlyHint === false && typeof a?.destructiveHint !== 'boolean')
      .map(([n]) => n);
    expect(undeclared).toEqual([]);
  });

  it('never lets a read claim to be destructive', () => {
    const contradictory = Object.entries(ann)
      .filter(([, a]) => a?.readOnlyHint === true && a?.destructiveHint === true)
      .map(([n]) => n);
    expect(contradictory).toEqual([]);
  });

  it('marks every tool openWorld (each one reaches book.easytable.com via the bridge)', () => {
    const notOpen = Object.entries(ann).filter(([, a]) => a?.openWorldHint !== true).map(([n]) => n);
    expect(notOpen).toEqual([]);
  });

  it('keeps the three booking writes destructive (each reaches the restaurant)', () => {
    // create/modify/cancel all land on a real restaurant's books; cancel is not
    // an inverse of create because the restaurant has already seen the booking.
    const destructive = Object.entries(ann)
      .filter(([, a]) => a?.readOnlyHint === false && a?.destructiveHint === true)
      .map(([n]) => n)
      .sort();
    expect(destructive).toEqual([
      'easytable_cancel_booking',
      'easytable_create_booking',
      'easytable_modify_booking',
    ]);
  });
});
