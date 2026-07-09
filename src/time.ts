/**
 * easyTable time slots are expressed as minute-of-day integers on the
 * `data-time` attribute (e.g. `1035` = 17:15). Tools accept and return
 * `HH:MM` strings; these convert between the two.
 */

/** `1035` → `"17:15"`. Throws on out-of-range input. */
export function minuteOfDayToHHMM(min: number): string {
  if (!Number.isInteger(min) || min < 0 || min >= 1440) {
    throw new Error(`minute-of-day out of range: ${min}`);
  }
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** `"17:15"` → `1035`. Throws on a malformed or out-of-range string. */
export function hhmmToMinuteOfDay(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) throw new Error(`invalid HH:MM time: ${JSON.stringify(hhmm)}`);
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) throw new Error(`time out of range: ${JSON.stringify(hhmm)}`);
  return h * 60 + m;
}
