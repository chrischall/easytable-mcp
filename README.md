# easytable-mcp

An MCP server for **easyTable** restaurant reservations. easyTable is a
restaurant table-booking system with a public per-restaurant widget at
`https://book.easytable.com/book/?id=<restaurantId>`.

Every request rides the user's own signed-in, Cloudflare-cleared
`book.easytable.com` browser tab via the
[`@fetchproxy/server`](https://github.com/chrischall/fetchproxy) bridge — the
site blocks server-side requests, and there is no login (the restaurant is
identified by its `id`).

> This project was developed and is maintained by AI (Claude Code). Use at your
> own discretion.

## Tools

| Tool | Kind |
| --- | --- |
| `easytable_list_types` | read — bookable areas/types for a restaurant |
| `easytable_list_dates` | read — bookable dates for an area + party size |
| `easytable_list_times` | read — available time slots |
| `easytable_find_bookings` | read — look up bookings by phone number |
| `easytable_create_booking` | write (confirmed) — make a reservation |
| `easytable_modify_booking` | write (confirmed) — change a reservation |
| `easytable_cancel_booking` | write (confirmed) — cancel a reservation |
| `easytable_healthcheck` | read — bridge connection status |

## Confirmations

Every write asks you to confirm it first. A client that can show a
confirmation prompt (Claude Code) shows one. Elsewhere the first call makes no
network call and returns a preview plus a `confirmToken`; only a repeat call
with the same arguments and that token books, changes or cancels. The token is
single-use, and a changed argument invalidates it.

| variable | default | |
|---|---|---|
| `MCP_CONFIRM_MODE` | `ask-user` | What a write does on a client that cannot show a confirmation prompt (claude.ai, Claude Desktop). `ask-user`: two steps — the first call does nothing and returns a preview plus a token, and the model must get your approval in chat before calling again with it. `auto`: the same two steps, but the model may use the token after reviewing the preview itself. `refuse`: writes are refused on such clients. A client that can show prompts (Claude Code) always gets the real prompt. An unrecognised value is treated as `refuse`. |
| `MCP_CONFIRM_TTL_SECONDS` | `600` | How long a token stays valid. |
| `MCP_CONFIRM_SECRET` | random per process | Signing key; set it only if tokens must survive a server restart. |

## Setup

1. Install the [fetchproxy](https://github.com/chrischall/fetchproxy) browser
   extension.
2. Open a booking widget in Chrome: `https://book.easytable.com/book/?id=<id>`
   and let it finish loading.
3. The first tool call prints a one-time pair code to approve in the extension.

`create` and `modify` additionally read the widget's Cloudflare Turnstile token
from the loaded confirm step, so a booking-widget tab must be open when you
confirm one.

## Development

```sh
npm install
npm run build
npm test
```

See `docs/EASYTABLE-API.md` for the reverse-engineered request/response shapes
and `CLAUDE.md` for architecture notes.

## License

MIT
