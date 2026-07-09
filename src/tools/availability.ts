import { z } from 'zod';
import { textResult, toolAnnotations, NonEmptyString, PositiveInt, IsoDate } from '@chrischall/mcp-utils';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { EasyTableClient } from '../client.js';

const IdSchema = NonEmptyString.describe('Restaurant id — the `id` in a book.easytable.com/book/?id=<id> link.');
const LangSchema = z
  .string()
  .default('en')
  .describe('Widget language code (e.g. en, se, da, de, fr). Defaults to en.');
const TypeSchema = NonEmptyString.describe('Booking area/type id from easytable_list_types.');

export function registerAvailabilityTools(server: McpServer, client: EasyTableClient): void {
  server.registerTool(
    'easytable_list_types',
    {
      description:
        'List the bookable areas/types for a restaurant (e.g. "Boka Inne", "Boka baren"). Returns each area\'s type id for use in the other availability tools.',
      annotations: toolAnnotations({ readOnly: true }),
      inputSchema: { id: IdSchema, lang: LangSchema },
    },
    async ({ id, lang }) => textResult(await client.listTypes(id, lang)),
  );

  server.registerTool(
    'easytable_list_dates',
    {
      description:
        'List bookable dates for a restaurant area and party size. Each entry has an ISO date and whether it is available.',
      annotations: toolAnnotations({ readOnly: true }),
      inputSchema: { id: IdSchema, lang: LangSchema, type: TypeSchema, persons: PositiveInt },
    },
    async ({ id, lang, type, persons }) =>
      textResult(await client.listDates(id, lang, type, persons)),
  );

  server.registerTool(
    'easytable_list_times',
    {
      description:
        'List available time slots for a restaurant area, date, and party size. Times are returned as HH:MM.',
      annotations: toolAnnotations({ readOnly: true }),
      inputSchema: {
        id: IdSchema,
        lang: LangSchema,
        type: TypeSchema,
        date: IsoDate.describe('Date to check, ISO YYYY-MM-DD (from easytable_list_dates).'),
        persons: PositiveInt,
      },
    },
    async ({ id, lang, type, date, persons }) =>
      textResult(await client.listTimes(id, lang, type, date, persons)),
  );

  server.registerTool(
    'easytable_find_bookings',
    {
      description:
        "Look up a restaurant's existing bookings made with a given mobile number. Returns each booking's id (for easytable_cancel_booking) plus a summary.",
      annotations: toolAnnotations({ readOnly: true }),
      inputSchema: {
        id: IdSchema,
        lang: LangSchema,
        mobile: NonEmptyString.describe('Mobile number the booking was made with, in E.164 (e.g. +46701234567).'),
      },
    },
    async ({ id, lang, mobile }) => textResult(await client.findBookings(id, lang, mobile)),
  );
}
