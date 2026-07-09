#!/usr/bin/env node
import { runMcp, textResult, toolAnnotations } from '@chrischall/mcp-utils';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VERSION } from './version.js';

// Scaffold entry point. The tool surface (availability + booking, over the
// fetchproxy browser bridge) lands in the follow-up implementation PR. This
// keeps `main` buildable + green on published deps while the `read_dom`
// capability it depends on works its way through the release train.
function registerInfoTool(server: McpServer): void {
  server.registerTool(
    'easytable_info',
    {
      description:
        'Describe this MCP: easyTable restaurant reservations via the fetchproxy browser bridge. Full tool surface is being wired up.',
      annotations: toolAnnotations({ readOnly: true }),
      inputSchema: {},
    },
    async () =>
      textResult({
        name: 'easytable-mcp',
        version: VERSION,
        status: 'scaffold — availability + booking tools land in the implementation PR',
      }),
  );
}

await runMcp({
  name: 'easytable-mcp',
  version: VERSION,
  banner:
    `[easytable-mcp] v${VERSION} — routes every request through your signed-in ` +
    'book.easytable.com tab via the @fetchproxy/server bridge. This project was ' +
    'developed and is maintained by AI. Use at your own discretion.',
  deps: {},
  tools: [registerInfoTool],
});
