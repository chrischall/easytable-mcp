/**
 * `_meta.mint` hints (the mcp-host context-groups contract): which canonical
 * group a tool belongs to, what kind of ask it answers, and the everyday words
 * its name and description lack. Inert data to any other client.
 *
 * No canonical read and no `subject`: easyTable has no account, so there is no
 * listable set of subjects, and every read needs a restaurant id (and, for
 * bookings, the guest's mobile) that a host cannot fill from an ask like
 * "what's on tonight?".
 */
const DOMAIN = 'food';

type Intent = 'lookup' | 'change';
type MintMeta = { mint: { domain: typeof DOMAIN; intent: Intent; aliases?: string[] } };

function foodMeta(intent: Intent, aliases?: string[]): MintMeta {
  return { mint: { domain: DOMAIN, intent, ...(aliases ? { aliases } : {}) } };
}

/** Reads of a restaurant's areas, open dates and time slots. */
export const AVAILABILITY_META = foodMeta('lookup', ['table', 'free table', 'availability', 'open slots']);
/** The read of bookings made with a mobile. */
export const FIND_BOOKINGS_META = foodMeta('lookup', ['my reservation', 'my booking', 'reservations']);
/** Booking a table. */
export const CREATE_BOOKING_META = foodMeta('change', ['book a table', 'reservation', 'table for', 'dinner booking']);
/** Moving or editing an existing booking. */
export const MODIFY_BOOKING_META = foodMeta('change', ['change my reservation', 'move my booking', 'reschedule']);
/** Cancelling a booking. */
export const CANCEL_BOOKING_META = foodMeta('change', ['cancel my reservation', 'cancel my booking']);
