import { toZonedTime } from 'date-fns-tz';
import { getPeriodWindow } from './get-period-window';

const TIMEZONE = 'Asia/Kolkata';
const REFERENCE = new Date('2026-08-16T10:00:00.000Z');

describe('getPeriodWindow', () => {
  it('resolves the monthly window to the local calendar month', () => {
    const { start, end } = getPeriodWindow('monthly', TIMEZONE, REFERENCE);
    const zonedStart = toZonedTime(start, TIMEZONE);
    const zonedEnd = toZonedTime(end, TIMEZONE);

    expect(zonedStart.getDate()).toBe(1);
    expect(zonedStart.getMonth()).toBe(7); // August, 0-indexed
    expect(zonedStart.getHours()).toBe(0);
    expect(zonedEnd.getDate()).toBe(31);
    expect(zonedEnd.getMonth()).toBe(7);
    expect(zonedEnd.getHours()).toBe(23);
  });

  it('resolves the weekly window to a Monday-Sunday week', () => {
    const { start, end } = getPeriodWindow('weekly', TIMEZONE, REFERENCE);
    const zonedStart = toZonedTime(start, TIMEZONE);
    const zonedEnd = toZonedTime(end, TIMEZONE);

    expect(zonedStart.getDay()).toBe(1); // Monday
    expect(zonedEnd.getDay()).toBe(0); // Sunday
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000 - 1);
  });

  it('resolves the yearly window to the local calendar year', () => {
    const { start, end } = getPeriodWindow('yearly', TIMEZONE, REFERENCE);
    const zonedStart = toZonedTime(start, TIMEZONE);
    const zonedEnd = toZonedTime(end, TIMEZONE);

    expect(zonedStart.getMonth()).toBe(0);
    expect(zonedStart.getDate()).toBe(1);
    expect(zonedEnd.getMonth()).toBe(11);
    expect(zonedEnd.getDate()).toBe(31);
  });

  it('shifts the UTC boundary to account for the timezone offset', () => {
    const { start } = getPeriodWindow('monthly', TIMEZONE, REFERENCE);
    // Aug 1 00:00 IST (UTC+5:30) is July 31 18:30 UTC.
    expect(start.toISOString()).toBe('2026-07-31T18:30:00.000Z');
  });
});
