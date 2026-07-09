import { describe, it, expect } from 'vitest';
import {
  parseTypes,
  parseCalendar,
  parseTimes,
  parseCancelSearch,
  parseConfirmConfig,
  parseLcid,
} from '../src/parse.js';

describe('parseTypes', () => {
  it('extracts type id + label from hash-href anchors', () => {
    const html = `
      <div class="title">Choose type</div>
      <div id="booking-types">
        <a href="?id=1fdfc&lang=en#step=qty&type=13991">Boka Inne</a>
        <a href="#step=qty&type=13992">Boka baren</a>
      </div>`;
    expect(parseTypes(html)).toEqual([
      { type: '13991', label: 'Boka Inne' },
      { type: '13992', label: 'Boka baren' },
    ]);
  });

  it('returns empty for a nobooking fragment', () => {
    expect(parseTypes('<div class="types"><div class="nobooking">No availability</div></div>')).toEqual([]);
  });
});

describe('parseCalendar', () => {
  it('marks available vs unavailable days', () => {
    const html = `
      <div class="weekblock">
        <span class="day av af" data-date="2026-07-10" data-note=""></span>
        <span class="day closed" data-date="2026-07-11" data-note="Closed"></span>
        <span class="day ua" data-date="2026-07-12" data-note=""></span>
      </div>`;
    expect(parseCalendar(html)).toEqual([
      { date: '2026-07-10', available: true },
      { date: '2026-07-11', available: false, note: 'Closed' },
      { date: '2026-07-12', available: false },
    ]);
  });
});

describe('parseTimes', () => {
  it('converts data-time slots to HH:MM', () => {
    const html = `
      <span class="time ampm" data-time="1035" data-longtime="17:15 - 19:15"></span>
      <span class="time ampm" data-time="1050" data-preorder="1"></span>`;
    expect(parseTimes(html)).toEqual([
      { time: '17:15', minuteOfDay: 1035, longTime: '17:15 - 19:15' },
      { time: '17:30', minuteOfDay: 1050, preorder: true },
    ]);
  });

  it('skips cells without a numeric data-time', () => {
    expect(parseTimes('<span class="time"></span>')).toEqual([]);
  });
});

describe('parseCancelSearch', () => {
  it('extracts booking id + mobile from rows', () => {
    const html = `
      <div class="row" data-mobile="+46701234567">
        <span>10 Jul 2026 17:15 · 2 guests</span>
        <input type="button" data-booking="BKG-1" value="Cancel" />
      </div>`;
    const found = parseCancelSearch(html);
    expect(found).toHaveLength(1);
    expect(found[0].bookingId).toBe('BKG-1');
    expect(found[0].mobile).toBe('+46701234567');
    expect(found[0].label).toContain('2 guests');
  });

  it('handles the live shape where the id is on input[data-id]', () => {
    const html = '<div data-mobile="+46701234567"><div><input type="button" data-id="XYZ9"></div></div>';
    const found = parseCancelSearch(html);
    expect(found[0].bookingId).toBe('XYZ9');
    expect(found[0].mobile).toBe('+46701234567');
  });
});

describe('parseConfirmConfig / parseLcid', () => {
  it('pulls bookingToken (script var) and cancellationtime (hidden input) from confirm.asp', () => {
    const html =
      '<div>...</div><script>var re2 = /x/; bookingToken = "{EB9351E5-D57B-F111}"; other=1;</script>' +
      '<input type="hidden" id="cancellationtime" name="cancellationtime" value="180">';
    const cfg = parseConfirmConfig(html);
    expect(cfg.bookingToken).toBe('{EB9351E5-D57B-F111}');
    expect(cfg.cancellationtime).toBe('180');
  });

  it('returns undefined fields when absent', () => {
    expect(parseConfirmConfig('<div>nothing</div>')).toEqual({});
  });

  it('parses lcid from the page HTML', () => {
    expect(parseLcid('<script>var lcid = "1053"; var lang = "se";</script>')).toBe('1053');
    expect(parseLcid('<div>no lcid here</div>')).toBeUndefined();
  });
});
