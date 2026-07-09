/**
 * fetchproxy transport for easyTable. Every request rides the user's own
 * signed-in `book.easytable.com` tab via the bridge — the site Cloudflare-
 * 403s any server-side request. There's no login; the Turnstile clearance
 * lives in the browser tab, so the bridge is the only way in.
 *
 * The `read_dom` capability (declared below) lets create/modify read the
 * Cloudflare Turnstile token from the widget's hidden `cf-turnstile-response`
 * input so the booking POST can carry it. It's an isolated-world DOM read —
 * no page-JS execution — and the exact selector is surfaced to the user at
 * pair time.
 */
import { createFetchproxyTransport, type FetchproxyTransport } from '@chrischall/mcp-utils/fetchproxy';
import { readPortEnv } from '@chrischall/mcp-utils';
import type { Bridge, BridgeResponse } from './client.js';
import { TURNSTILE_SELECTOR_NAME } from './client.js';

const DEFAULT_PORT = 37_149;

export interface EasyTableBridge extends Bridge {
  start(): Promise<void>;
  close(): Promise<void>;
  status(): ReturnType<FetchproxyTransport['status']>;
  /** Underlying transport, for the healthcheck tool. */
  readonly transport: FetchproxyTransport;
}

export function createEasyTableBridge(version: string): EasyTableBridge {
  const port = readPortEnv('EASYTABLE_WS_PORT', DEFAULT_PORT);
  const transport = createFetchproxyTransport<FetchproxyTransport>({
    port,
    serverName: 'easytable-mcp',
    version,
    // Subdomains of easytable.com (book.*) match automatically.
    domains: ['easytable.com'],
    // The booking widget lives on book.easytable.com; absolute URLs
    // self-describe their host and ignore this.
    defaultSubdomain: 'book',
    logListening: true,
    debugEnvVar: 'EASYTABLE_DEBUG',
    capabilities: ['fetch', 'read_dom'],
    // Declared DOM read: the Cloudflare Turnstile token the page writes into
    // its hidden response input. Surfaced verbatim in the pair popup.
    domSelectors: [
      { name: TURNSTILE_SELECTOR_NAME, selector: 'input[name="cf-turnstile-response"]' },
    ],
  });

  return {
    transport,
    start: () => transport.start(),
    close: () => transport.close(),
    status: () => transport.status(),
    async fetch(init): Promise<BridgeResponse> {
      // The client builds absolute book.easytable.com URLs; pass them straight
      // through as `path` (absolute paths self-describe their host).
      return transport.fetch({
        path: init.url,
        method: (init.method as 'GET' | 'POST' | 'PUT' | 'DELETE') ?? 'GET',
        ...(init.headers ? { headers: init.headers } : {}),
        ...(init.body !== undefined ? { body: init.body } : {}),
      });
    },
    readDom(opts) {
      return transport.server.readDom({
        ...(opts.subdomain ? { subdomain: opts.subdomain } : {}),
        names: opts.names,
      });
    },
  };
}
