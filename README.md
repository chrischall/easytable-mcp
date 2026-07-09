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
| `easytable_create_booking` | write (confirm-gated) — make a reservation |
| `easytable_modify_booking` | write (confirm-gated) — change a reservation |
| `easytable_cancel_booking` | write (confirm-gated) — cancel a reservation |
| `easytable_healthcheck` | read — bridge connection status |

Writes are `confirm`-gated: without `confirm: true` they return a dry-run
preview and make no network call.

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
