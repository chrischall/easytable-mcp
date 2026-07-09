/**
 * easyTable's write endpoints (`/user/ajax/json_*.asp`) answer as JSONP:
 * a `callbackName(<json>)` wrapper around the real payload, because the
 * booking widget calls them with jQuery `dataType: 'jsonp'`. When we drive
 * those endpoints through the browser bridge we get the raw body back and
 * have to unwrap it ourselves.
 *
 * The payload is normally a JSON array of result objects
 * (`[{ Status, errHtml, successHtml, confirmUrl }]`), but a few endpoints
 * answer with a bare object or a plain string, so this returns `unknown`
 * and the caller narrows.
 */
export function parseJsonp(body: string): unknown {
  const trimmed = body.trim();
  // Strip a leading `/**/` (some JSONP servers prefix one) and any callback
  // wrapper `name(...)` or `name(...);`. Match the FIRST `(` and the LAST `)`
  // so nested parens inside the JSON don't truncate the payload.
  const open = trimmed.indexOf('(');
  const close = trimmed.lastIndexOf(')');
  let inner: string;
  if (open !== -1 && close !== -1 && close > open) {
    inner = trimmed.slice(open + 1, close);
  } else {
    // Not wrapped — treat the whole body as the payload (some endpoints
    // answer with bare JSON or `{"message":"OK"}`).
    inner = trimmed;
  }
  inner = inner.trim();
  try {
    return JSON.parse(inner);
  } catch {
    // A successful write can answer with a non-JSON body (e.g. `OK`); hand
    // the raw unwrapped text back so the caller can still surface it.
    return inner;
  }
}

/** A single easyTable write result. `Status` 1 = success, 0 = error. */
export interface BookingResult {
  Status?: number;
  errHtml?: string;
  successHtml?: string;
  confirmUrl?: string | null;
  [k: string]: unknown;
}

/**
 * Normalize a parsed JSONP write payload to the first `BookingResult`.
 * easyTable wraps the result in a one-element array; some endpoints return
 * the object directly. Returns `null` when the shape is neither.
 */
export function firstBookingResult(payload: unknown): BookingResult | null {
  if (Array.isArray(payload)) {
    const first = payload[0];
    return isRecord(first) ? (first as BookingResult) : null;
  }
  if (isRecord(payload)) return payload as BookingResult;
  return null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
