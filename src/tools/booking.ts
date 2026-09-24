import { z } from 'zod';
import {
  IsoDate,
  NonEmptyString,
  PositiveInt,
  confirmTokenParam,
  confirmationFromEnv,
  minifiedResult,
  requireConfirmationWithFallback,
  toolAnnotations,
} from '@chrischall/mcp-utils';
import type { McpServer, ServerContext } from '@modelcontextprotocol/server';
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

const CONFIRM_FLOW =
  'Asks the user to confirm first: a confirmation prompt where the client supports one; otherwise the first call makes NO network call and returns a preview and a confirmToken, and only a repeat call with that token proceeds (see MCP_CONFIRM_MODE).';
const TAB_NOTE = 'A signed-in book.easytable.com tab must be open so the Turnstile token can be read.';

/**
 * The confirm gate every booking write passes before it touches the network.
 * `undefined` means proceed; anything else is the result to return unchanged
 * (a prompt, a phase-1 preview + confirmToken, or a refusal). The preview is
 * rebuilt from the call's own arguments every time, and `payload` is exactly
 * what the write submits, so a token only authorises the booking it previewed.
 */
function confirmWrite(
  ctx: ServerContext,
  options: { tool: string; verb: string; message: string; target: string; payload: object; preview: Record<string, unknown>; confirmToken: string | undefined },
) {
  // The prompt shows what will happen; the note (how to use the token) is only for the token flow.
  const { note: _note, ...details } = options.preview;
  return requireConfirmationWithFallback(
    ctx,
    confirmationFromEnv({
      action: `easytable.${options.verb}`,
      message: options.message,
      details,
      tool: options.tool,
      confirmToken: options.confirmToken,
      subject: () => ({ target: options.target, payload: options.payload, preview: options.preview }),
    }),
  );
}

export function registerBookingTools(server: McpServer, client: EasyTableClient): void {
  // --- cancel (tokenless) ---------------------------------------------------
  server.registerTool(
    'easytable_cancel_booking',
    {
      description:
        'Cancel an existing booking. Look up the booking id first with easytable_find_bookings (it needs the mobile the booking was made with). ' +
        CONFIRM_FLOW,
      annotations: toolAnnotations({ readOnly: false, idempotent: true, openWorld: true, destructive: true }),
      inputSchema: z.object({
        id: IdSchema,
        mobile: NonEmptyString.describe('Mobile the booking was made with, E.164 (e.g. +46701234567).'),
        bookingId: NonEmptyString.describe('Booking id from easytable_find_bookings.'),
        confirmToken: confirmTokenParam,
      }),
    },
    async ({ id, mobile, bookingId, confirmToken }, ctx) => {
      const gate = await confirmWrite(ctx, {
        tool: 'easytable_cancel_booking',
        verb: 'cancel_booking',
        message: 'Review and confirm cancelling this booking:',
        target: bookingId,
        payload: { id, mobile, bookingId },
        preview: {
          action: 'cancel_booking',
          id,
          bookingId,
          mobile,
          note: 'Nothing has been sent — call again with the same arguments and the confirmToken to cancel this booking.',
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
    time: NonEmptyString.describe('Time slot HH:MM (from easytable_list_times).'),
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
        verb: 'create_booking',
        message: 'Review and confirm this booking:',
        target: input.id,
        payload: input,
        preview: {
          action: 'create_booking',
          preview: input,
          note: `Nothing has been sent — call again with the same arguments and the confirmToken to submit this booking. ${TAB_NOTE}`,
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
        verb: 'modify_booking',
        message: 'Review and confirm this change to the booking:',
        target: input.existing,
        payload: input,
        preview: {
          action: 'modify_booking',
          preview: input,
          clears,
          note:
            (clears.length > 0 ? `These fields will be cleared on the booking: ${clears.join(', ')}. ` : '') +
            `Nothing has been sent — call again with the same arguments and the confirmToken to apply this change. ${TAB_NOTE}`,
        },
        confirmToken,
      });
      if (gate) return gate;
      const result = await client.modifyBooking(input);
      return minifiedResult({ action: 'modify_booking', clears, ...summarize(result) });
    },
  );
}
