import { describe, it, expect } from 'vitest';
import { EasyTableClient, type Bridge, type BridgeResponse } from '../src/client.js';

interface Call {
  url: string;
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

function fakeBridge(opts: {
  responses?: Record<string, Partial<BridgeResponse>>;
  dom?: Record<string, string>;
  domThrows?: boolean;
}): { bridge: Bridge; calls: Call[]; domCalls: { names: string[] }[] } {
  const calls: Call[] = [];
  const domCalls: { names: string[] }[] = [];
  const bridge: Bridge = {
    async fetch(init) {
      calls.push({ url: init.url, method: init.method, body: init.body, headers: init.headers });
      // match a canned response by path substring
      for (const [needle, resp] of Object.entries(opts.responses ?? {})) {
        if (init.url.includes(needle)) {
          return { status: 200, body: '', url: init.url, ...resp };
        }
      }
      return { status: 200, body: '', url: init.url };
    },
    async readDom(o) {
      domCalls.push({ names: o.names });
      if (opts.domThrows) throw new Error('bridge down');
      return opts.dom ?? {};
    },
  };
  return { bridge, calls, domCalls };
}

describe('EasyTableClient reads', () => {
  it('lists types via the types fragment', async () => {
    const { bridge, calls } = fakeBridge({
      responses: {
        'types.asp': { body: '<a href="#step=qty&type=13991">Boka Inne</a>' },
      },
    });
    const types = await new EasyTableClient(bridge).listTypes('1fdfc', 'en');
    expect(types).toEqual([{ type: '13991', label: 'Boka Inne' }]);
    expect(calls[0].url).toContain('id=1fdfc');
    expect(calls[0].url).toContain('lang=en');
    expect(calls[0].headers?.['X-Requested-With']).toBe('XMLHttpRequest');
  });

  it('lists times and maps to HH:MM', async () => {
    const { bridge } = fakeBridge({
      responses: { 'times.asp': { body: '<span class="time" data-time="1035"></span>' } },
    });
    const times = await new EasyTableClient(bridge).listTimes('1fdfc', 'en', '13991', '2026-07-10', 2);
    expect(times[0]).toMatchObject({ time: '17:15', minuteOfDay: 1035 });
  });

  it('surfaces an actionable error on a 403', async () => {
    const { bridge } = fakeBridge({ responses: { 'calendar.asp': { status: 403 } } });
    await expect(
      new EasyTableClient(bridge).listDates('1fdfc', 'en', '13991', 2),
    ).rejects.toThrow(/403/);
  });
});

describe('EasyTableClient cancel (tokenless)', () => {
  it('GETs the cancel endpoint and parses the JSONP result', async () => {
    const { bridge, calls, domCalls } = fakeBridge({
      responses: { 'json_cancel_booking.asp': { body: 'cb([{"Status":1}])' } },
    });
    const res = await new EasyTableClient(bridge).cancelBooking({
      id: '1fdfc',
      mobile: '+46701234567',
      bookingId: 'BKG-1',
    });
    expect(res).toEqual({ Status: 1 });
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toContain('booking=BKG-1');
    // cancel must NOT read a Turnstile token
    expect(domCalls).toHaveLength(0);
  });
});

describe('EasyTableClient create (Turnstile-gated)', () => {
  const input = {
    id: '1fdfc',
    type: '13991',
    date: '2026-07-10',
    time: '17:15',
    persons: 2,
    name: 'Test Guest',
    mobile: '+46701234567',
    email: 'test@example.com',
  };

  it('harvests bookingToken/cancellationtime/lcid + token, then POSTs the full payload', async () => {
    const { bridge, calls, domCalls } = fakeBridge({
      dom: { turnstileToken: '0.TOKEN' },
      responses: {
        'confirm.asp': {
          body: '<script>var re=1; bookingToken = "{GUID-123}"; var x=2;</script><input type="hidden" id="cancellationtime" name="cancellationtime" value="180">',
        },
        'book/?id': { body: '<script>var lcid = "1053"; var lang="en";</script>' },
        'json_booking.asp': { body: 'cb([{"Status":1,"confirmUrl":"/ok"}])' },
      },
    });
    const res = await new EasyTableClient(bridge).createBooking(input);
    expect(domCalls[0].names).toEqual(['turnstileToken']);
    expect(res).toMatchObject({ Status: 1, confirmUrl: '/ok' });
    // confirm.asp was fetched with minute-of-day time
    const confirmCall = calls.find((c) => c.url.includes('confirm.asp'))!;
    expect(confirmCall.url).toContain('time=1035');
    const post = calls.find((c) => c.url.includes('json_booking.asp'))!;
    expect(post.method).toBe('POST');
    const sent = JSON.parse(post.body!);
    expect(sent).toMatchObject({
      place: '1fdfc',
      time: '1035',
      persons: '2',
      turnstileToken: '0.TOKEN',
      bookingToken: '{GUID-123}',
      cancellationtime: '180',
      lcid: '1053',
      websitePot: '',
      botScore: 0,
      tags: [],
      preorder: {},
    });
  });

  it('fails fast with guidance when no token is available', async () => {
    const { bridge, calls } = fakeBridge({ dom: {} });
    await expect(new EasyTableClient(bridge).createBooking(input)).rejects.toThrow(/Turnstile/i);
    // must not POST without a token
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });
});

describe('EasyTableClient modify (Turnstile-gated)', () => {
  it('reads the token and POSTs to the modify endpoint with the existing id', async () => {
    const { bridge, calls, domCalls } = fakeBridge({
      dom: { turnstileToken: '0.TK' },
      responses: {
        'confirm.asp': { body: 'bookingToken = "{G2}";<input id="cancellationtime" value="120">' },
        'book/?id': { body: 'lcid = "1053"' },
        'json_modify_booking.asp': { body: 'cb([{"Status":1}])' },
      },
    });
    const res = await new EasyTableClient(bridge).modifyBooking({
      id: '1fdfc',
      type: '13991',
      date: '2026-07-11',
      time: '19:00',
      persons: 3,
      name: 'Test Guest',
      mobile: '+46701234567',
      existing: 'BKG-42',
    });
    expect(res).toMatchObject({ Status: 1 });
    expect(domCalls[0].names).toEqual(['turnstileToken']);
    const post = calls.find((c) => c.url.includes('json_modify_booking.asp'))!;
    const sent = JSON.parse(post.body!);
    expect(sent).toMatchObject({
      existing: 'BKG-42',
      time: '1140',
      turnstileToken: '0.TK',
      bookingToken: '{G2}',
      cancellationtime: '120',
    });
  });
});
