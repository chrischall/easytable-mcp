import { describe, it, expect } from 'vitest';
import { parseJsonp, firstBookingResult } from '../src/jsonp.js';

describe('parseJsonp', () => {
  it('unwraps a callback-wrapped JSON array', () => {
    const body = 'jQuery1234([{"Status":1,"successHtml":"<p>ok</p>"}])';
    expect(parseJsonp(body)).toEqual([{ Status: 1, successHtml: '<p>ok</p>' }]);
  });

  it('tolerates a trailing semicolon and whitespace', () => {
    expect(parseJsonp('  cb([{"Status":0}]) ;  ')).toEqual([{ Status: 0 }]);
  });

  it('handles nested parens inside the JSON payload', () => {
    const body = 'cb([{"errHtml":"call (040) 123"}])';
    expect(parseJsonp(body)).toEqual([{ errHtml: 'call (040) 123' }]);
  });

  it('parses bare JSON with no callback wrapper', () => {
    expect(parseJsonp('{"message":"OK"}')).toEqual({ message: 'OK' });
  });

  it('returns the raw unwrapped text for a non-JSON body', () => {
    expect(parseJsonp('cb(OK)')).toBe('OK');
  });
});

describe('firstBookingResult', () => {
  it('takes the first element of an array', () => {
    expect(firstBookingResult([{ Status: 1 }, { Status: 0 }])).toEqual({ Status: 1 });
  });

  it('accepts a bare object', () => {
    expect(firstBookingResult({ Status: 1 })).toEqual({ Status: 1 });
  });

  it('returns null for a string or empty array', () => {
    expect(firstBookingResult('OK')).toBeNull();
    expect(firstBookingResult([])).toBeNull();
  });
});
