// The .mcpb manifest's tool descriptions are what Claude Desktop shows the user,
// so they must use the extension's current user-facing name.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8')) as {
  tools: { name: string; description: string }[];
  server: { mcp_config: { env?: Record<string, string> } };
  user_config?: Record<string, { required?: boolean }>;
};
const serverJson = JSON.parse(readFileSync(join(ROOT, 'server.json'), 'utf8')) as {
  packages: { environmentVariables?: { name: string; isRequired?: boolean }[] }[];
};

// The env keys the built server honours: EASYTABLE_WS_PORT (ours) plus the two
// fetchproxy hosting knobs. FETCHPROXY_WS_PORT is inert (we always pass a port)
// and ws's WS_NO_* are defined away in the bundle script.
const HONOURED_ENV = ['EASYTABLE_WS_PORT', 'FETCHPROXY_IDENTITY_DIR', 'FETCHPROXY_WS_HOST'];

describe('manifest.json', () => {
  it('lists exactly the served tools', () => {
    expect(manifest.tools.map((t) => t.name).sort()).toEqual([
      'easytable_cancel_booking',
      'easytable_create_booking',
      'easytable_find_bookings',
      'easytable_healthcheck',
      'easytable_list_dates',
      'easytable_list_times',
      'easytable_list_types',
      'easytable_modify_booking',
    ]);
  });

  it('describes the healthcheck in terms of the ContextMint Bridge', () => {
    const tool = manifest.tools.find((t) => t.name === 'easytable_healthcheck');
    expect(tool?.description).toMatch(/ContextMint Bridge/);
  });

  it('no tool description uses the old "fetchproxy bridge" name', () => {
    for (const t of manifest.tools) expect(t.description).not.toMatch(/fetchproxy bridge/i);
  });

  it('declares every honoured env key, all optional', () => {
    const env = manifest.server.mcp_config.env ?? {};
    expect(Object.keys(env).sort()).toEqual(HONOURED_ENV);
    for (const value of Object.values(env)) {
      const key = /\$\{user_config\.([^}]+)\}/.exec(value)?.[1];
      expect(key, value).toBeDefined();
      expect(manifest.user_config?.[key!]?.required, key).toBe(false);
    }
  });
});

describe('server.json', () => {
  it('declares every honoured env key, all optional', () => {
    const vars = serverJson.packages.flatMap((p) => p.environmentVariables ?? []);
    expect(vars.map((v) => v.name).sort()).toEqual(HONOURED_ENV);
    for (const v of vars) expect(v.isRequired, v.name).toBe(false);
  });
});
