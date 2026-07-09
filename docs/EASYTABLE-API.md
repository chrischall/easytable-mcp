# easyTable booking widget — reverse-engineered API

Source: `https://book.easytable.com/book/?id=<placeId>&lang=<lang>` + `/book/book.js?v=113`
Restaurant identified by `id` (a.k.a. `place`), e.g. `1fdfc` = "Da Papa". **No user login.**
`bookDomain` = `book.easytable.com`. `lang` = ISO-ish (`se`, `en`, `da`…; `auto` on the page).

## Bot wall
Every endpoint (reads + writes + static JS) is **Cloudflare-403 server-side** even with realistic headers.
In an open, Cloudflare-cleared browser tab the same requests return 200. Clearance cookie `__cf_bm`
is HttpOnly + JA3/fingerprint-bound → no durable node access. **Archetype: full fetchproxy (in-tab).**

## Reads — GET, return **HTML fragments** (not JSON). Loaded via `ajax()` helper into a container div.
All take `id=<place>&lang=<lang>` plus:
- `ajax/types.asp` — `&type=&event=` → booking areas ("Boka Inne", "Boka baren", "Boka Glaspergola"). Each area has a `type` id (e.g. 13991).
- `ajax/qty.asp` — `&type=&event=&current=&existing=` → guest-count options (1..9, "more → call").
- `ajax/calendar.asp` — `&type=&event=&date=&qty=&existing=&preorder=&grouprequest=` → bookable dates grid.
- `ajax/times.asp` — `&type=&event=&date=<YYYY-MM-DD>&qty=&time=&existing=&preorder=&grouprequest=` → time slots (values are minute-of-day, e.g. 1035 = 17:15).
- `ajax/preorder.asp`, `ajax/alternatives.asp`, `ajax/confirm.asp` — preorder menus / alternative slots / confirm-step markup.
- `ajax/cancel-search.asp` — `&mobile=<E164 phone>` → HTML list of that phone's bookings (rows carry `data-mobile` + booking id on the input).

## Writes
### Create — POST `/user/ajax/json_booking.asp`  (**requires Turnstile token**)
**VERIFIED against a real booking (2026-07-09):** a plain `fetch` **POST** with
`Content-Type: application/x-www-form-urlencoded;charset=UTF-8` and `body =
JSON.stringify(dataObj)` returns **HTTP 200 with a BARE JSON array** (NOT
jsonp-wrapped) `[{Status:1, successHtml, confirmUrl?}]`. (The widget uses jQuery
`dataType:'jsonp'`, but a direct POST answers bare JSON — so parse either.)

**The ASP endpoint 500s on a partial payload** — send the FULL captured shape.
Field types matter: `time` and `persons` are **STRINGS**. Exact keys of a
confirmed-successful `dataObj` (32 keys; `event`/`preorderid`/`qtyGuests` are
omitted when undefined):
```
place, type, date, persons("2"), time("1035"), name, mobile(E.164), email,
room, company, address, zip, city, country, comment,
newsletter(0/1), newsletterrelated(0), lcid("1053"), lang("se"), ref(""),
cancellationtime("180"), promocode(""), groupRequestTerms(0),
preorder({}), tags([]), amounttags([]), customFields([]), bookingInfo([]),
bookingToken(38-char), botScore(0), websitePot("" honeypot), turnstileToken(REQUIRED)
```
Gate: `if (!turnstileToken) { abort — no request sent }`.

**Four page-derived values — all harvestable (verified 2026-07-09):**
- `turnstileToken` — Cloudflare Turnstile managed/invisible, auto-solves on the
  confirm step; the hidden input `input[name="cf-turnstile-response"]` (752 chars).
  Single-use, ~300s TTL. **Harvest via the bridge `read_dom` verb.** (Turnstile
  only renders on the confirm step — the signed-in tab must be on a loaded widget.)
- `lcid` — numeric locale id, **language-dependent** (`se`→`1053`, `en`→`2057`).
  In the widget **page HTML** (`lcid = "…"` inline script) → parse from `/book/?id=&lang=`.
- `bookingToken` — a per-flow **GUID** (`{EB9351E5-…}`, 38 chars incl. braces),
  server-issued in the **`confirm.asp` fragment** (`bookingToken = "{…}"` inline
  script). **NOT botguard-generated and NOT a DOM node** → parse from a fetched
  `confirm.asp`. **REQUIRED:** isolating test (everything valid, only `bookingToken`
  emptied) → HTTP 200 `Status:0` "Din bokning kunde inte slutföras" (rejected, no
  booking). With it → `Status:1`.
- `cancellationtime` — the restaurant's cancel window in minutes (`"180"`); a hidden
  input `#cancellationtime` in the **`confirm.asp` fragment**. Empty → the ASP
  endpoint **500s** (numeric-conversion crash), so it must be sent.

**Harvest recipe (what easytable-mcp's client does):** fetch `confirm.asp`
(→ `bookingToken` + `cancellationtime`) and `/book/?id=&lang=` (→ `lcid`) through the
bridge, `read_dom` the `cf-turnstile-response` input, then POST the full 32-key body.

### Modify — POST JSONP `/user/ajax/json_modify_booking.asp`
Same `dataObj` + `existing=<existingBookingId>`. Same Turnstile gate.

### Cancel — **GET** JSONP `/user/ajax/json_cancel_booking.asp`  (**no Turnstile**)
Query: `place=<place>&mobile=<E164>&booking=<bookingId>`. Booking id + data-mobile come from `cancel-search.asp` rows.

### Others: `/user/ajax/json_waitinglist.asp` (POST, waitlist), `/user/ajax/json_grouprequest.asp` (POST, large-party request). Waitlist/group POST JSON.stringify(dataObj) too.

## Write response shape (JSONP array of objects)
```
[{ Status: 0|1, errHtml, successHtml, confirmUrl }]
Status===0 → error (errHtml).  Status===1 → success (successHtml, or redirect to confirmUrl).
```

## Notes
- `type` = booking area id; `event` = optional event id (usually undefined).
- times.asp slot value is minutes-of-day (1035→17:15). Confirm step shows a 2h duration.
- All JSONP: server wraps response in a callback; requestJson through the bridge should strip/parse.
