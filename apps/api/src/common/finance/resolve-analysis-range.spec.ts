import { BadRequestException } from '@nestjs/common';
import { resolveAnalysisRange } from './resolve-analysis-range';

const TIMEZONE = 'Asia/Kolkata';
const REFERENCE = new Date('2026-08-16T10:00:00.000Z'); // Aug 16 2026, 15:30 IST

describe('resolveAnalysisRange', () => {
  it('resolves "7d" as a 7-day window ending on the reference day', () => {
    const { start, end } = resolveAnalysisRange(
      '7d',
      TIMEZONE,
      undefined,
      REFERENCE,
    );
    expect(end.getTime() - start.getTime()).toBeLessThan(
      7 * 24 * 60 * 60 * 1000,
    );
    expect(end.getTime()).toBeGreaterThan(REFERENCE.getTime());
  });

  it('resolves "this_month" to the current local month', () => {
    const { start } = resolveAnalysisRange(
      'this_month',
      TIMEZONE,
      undefined,
      REFERENCE,
    );
    expect(start.toISOString()).toBe('2026-07-31T18:30:00.000Z');
  });

  it('resolves "last_month" to the previous local month', () => {
    const { start, end } = resolveAnalysisRange(
      'last_month',
      TIMEZONE,
      undefined,
      REFERENCE,
    );
    expect(start.toISOString()).toBe('2026-06-30T18:30:00.000Z');
    expect(end.toISOString()).toBe('2026-07-31T18:29:59.999Z');
  });

  it('passes custom from/to through untouched', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-31T23:59:59.999Z');
    const range = resolveAnalysisRange(
      'custom',
      TIMEZONE,
      { from, to },
      REFERENCE,
    );
    expect(range).toEqual({ start: from, end: to });
  });

  it('rejects a custom period missing from/to', () => {
    expect(() =>
      resolveAnalysisRange('custom', TIMEZONE, {}, REFERENCE),
    ).toThrow(BadRequestException);
  });
});
