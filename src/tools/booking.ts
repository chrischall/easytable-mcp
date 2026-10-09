import { z } from 'zod';
import {
  IsoDate,
  IsoTime,
  McpToolError,
  NonEmptyString,
  PositiveInt,
  CONFIRM_FLOW_SENTENCE,
  confirmTokenParam,
  confirmWrite,
  minifiedResult,
  toolAnnotations,
} from '@chrischall/mcp-utils';
import type { McpServer } from '@modelcontextprotocol/server';
import type { EasyTableClient } from '../client.js';
import { classifyWrite, type WriteOutcome, type WriteResponse } from '../jsonp.js';

const IdSchema = NonEmptyString.describe('Restaurant id — the `id` in a book.easytable.com/book/?id=<id> link.');
const LangSchema = z.string().default('en').describe('Widget language code (en, se, da, …). Defaults to en.');

/** Human-facing summary of an easyTable write result. */
function summarize(res: WriteResponse): {
  ok: boolean;
  outcome: WriteOutcome;
  status: number | undefined;
  message: string;
  confirmUrl?: string;
  raw: unknown;
} {
  const outcome = classifyWrite(res);
  const result = res.result;
  const message =
    outcome === 'ok'
      ? 'easyTable accepted the request.'
      : outcome === 'rejected'
        ? 'easyTable rejected the request — see the error markup in raw.'
        : 'easyTable answered with an unrecognised response, so the outcome is unknown — the change may already have gone through. ' +
          'Run easytable_find_bookings with the guest mobile before retrying; do not re-submit blindly.';
  return {
    ok: outcome === 'ok',
    outcome,
    status: result?.Status,
    message,
    ...(result?.confirmUrl ? { confirmUrl: String(result.confirmUrl) } : {}),
    // Never drop the body: the parsed result when there is one, otherwise the
    // raw payload (text, array, object) easyTable actually sent.
    raw: result ?? res.payload,
  };
}

// The fleet confirm-flow sentence (mcp-utils confirmWrite), plus the one fact
// specific to this server: phase 1 never reaches the bridge.
const CONFIRM_FLOW = `${CONFIRM_FLOW_SENTENCE} The first call makes NO network call.`;
// Cancel is the exception: it looks the booking up (a read) so the preview
// names the reservation, and refuses an id that isn't one of that mobile's.
const CANCEL_CONFIRM_FLOW = `${CONFIRM_FLOW_SENTENCE} The first call only looks the booking up (a read); it cancels nothing.`;
const TAB_NOTE = 'A signed-in book.easytable.com tab must be open so the Turnstile token can be read.';

export function registerBookingTools(server: McpServer, client: EasyTableClient): void {
  // --- cancel (tokenless) ---------------------------------------------------
  server.registerTool(
    'easytable_cancel_booking',
    {
      description:
        'Cancel an existing booking. Look up the booking id first with easytable_find_bookings (it needs the mobile the booking was made with). ' +
        CANCEL_CONFIRM_FLOW,
      annotations: toolAnnotations({ readOnly: false, idempotent: true, openWorld: true, destructive: true }),
      inputSchema: z.object({
        id: IdSchema,
        mobile: NonEmptyString.describe('Mobile the booking was made with, E.164 (e.g. +46701234567).'),
        bookingId: NonEmptyString.describe('Booking id from easytable_find_bookings.'),
        confirmToken: confirmTokenParam,
      }),
    },
    async ({ id, mobile, bookingId, confirmToken }, ctx) => {
      // easyTable's cancel endpoint is authorised by place + mobile + id
      // alone, so a mixed-up id would cancel some other real reservation.
      // Look it up first (side-effect free) and show the user which booking
      // they are approving; re-checked on the confirmed call as well.
      const found = await client.findBookings(id, 'en', mobile);
      const booking = found.find((b) => b.bookingId === bookingId);
      if (!booking) {
        throw new McpToolError(`No booking ${bookingId} was found for mobile ${mobile} at restaurant ${id}, so nothing was cancelled.`, {
          hint: `Run easytable_find_bookings with this mobile and pick a bookingId from its results.${found.length > 0 ? ` It currently lists: ${found.map((b) => b.bookingId).join(', ')}.` : ''}`,
        });
      }
      // easyTable has no user login: the restaurant id + guest mobile are the
      // whole identity, and both are in the bound payload.
      const gate = await confirmWrite(ctx, {
        tool: 'easytable_cancel_booking',
        action: 'easytable.cancel_booking',
        summary: 'cancel_booking',
        message: 'Review and confirm cancelling this booking:',
        account: undefined,
        target: bookingId,
        payload: { id, mobile, bookingId },
        preview: {
          booking: { bookingId: booking.bookingId, ...(booking.label ? { label: booking.label } : {}) },
          note: 'Nothing has been cancelled yet. To cancel this booking, confirm in the prompt, or call again with the same arguments and the confirmToken.',
        },
        confirmToken,
      });
      if (gate) return gate;
      const result = await client.cancelBooking({ id, mobile, bookingId });
      return minifiedResult({ action: 'cancel_booking', ...summarize(result) });
    },
  );

  // --- create ---------------------------------------------------------------
  const createFields = {
    id: IdSchema,
    type: NonEmptyString.describe('Booking area/type id from easytable_list_types.'),
    date: IsoDate.describe('Booking date, ISO YYYY-MM-DD (from easytable_list_dates).'),
    time: IsoTime.describe('Time slot HH:MM, 24h (from easytable_list_times).'),
    persons: PositiveInt.describe('Party size.'),
    name: NonEmptyString.describe('Guest name on the booking.'),
    mobile: NonEmptyString.describe('Guest mobile in E.164 (e.g. +46701234567).'),
    email: z.string().email().optional().describe('Guest email.'),
    comment: z.string().optional().describe('Free-text note / special requests.'),
    company: z.string().optional().describe('Optional company name.'),
    lang: LangSchema,
    event: z.string().optional().describe('Optional event id.'),
  };

  server.registerTool(
    'easytable_create_booking',
    {
      description:
        'Create a restaurant booking. Reads the Cloudflare Turnstile token from your signed-in booking-widget tab (via the bridge) and submits it with the reservation — so a book.easytable.com/book/?id=<id> tab must be open and loaded. ' +
        CONFIRM_FLOW,
      annotations: toolAnnotations({ readOnly: false, idempotent: false, openWorld: true, destructive: true }),
      inputSchema: z.object({ ...createFields, confirmToken: confirmTokenParam }),
    },
    async ({ confirmToken, ...input }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'easytable_create_booking',
        action: 'easytable.create_booking',
        summary: 'create_booking',
        message: 'Review and confirm this booking:',
        account: undefined,
        target: input.id,
        payload: input,
        preview: {
          note: `Nothing has been sent yet. To submit this booking, confirm in the prompt, or call again with the same arguments and the confirmToken. ${TAB_NOTE}`,
        },
        confirmToken,
      });
      if (gate) return gate;
      const result = await client.createBooking(input);
      return minifiedResult({ action: 'create_booking', ...summarize(result) });
    },
  );

  // --- modify ---------------------------------------------------------------
  // easyTable's modify endpoint takes the whole booking, not a patch, and there
  // is no endpoint that returns an existing booking's details to merge over
  // (find_bookings yields only an id + label). So the fields that would
  // otherwise default to empty are required here: the caller must carry the
  // existing values over, or pass '' to clear them on purpose.
  const carriedOver = {
    email: z
      .union([z.string().email(), z.literal('')])
      .describe("Guest email. REQUIRED — the booking's current email, or '' to remove it (also drops the confirmation mail)."),
    comment: z
      .string()
      .describe("Free-text note / special requests. REQUIRED — the booking's current comment (e.g. allergy notes), or '' to remove it."),
    company: z.string().describe("Company name. REQUIRED — the booking's current company, or '' for none."),
  };
  const CLEARABLE = ['email', 'comment', 'company'] as const;

  server.registerTool(
    'easytable_modify_booking',
    {
      description:
        'Modify an existing booking (date/time/party size/details). Like create, it reads the Turnstile token from your signed-in widget tab. Get the existing booking id from easytable_find_bookings. ' +
        'The change replaces the whole booking: email, comment and company are required — pass the booking\'s current values to keep them (ask the user if unknown), or \'\' to clear them; the newsletter opt-in is reset. ' +
        CONFIRM_FLOW,
      annotations: toolAnnotations({ readOnly: false, idempotent: false, openWorld: true, destructive: true }),
      inputSchema: z.object({
        ...createFields,
        ...carriedOver,
        existing: NonEmptyString.describe('Id of the existing booking to modify (from easytable_find_bookings).'),
        confirmToken: confirmTokenParam,
      }),
    },
    async ({ confirmToken, ...input }, ctx) => {
      const clears = CLEARABLE.filter((k) => input[k] === '');
      const gate = await confirmWrite(ctx, {
        tool: 'easytable_modify_booking',
        action: 'easytable.modify_booking',
        summary: 'modify_booking',
        message: 'Review and confirm this change to the booking:',
        account: undefined,
        target: input.existing,
        payload: input,
        preview: {
          clears,
          note:
            (clears.length > 0 ? `These fields will be cleared on the booking: ${clears.join(', ')}. ` : '') +
            `Nothing has been sent yet. To apply this change, confirm in the prompt, or call again with the same arguments and the confirmToken. ${TAB_NOTE}`,
        },
        confirmToken,
      });
      if (gate) return gate;
      const result = await client.modifyBooking(input);
      return minifiedResult({ action: 'modify_booking', clears, ...summarize(result) });
    },
  );
}
