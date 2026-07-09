import { z } from 'zod';
import {
  textResult,
  toolAnnotations,
  schemaConfirm,
  NonEmptyString,
  PositiveInt,
  IsoDate,
} from '@chrischall/mcp-utils';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EasyTableClient } from '../client.js';
import type { BookingResult } from '../jsonp.js';

const IdSchema = NonEmptyString.describe('Restaurant id — the `id` in a book.easytable.com/book/?id=<id> link.');
const LangSchema = z.string().default('en').describe('Widget language code (en, se, da, …). Defaults to en.');

/** Human-facing summary of an easyTable write result. */
function summarize(result: BookingResult | null): {
  ok: boolean;
  status: number | undefined;
  message: string;
  confirmUrl?: string;
  raw: BookingResult | null;
} {
  const status = result?.Status;
  const ok = status === 1;
  const message = ok
    ? 'easyTable accepted the request.'
    : 'easyTable did not confirm the request — check the returned error markup.';
  return {
    ok,
    status,
    message,
    ...(result?.confirmUrl ? { confirmUrl: String(result.confirmUrl) } : {}),
    raw: result,
  };
}

export function registerBookingTools(server: McpServer, client: EasyTableClient): void {
  // --- cancel (tokenless) ---------------------------------------------------
  server.registerTool(
    'easytable_cancel_booking',
    {
      description:
        'Cancel an existing booking. Look up the booking id first with easytable_find_bookings (it needs the mobile the booking was made with). ' +
        'Without confirm: true it returns a dry-run preview and makes NO network call; with confirm: true it cancels.',
      annotations: toolAnnotations({ readOnly: false, idempotent: true, openWorld: true }),
      inputSchema: {
        id: IdSchema,
        mobile: NonEmptyString.describe('Mobile the booking was made with, E.164 (e.g. +46701234567).'),
        bookingId: NonEmptyString.describe('Booking id from easytable_find_bookings.'),
        confirm: schemaConfirm,
      },
    },
    async ({ id, mobile, bookingId, confirm }) => {
      if (confirm !== true) {
        return textResult({
          dryRun: true,
          action: 'cancel_booking',
          id,
          bookingId,
          note: 'Dry run — re-run with confirm: true to cancel this booking.',
        });
      }
      const result = await client.cancelBooking({ id, mobile, bookingId });
      return textResult({ action: 'cancel_booking', ...summarize(result) });
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
        'Without confirm: true it returns a dry-run preview and makes NO network call; with confirm: true it books.',
      annotations: toolAnnotations({ readOnly: false, idempotent: false, openWorld: true }),
      inputSchema: { ...createFields, confirm: schemaConfirm },
    },
    async ({ confirm, ...input }) => {
      if (confirm !== true) {
        return textResult({
          dryRun: true,
          action: 'create_booking',
          preview: input,
          note: 'Dry run — re-run with confirm: true to submit this booking. A signed-in book.easytable.com tab must be open so the Turnstile token can be read.',
        });
      }
      const result = await client.createBooking(input);
      return textResult({ action: 'create_booking', ...summarize(result) });
    },
  );

  // --- modify ---------------------------------------------------------------
  server.registerTool(
    'easytable_modify_booking',
    {
      description:
        'Modify an existing booking (date/time/party size/details). Like create, it reads the Turnstile token from your signed-in widget tab. Get the existing booking id from easytable_find_bookings. ' +
        'Without confirm: true it returns a dry-run preview and makes NO network call; with confirm: true it applies the change.',
      annotations: toolAnnotations({ readOnly: false, idempotent: false, openWorld: true }),
      inputSchema: {
        ...createFields,
        existing: NonEmptyString.describe('Id of the existing booking to modify (from easytable_find_bookings).'),
        confirm: schemaConfirm,
      },
    },
    async ({ confirm, ...input }) => {
      if (confirm !== true) {
        return textResult({
          dryRun: true,
          action: 'modify_booking',
          preview: input,
          note: 'Dry run — re-run with confirm: true to apply this change. A signed-in book.easytable.com tab must be open so the Turnstile token can be read.',
        });
      }
      const result = await client.modifyBooking(input);
      return textResult({ action: 'modify_booking', ...summarize(result) });
    },
  );
}
