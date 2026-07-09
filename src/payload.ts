/**
 * Builders for the create / modify booking payloads. easyTable's
 * `/user/ajax/json_booking.asp` (and `json_modify_booking.asp`) take the
 * widget's `dataObj`, JSON-stringified, as a POST body.
 *
 * The field set + types below were captured from a real successful booking
 * (see docs/EASYTABLE-API.md): the ASP endpoint 500s on a partial payload,
 * so we send the full shape — `time`/`persons` as STRINGS, empty strings for
 * unused text fields, empty arrays/object for the collection fields.
 *
 * Three values are page-derived, not caller-supplied:
 *   - `turnstileToken` — read from the widget's hidden input via the bridge.
 *   - `lcid` — the numeric locale id; parseable from the widget page HTML.
 *   - `bookingToken` — a per-session anti-bot token botguard.js sets as a JS
 *     global (`window.bookingToken`). NOT in the DOM/HTML, so `read_dom`
 *     can't harvest it; whether the server *requires* it on create is still
 *     unconfirmed (see docs). Supplied here as an optional field so a caller
 *     that can obtain it may pass it; defaults to `''`.
 * `websitePot` is a honeypot the widget leaves empty. `botScore` is BotGuard's
 * score, which never loads on the fetched page, so it defaults to 0.
 */
import { hhmmToMinuteOfDay } from './time.js';

export interface CreateBookingInput {
  /** Restaurant id (`place`). */
  id: string;
  /** Booking area/type id from `list_types`. */
  type: string;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM` slot from `list_times`. */
  time: string;
  /** Party size. */
  persons: number;
  /** Guest name. */
  name: string;
  /** Guest mobile in E.164 (e.g. `+46701234567`). */
  mobile: string;
  /** Guest email. */
  email?: string;
  /** Free-text comment / special requests. */
  comment?: string;
  /** Optional company name. */
  company?: string;
  /** Widget language code (`se`, `en`, …). Defaults to `en`. */
  lang?: string;
  /** Optional event id. */
  event?: string;
  /** Numeric locale id (`lcid`), harvested from the widget page. Default `''`. */
  lcid?: string;
  /** Cancellation window in minutes, per the restaurant's config. Default `''`. */
  cancellationtime?: string;
  /** Per-session anti-bot token (`window.bookingToken`). Default `''`. */
  bookingToken?: string;
  /** Newsletter opt-in flag (0/1). Default 0. */
  newsletter?: number;
}

/** The full widget dataObj shape the server accepts (captured from a live booking). */
export interface BookingPayload {
  place: string;
  type: string;
  date: string;
  persons: string;
  time: string;
  name: string;
  mobile: string;
  email: string;
  room: string;
  company: string;
  address: string;
  zip: string;
  city: string;
  country: string;
  comment: string;
  newsletter: number;
  newsletterrelated: number;
  lcid: string;
  lang: string;
  ref: string;
  cancellationtime: string;
  promocode: string;
  groupRequestTerms: number;
  preorder: Record<string, never>;
  tags: unknown[];
  amounttags: unknown[];
  customFields: unknown[];
  bookingInfo: unknown[];
  bookingToken: string;
  botScore: number;
  websitePot: '';
  turnstileToken: string;
  /** Optional event id — omitted when empty (the widget omits undefined). */
  event?: string;
  /** Present only on modify — the id of the booking being changed. */
  existing?: string;
}

/**
 * Build the create-booking payload. `turnstileToken` is supplied
 * separately because it's obtained at call time from the live widget.
 */
export function buildCreatePayload(
  input: CreateBookingInput,
  turnstileToken: string,
): BookingPayload {
  const payload: BookingPayload = {
    place: input.id,
    type: input.type,
    date: input.date,
    persons: String(input.persons),
    time: String(hhmmToMinuteOfDay(input.time)),
    name: input.name,
    mobile: input.mobile,
    email: input.email ?? '',
    room: '',
    company: input.company ?? '',
    address: '',
    zip: '',
    city: '',
    country: '',
    comment: input.comment ?? '',
    newsletter: input.newsletter ?? 0,
    newsletterrelated: 0,
    lcid: input.lcid ?? '',
    lang: input.lang ?? 'en',
    ref: '',
    cancellationtime: input.cancellationtime ?? '',
    promocode: '',
    groupRequestTerms: 0,
    preorder: {},
    tags: [],
    amounttags: [],
    customFields: [],
    bookingInfo: [],
    bookingToken: input.bookingToken ?? '',
    botScore: 0,
    websitePot: '',
    turnstileToken,
  };
  // The widget omits `event` when undefined; only send it when non-empty.
  if (input.event) payload.event = input.event;
  return payload;
}

export interface ModifyBookingInput extends CreateBookingInput {
  /** Id of the existing booking to modify. */
  existing: string;
}

/** Build the modify-booking payload — a create payload plus `existing`. */
export function buildModifyPayload(
  input: ModifyBookingInput,
  turnstileToken: string,
): BookingPayload {
  return { ...buildCreatePayload(input, turnstileToken), existing: input.existing };
}
