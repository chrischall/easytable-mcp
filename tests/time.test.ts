import { describe, it, expect } from 'vitest';
import { minuteOfDayToHHMM, hhmmToMinuteOfDay } from '../src/time.js';

describe('minuteOfDayToHHMM', () => {
  it('converts minute-of-day to HH:MM', () => {
    expect(minuteOfDayToHHMM(1035)).toBe('17:15');
    expect(minuteOfDayToHHMM(0)).toBe('00:00');
    expect(minuteOfDayToHHMM(1439)).toBe('23:59');
  });

  it('throws on out-of-range values', () => {
    expect(() => minuteOfDayToHHMM(1440)).toThrow();
    expect(() => minuteOfDayToHHMM(-1)).toThrow();
  });
});

describe('hhmmToMinuteOfDay', () => {
  it('converts HH:MM to minute-of-day', () => {
    expect(hhmmToMinuteOfDay('17:15')).toBe(1035);
    expect(hhmmToMinuteOfDay('00:00')).toBe(0);
    expect(hhmmToMinuteOfDay('9:05')).toBe(545);
  });

  it('round-trips', () => {
    for (const m of [0, 545, 1035, 1439]) {
      expect(hhmmToMinuteOfDay(minuteOfDayToHHMM(m))).toBe(m);
    }
  });

  it('throws on malformed or out-of-range input', () => {
    expect(() => hhmmToMinuteOfDay('nope')).toThrow();
    expect(() => hhmmToMinuteOfDay('25:00')).toThrow();
    expect(() => hhmmToMinuteOfDay('12:60')).toThrow();
  });
});
