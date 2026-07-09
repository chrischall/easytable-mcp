#!/usr/bin/env node
import { runMcp } from '@chrischall/mcp-utils';
import { registerBridgeHealthcheckTool } from '@chrischall/mcp-utils/fetchproxy';
import { VERSION } from './version.js';
import { createEasyTableBridge } from './bridge-fetchproxy.js';
import { EasyTableClient } from './client.js';
import { registerAvailabilityTools } from './tools/availability.js';
import { registerBookingTools } from './tools/booking.js';

// Build the bridge + client before boot. The bridge connects lazily on the
// first verb call, so the server still answers tools/list with no signed-in
// tab — the "open a book.easytable.com tab / approve the pair code" guidance
// surfaces on the first real request instead.
const bridge = createEasyTableBridge(VERSION);
const client = new EasyTableClient(bridge);
await bridge.start();

const banner =
  `[easytable-mcp] v${VERSION} — routes every request through your signed-in ` +
  'book.easytable.com tab via the @fetchproxy/server bridge, reusing that ' +
  'authenticated (Cloudflare-cleared) session. Install the fetchproxy extension ' +
  '(https://github.com/chrischall/fetchproxy) and open a booking-widget tab; the ' +
  'first request prints a one-time pair code to approve in the extension. ' +
  'This project was developed and is maintained by AI. Use at your own discretion.';

await runMcp({
  name: 'easytable-mcp',
  version: VERSION,
  banner,
  deps: client,
  tools: [
    registerAvailabilityTools,
    registerBookingTools,
    (server) =>
      registerBridgeHealthcheckTool({
        server,
        prefix: 'easytable',
        probePath: '/robots.txt',
        hostLabel: 'book.easytable.com',
        transport: bridge.transport,
        probeFn: (path) => bridge.fetch({ url: `https://book.easytable.com${path}`, method: 'GET' }).then((r) => r.body),
      }),
  ],
  shutdown: { onSignal: () => bridge.close() },
});
