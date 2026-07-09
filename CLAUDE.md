# CLAUDE.md — easytable-mcp

Guidance for Claude working in this repo.

## TL;DR

easyTable MCP server. easyTable is a restaurant table-booking system with a
public per-restaurant widget at `book.easytable.com/book/?id=<placeId>` (classic
ASP + jQuery). **No user login** — the restaurant is identified by its `id`
(a.k.a. `place`). Every endpoint is Cloudflare-403'd server-side, so this is a
**full-fetchproxy** MCP ("Pattern A"): every request rides the user's own
signed-in, Cloudflare-cleared `book.easytable.com` tab via
[`@fetchproxy/server`](https://github.com/chrischall/fetchproxy). No server-side
fetch, no bootstrap capture — the anti-bot clearance is fingerprint-bound to the
browser tab.

The reverse-engineered API is documented in `docs/EASYTABLE-API.md`.

## Tool surface

| Tool | File | Endpoint | Kind |
| --- | --- | --- | --- |
| `easytable_list_types` | `tools/availability.ts` | GET `/book/ajax/types.asp` (HTML fragment) | read |
| `easytable_list_dates` | `tools/availability.ts` | GET `/book/ajax/calendar.asp` (HTML fragment) | read |
| `easytable_list_times` | `tools/availability.ts` | GET `/book/ajax/times.asp` (HTML fragment) | read |
| `easytable_find_bookings` | `tools/availability.ts` | GET `/book/ajax/cancel-search.asp` (HTML fragment) | read |
| `easytable_create_booking` | `tools/booking.ts` | POST `/user/ajax/json_booking.asp` (JSONP) | write (confirm) |
| `easytable_modify_booking` | `tools/booking.ts` | POST `/user/ajax/json_modify_booking.asp` (JSONP) | write (confirm) |
| `easytable_cancel_booking` | `tools/booking.ts` | GET `/user/ajax/json_cancel_booking.asp` (JSONP) | write (confirm) |
| `easytable_healthcheck` | (index.ts) | GET `/robots.txt` round-trip + bridge status | read |

## The Turnstile write-gate (the interesting bit)

`create`/`modify` need four page-derived values (all verified against a real
booking, 2026-07-09) on top of the guest details:
- **`turnstileToken`** — a live Cloudflare Turnstile token (server rejects without
  it). Read from the widget's hidden `input[name="cf-turnstile-response"]` via the
  fetchproxy bridge's **`read_dom`** capability (a 1.4.0+ verb added for this MCP):
  an isolated-world `querySelector` DOM read of a selector declared in
  `bridge-fetchproxy.ts` (`domSelectors`), surfaced at pair time — no page-JS exec.
- **`bookingToken`** — a per-flow GUID the server issues in the `confirm.asp`
  fragment (REQUIRED; empty → `Status:0` rejection). Parsed from a fetched fragment.
- **`cancellationtime`** — hidden input in `confirm.asp` (empty → ASP **500s**).
- **`lcid`** — language-dependent locale id, parsed from the page HTML.

`client.harvestBookingConfig()` fetches `confirm.asp` + `/book/` and parses these;
`read_dom` supplies the token. The POST body is the full 32-key `dataObj` with
`time`/`persons` as **strings** — a partial payload 500s (see `docs/EASYTABLE-API.md`).
`cancel` is a plain tokenless GET.

**Verified live (owner-authorized):** one real booking was created + cancelled to
pin the payload shape and prove the `bookingToken` requirement. Writes are
confirm-gated with a dry-run preview; payload shapes are unit-tested. Don't fire
extra real bookings to "re-verify" — it's a real reservation at a real restaurant.

## Dependency note (pre-publish)

This MCP depends on the `read_dom` capability, which spans three packages that
must be released in order before a fresh `npm install` (or CI) can build it:
1. `@fetchproxy/server` (+ `@fetchproxy/protocol` + the browser extension) with
   `read_dom` / `domSelectors` — **the extension must also be deployed**, since
   the DOM read runs in the user's browser.
2. `@chrischall/mcp-utils` with the `domSelectors` bootstrap/transport passthrough.
3. This repo, with its dep ranges bumped to those releases.

During development these are `npm link`ed locally.

## Conventions

TDD; every write is `confirm`-gated with a dry-run `preview()` and routes through
the client. Tests mock the bridge (the `Bridge` interface in `client.ts`) — no
real network. `docs/EASYTABLE-API.md` pins the reverse-engineered request/response
shapes. Version lives once in `src/version.ts` (`x-release-please-version`).
