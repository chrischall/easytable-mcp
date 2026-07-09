/**
 * easyTable client. Every request rides the user's own signed-in
 * `book.easytable.com` browser tab via the fetchproxy bridge — the site
 * Cloudflare-403s any server-side request, so there's nothing to fetch
 * directly. There's no login: the restaurant is identified by its `id`.
 *
 * The client depends only on the small {@link Bridge} surface below, so it
 * unit-tests against a fake and stays decoupled from the concrete
 * `@fetchproxy/server` transport wired up in index.ts.
 */
import { McpToolError } from '@chrischall/mcp-utils';
import {
  parseTypes,
  parseCalendar,
  parseTimes,
  parseCancelSearch,
  parseConfirmConfig,
  parseLcid,
  type BookingType,
  type BookingDate,
  type BookingTime,
  type FoundBooking,
  type BookingConfig,
} from './parse.js';
import { parseJsonp, firstBookingResult, type BookingResult } from './jsonp.js';
import {
  buildCreatePayload,
  buildModifyPayload,
  type CreateBookingInput,
  type ModifyBookingInput,
} from './payload.js';
import { hhmmToMinuteOfDay } from './time.js';

/** Response of a bridge `fetch`. */
export interface BridgeResponse {
  status: number;
  body: string;
  url: string;
}

/**
 * The subset of the fetchproxy transport the client uses. `readDom` is the
 * 1.4.0+ verb that reads the Cloudflare Turnstile token from the widget's
 * hidden input so create/modify can carry it.
 */
export interface Bridge {
  fetch(init: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }): Promise<BridgeResponse>;
  readDom(opts: { subdomain?: string; names: string[] }): Promise<Record<string, string>>;
}

/** The Turnstile token lives in this hidden input on the widget page. */
export const TURNSTILE_SELECTOR_NAME = 'turnstileToken';

const BOOK_HOST = 'book.easytable.com';

export class EasyTableClient {
  constructor(private readonly bridge: Bridge) {}

  // --- availability reads (HTML fragments) -------------------------------

  async listTypes(id: string, lang: string): Promise<BookingType[]> {
    const html = await this.getFragment('/book/ajax/types.asp', { id, lang });
    return parseTypes(html);
  }

  async listDates(
    id: string,
    lang: string,
    type: string,
    qty: number,
  ): Promise<BookingDate[]> {
    const html = await this.getFragment('/book/ajax/calendar.asp', {
      id,
      lang,
      type,
      qty: String(qty),
    });
    return parseCalendar(html);
  }

  async listTimes(
    id: string,
    lang: string,
    type: string,
    date: string,
    qty: number,
  ): Promise<BookingTime[]> {
    const html = await this.getFragment('/book/ajax/times.asp', {
      id,
      lang,
      type,
      date,
      qty: String(qty),
    });
    return parseTimes(html);
  }

  async findBookings(id: string, lang: string, mobile: string): Promise<FoundBooking[]> {
    const html = await this.getFragment('/book/ajax/cancel-search.asp', { id, lang, mobile });
    return parseCancelSearch(html);
  }

  // --- writes ------------------------------------------------------------

  /**
   * Cancel a booking. Tokenless GET (no Turnstile). Returns the parsed
   * write result. The caller has already resolved `bookingId` + `mobile`
   * from {@link findBookings}.
   */
  async cancelBooking(args: {
    id: string;
    mobile: string;
    bookingId: string;
  }): Promise<BookingResult | null> {
    const body = await this.getRaw('/user/ajax/json_cancel_booking.asp', {
      place: args.id,
      mobile: args.mobile,
      booking: args.bookingId,
    });
    return firstBookingResult(parseJsonp(body));
  }

  /**
   * Create a booking. The server needs, beyond the guest details, four
   * page-derived values: the Turnstile token (read from the widget's hidden
   * input via the bridge) plus `bookingToken`/`cancellationtime` (from the
   * `confirm.asp` fragment) and `lcid` (from the page HTML). It rejects a
   * booking that's missing any of them, so we harvest them first.
   */
  async createBooking(input: CreateBookingInput): Promise<BookingResult | null> {
    const [config, token] = await Promise.all([
      this.harvestBookingConfig(input),
      this.readTurnstileToken(),
    ]);
    const payload = buildCreatePayload(mergeConfig(input, config), token);
    const body = await this.postJson('/user/ajax/json_booking.asp', payload);
    return firstBookingResult(parseJsonp(body));
  }

  /** Modify an existing booking. Same harvesting + Turnstile requirement as create. */
  async modifyBooking(input: ModifyBookingInput): Promise<BookingResult | null> {
    const [config, token] = await Promise.all([
      this.harvestBookingConfig(input),
      this.readTurnstileToken(),
    ]);
    const payload = buildModifyPayload(mergeConfig(input, config), token);
    const body = await this.postJson('/user/ajax/json_modify_booking.asp', payload);
    return firstBookingResult(parseJsonp(body));
  }

  /**
   * Harvest the three server-delivered values a booking POST needs:
   * `bookingToken` + `cancellationtime` from the `confirm.asp` fragment, and
   * `lcid` from the widget page. Caller-supplied values on `input` win over
   * harvested ones. Reuses the same signed-in tab as every other request.
   */
  private async harvestBookingConfig(input: CreateBookingInput): Promise<BookingConfig> {
    const lang = input.lang ?? 'en';
    const [confirmHtml, pageHtml] = await Promise.all([
      this.getFragment('/book/ajax/confirm.asp', {
        id: input.id,
        lang,
        type: input.type,
        date: input.date,
        // confirm.asp expects minute-of-day, like the other availability calls.
        time: String(hhmmToMinuteOfDay(input.time)),
        qty: String(input.persons),
      }),
      this.getRaw('/book/', { id: input.id, lang }),
    ]);
    const config = parseConfirmConfig(confirmHtml);
    const lcid = parseLcid(pageHtml);
    if (lcid) config.lcid = lcid;
    return config;
  }

  // --- internals ---------------------------------------------------------

  private async readTurnstileToken(): Promise<string> {
    const values = await this.bridge.readDom({
      subdomain: 'book',
      names: [TURNSTILE_SELECTOR_NAME],
    });
    const token = values[TURNSTILE_SELECTOR_NAME];
    if (!token) {
      throw new McpToolError(
        'Could not read a Cloudflare Turnstile token from the booking widget.',
        {
          hint: `Open https://${BOOK_HOST}/book/?id=<restaurantId> in your signed-in Chrome tab and let it finish loading (the Turnstile check solves itself), then retry. The token is single-use and expires after a few minutes.`,
        },
      );
    }
    return token;
  }

  private async getFragment(path: string, params: Record<string, string>): Promise<string> {
    const res = await this.bridge.fetch({
      url: this.buildUrl(path, params),
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    this.assertOk(res, path);
    return res.body;
  }

  private async getRaw(path: string, params: Record<string, string>): Promise<string> {
    const res = await this.bridge.fetch({ url: this.buildUrl(path, params), method: 'GET' });
    this.assertOk(res, path);
    return res.body;
  }

  private async postJson(path: string, payload: unknown): Promise<string> {
    // The widget POSTs the stringified dataObj with a form content-type (it
    // uses jQuery `dataType: 'jsonp'`, but the body is still the JSON string).
    const res = await this.bridge.fetch({
      url: this.buildUrl(path, {}),
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: JSON.stringify(payload),
    });
    this.assertOk(res, path);
    return res.body;
  }

  private buildUrl(path: string, params: Record<string, string>): string {
    const url = new URL(`https://${BOOK_HOST}${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  }

  private assertOk(res: BridgeResponse, path: string): void {
    if (res.status >= 200 && res.status < 300) return;
    throw new McpToolError(`easyTable request to ${path} failed (HTTP ${res.status}).`, {
      hint: `Make sure a signed-in ${BOOK_HOST} tab is open in Chrome and the fetchproxy bridge is paired. A 403 usually means the tab needs a reload to clear the Cloudflare check.`,
    });
  }
}

/**
 * Merge harvested `bookingToken`/`cancellationtime`/`lcid` into the booking
 * input. A caller-supplied value wins; otherwise the harvested one fills in.
 * (A plain spread would let an `undefined` caller field clobber a harvested
 * value, so merge these three explicitly.)
 */
function mergeConfig<T extends CreateBookingInput>(input: T, config: BookingConfig): T {
  return {
    ...input,
    bookingToken: input.bookingToken ?? config.bookingToken,
    cancellationtime: input.cancellationtime ?? config.cancellationtime,
    lcid: input.lcid ?? config.lcid,
  };
}
