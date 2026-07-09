import { describe, it, expect } from 'vitest';
import { buildCreatePayload, buildModifyPayload } from '../src/payload.js';

const base = {
  id: '1fdfc',
  type: '13991',
  date: '2026-07-10',
  time: '17:15',
  persons: 2,
  name: 'Test Guest',
  mobile: '+46701234567',
  email: 'test@example.com',
  comment: 'window seat',
};

// The full-shape field set + string time/persons were captured from a real
// successful booking (docs/EASYTABLE-API.md) — the ASP endpoint 500s on a
// partial payload, so these assertions pin the exact shape the server accepts.
describe('buildCreatePayload', () => {
  it('maps tool input to the full widget dataObj shape', () => {
    const p = buildCreatePayload(base, 'TOKEN123');
    expect(p).toMatchObject({
      place: '1fdfc',
      type: '13991',
      date: '2026-07-10',
      time: '1035', // string, not number
      persons: '2', // string, not number
      name: 'Test Guest',
      mobile: '+46701234567',
      email: 'test@example.com',
      comment: 'window seat',
      lang: 'en',
      websitePot: '',
      botScore: 0,
      turnstileToken: 'TOKEN123',
    });
    expect(p).not.toHaveProperty('existing');
    // event omitted when empty (the widget omits undefined)
    expect(p).not.toHaveProperty('event');
  });

  it('sends the full field set with safe empty defaults', () => {
    const p = buildCreatePayload(base, 'TK');
    // collection fields must be present (ASP iterates them → 500 if missing)
    expect(p.tags).toEqual([]);
    expect(p.amounttags).toEqual([]);
    expect(p.customFields).toEqual([]);
    expect(p.bookingInfo).toEqual([]);
    expect(p.preorder).toEqual({});
    // text/config fields default to empty
    for (const k of ['room', 'address', 'zip', 'city', 'country', 'ref', 'promocode', 'lcid', 'cancellationtime', 'bookingToken'] as const) {
      expect(p[k]).toBe('');
    }
    expect(p.newsletter).toBe(0);
    expect(p.newsletterrelated).toBe(0);
    expect(p.groupRequestTerms).toBe(0);
  });

  it('carries page-derived values when supplied', () => {
    const p = buildCreatePayload(
      { ...base, lcid: '1053', cancellationtime: '180', bookingToken: 'BT', event: 'EV42' },
      'TK',
    );
    expect(p.lcid).toBe('1053');
    expect(p.cancellationtime).toBe('180');
    expect(p.bookingToken).toBe('BT');
    expect(p.event).toBe('EV42');
  });

  it('defaults optional fields', () => {
    const p = buildCreatePayload(
      { id: 'x', type: 't', date: '2026-01-01', time: '12:00', persons: 4, name: 'A', mobile: '+1' },
      'TK',
    );
    expect(p.email).toBe('');
    expect(p.comment).toBe('');
    expect(p.company).toBe('');
    expect(p.lang).toBe('en');
  });
});

describe('buildModifyPayload', () => {
  it('adds the existing booking id', () => {
    const p = buildModifyPayload({ ...base, existing: 'BKG-9' }, 'TK');
    expect(p.existing).toBe('BKG-9');
    expect(p.place).toBe('1fdfc');
    expect(p.turnstileToken).toBe('TK');
  });
});
