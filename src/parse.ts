/**
 * Parsers for the server-rendered HTML fragments returned by easyTable's
 * `/book/ajax/*.asp` availability endpoints. These are jQuery-injected
 * partials, so we parse the raw markup the bridge fetches.
 *
 * Selectors were pinned against the live widget (see docs/EASYTABLE-API.md).
 * Each parser degrades to an empty list rather than throwing when the
 * expected structure is absent — an undocumented widget can drift, and a
 * "no availability" fragment (`.nobooking`) is a legitimate empty result.
 */
import { parse, type HTMLElement } from 'node-html-parser';
import { minuteOfDayToHHMM } from './time.js';

export interface BookingType {
  /** `type` id used on subsequent calls. */
  type: string;
  /** Human label, e.g. "Boka Inne". */
  label: string;
}

export interface BookingDate {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  /** True when the date has bookable capacity (`.av`). */
  available: boolean;
  /** Optional note the widget attaches (`data-note`). */
  note?: string;
}

export interface BookingTime {
  /** `HH:MM` slot label. */
  time: string;
  /** Raw minute-of-day value from `data-time`. */
  minuteOfDay: number;
  /** Full label the widget shows (`data-longtime`), when present. */
  longTime?: string;
  /** True when this slot requires/offers a preorder (`data-preorder`). */
  preorder?: boolean;
}

/**
 * Types fragment: anchors under `#booking-types` (or `.types`) whose hash
 * href carries `type=<id>`. The label is the anchor's trimmed text.
 */
export function parseTypes(html: string): BookingType[] {
  const root = parse(html);
  const out: BookingType[] = [];
  const seen = new Set<string>();
  for (const a of root.querySelectorAll('a')) {
    const href = a.getAttribute('href') ?? '';
    const m = /[?&#]type=([^&]+)/.exec(href);
    if (!m) continue;
    const type = decodeURIComponent(m[1]);
    if (seen.has(type)) continue;
    const label = collapseWs(a.text);
    if (!label) continue;
    seen.add(type);
    out.push({ type, label });
  }
  return out;
}

/**
 * Calendar fragment: `span.day` cells. `.av` marks an available day;
 * `.closed`/`.ua` mark unavailable ones. `data-date` is the ISO date.
 */
export function parseCalendar(html: string): BookingDate[] {
  const root = parse(html);
  const out: BookingDate[] = [];
  for (const el of root.querySelectorAll('span.day')) {
    const date = el.getAttribute('data-date');
    if (!date) continue;
    const note = el.getAttribute('data-note') || undefined;
    out.push({ date, available: hasClass(el, 'av'), ...(note ? { note } : {}) });
  }
  return out;
}

/**
 * Times fragment: `span.time` cells with `data-time` (minute-of-day). Only
 * bookable slots are rendered as `.time`, so every parsed entry is available.
 */
export function parseTimes(html: string): BookingTime[] {
  const root = parse(html);
  const out: BookingTime[] = [];
  for (const el of root.querySelectorAll('span.time')) {
    const raw = el.getAttribute('data-time');
    if (raw === undefined || raw === null || raw === '') continue;
    const minuteOfDay = Number(raw);
    if (!Number.isInteger(minuteOfDay)) continue;
    const longTime = el.getAttribute('data-longtime') || undefined;
    const preorderAttr = el.getAttribute('data-preorder');
    const preorder = preorderAttr !== undefined && preorderAttr !== null && preorderAttr !== '' && preorderAttr !== '0';
    out.push({
      time: minuteOfDayToHHMM(minuteOfDay),
      minuteOfDay,
      ...(longTime ? { longTime } : {}),
      ...(preorder ? { preorder } : {}),
    });
  }
  return out;
}

/**
 * cancel-search fragment: each existing booking is a clickable row carrying
 * a `data-mobile` on an ancestor and the booking id on the input. We surface
 * the id + any label text so the caller can pick which to cancel.
 */
export interface FoundBooking {
  /** Booking id passed to the cancel endpoint. */
  bookingId: string;
  /** E.164 mobile the booking was made with (`data-mobile`). */
  mobile?: string;
  /** Any human-readable summary text on the row. */
  label?: string;
}

export function parseCancelSearch(html: string): FoundBooking[] {
  const root = parse(html);
  const out: FoundBooking[] = [];
  for (const input of root.querySelectorAll('input')) {
    const bookingId =
      input.getAttribute('data-booking') ??
      input.getAttribute('value') ??
      input.getAttribute('data-id');
    if (!bookingId) continue;
    const row = findAncestorWithAttr(input, 'data-mobile');
    const mobile = row?.getAttribute('data-mobile') || undefined;
    const label = collapseWs((row ?? input.parentNode)?.text ?? '') || undefined;
    out.push({ bookingId, ...(mobile ? { mobile } : {}), ...(label ? { label } : {}) });
  }
  return out;
}

/**
 * The three page-derived values a create/modify POST needs beyond the
 * Turnstile token. `bookingToken` (a per-flow GUID) and `cancellationtime`
 * come from the `confirm.asp` fragment; `lcid` from the widget page HTML.
 * Any that can't be found are returned undefined so the caller can decide.
 */
export interface BookingConfig {
  bookingToken?: string;
  cancellationtime?: string;
  lcid?: string;
}

/** Parse `bookingToken`/`cancellationtime` out of the `confirm.asp` fragment. */
export function parseConfirmConfig(confirmHtml: string): BookingConfig {
  const out: BookingConfig = {};
  const bt = /bookingToken\s*=\s*["']([^"']+)["']/.exec(confirmHtml);
  if (bt) out.bookingToken = bt[1];
  // cancellationtime is a hidden input in the fragment.
  const root = parse(confirmHtml);
  const ct = root.querySelector('#cancellationtime');
  const ctVal = ct?.getAttribute('value');
  if (ctVal) out.cancellationtime = ctVal;
  return out;
}

/** Parse `lcid` (numeric locale id) out of the widget page HTML. */
export function parseLcid(pageHtml: string): string | undefined {
  const m = /\blcid\s*=\s*["']?(\d+)/i.exec(pageHtml);
  return m ? m[1] : undefined;
}

function hasClass(el: HTMLElement, cls: string): boolean {
  return el.classList.contains(cls);
}

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function findAncestorWithAttr(el: HTMLElement, attr: string): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (cur.getAttribute && cur.getAttribute(attr) !== undefined && cur.getAttribute(attr) !== null) {
      return cur;
    }
    cur = cur.parentNode as HTMLElement | null;
  }
  return null;
}
