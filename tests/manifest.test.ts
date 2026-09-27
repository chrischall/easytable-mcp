// The .mcpb manifest's tool descriptions are what Claude Desktop shows the user,
// so they must use the extension's current user-facing name.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8')) as {
  tools: { name: string; description: string }[];
};

describe('manifest.json', () => {
  it('describes the healthcheck in terms of the ContextMint Bridge', () => {
    const tool = manifest.tools.find((t) => t.name === 'easytable_healthcheck');
    expect(tool?.description).toMatch(/ContextMint Bridge/);
  });

  it('no tool description uses the old "fetchproxy bridge" name', () => {
    for (const t of manifest.tools) expect(t.description).not.toMatch(/fetchproxy bridge/i);
  });
});
