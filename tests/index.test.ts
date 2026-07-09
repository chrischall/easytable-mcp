// Smoke test for the full tool surface. Verifies every easytable_* tool is
// registered and visible over the MCP wire — catches "forgot to wire it up"
// mistakes the per-tool tests miss.
import { describe, it, expect, afterAll } from 'vitest';
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
const client = new EasyTableClient(noopBridge);

const EXPECTED_TOOLS = [
  'easytable_list_types',
  'easytable_list_dates',
  'easytable_list_times',
  'easytable_find_bookings',
  'easytable_create_booking',
  'easytable_modify_booking',
  'easytable_cancel_booking',
  'easytable_healthcheck',
];

let harness: Awaited<ReturnType<typeof createTestHarness>>;
afterAll(async () => {
  if (harness) await harness.close();
});

describe('tool registration', () => {
  it('registers every advertised easytable_* tool', async () => {
    harness = await createTestHarness((server) => {
      registerAvailabilityTools(server, client);
      registerBookingTools(server, client);
      registerBridgeHealthcheckTool({
        server,
        prefix: 'easytable',
        probePath: '/robots.txt',
        hostLabel: 'book.easytable.com',
        transport: {
          runProbe: async () => ({}) as never,
          status: () => ({}) as never,
        },
        probeFn: async () => '',
      });
    });
    const tools = await harness.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...EXPECTED_TOOLS].sort());
  });
});
