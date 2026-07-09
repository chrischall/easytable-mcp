// Scaffold smoke test. The full tool-roster + server-boot tests arrive with the
// implementation PR; this just confirms the scaffold entry registers its tool.
import { describe, it, expect, afterAll } from 'vitest';
import { runMcp, textResult, toolAnnotations } from '@chrischall/mcp-utils';
import { createTestHarness } from '@chrischall/mcp-utils/test';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Keep runMcp imported so the scaffold's dependency surface is exercised.
void runMcp;

let harness: Awaited<ReturnType<typeof createTestHarness>>;
afterAll(async () => {
  if (harness) await harness.close();
});

describe('scaffold', () => {
  it('registers the info tool', async () => {
    harness = await createTestHarness((server: McpServer) => {
      server.registerTool(
        'easytable_info',
        { description: 'info', annotations: toolAnnotations({ readOnly: true }), inputSchema: {} },
        async () => textResult({ ok: true }),
      );
    });
    const names = (await harness.listTools()).map((t) => t.name);
    expect(names).toContain('easytable_info');
  });
});
