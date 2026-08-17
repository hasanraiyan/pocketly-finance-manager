import { exportQuerySchema } from './export.dto';

describe('exportQuerySchema', () => {
  it('accepts all_time, which the export dialog offers', () => {
    // Regression: the UI listed "All time" while the schema only allowed the
    // analysis periods, so choosing it failed validation with a 400.
    const result = exportQuerySchema.safeParse({ period: 'all_time' });
    expect(result.success).toBe(true);
  });

  it('still accepts every analysis period', () => {
    for (const period of [
      '7d',
      'this_month',
      'last_month',
      '3m',
      '6m',
      'this_year',
      'custom',
    ]) {
      expect(exportQuerySchema.safeParse({ period }).success).toBe(true);
    }
  });

  it('defaults to this_month when no period is given', () => {
    const result = exportQuerySchema.parse({});
    expect(result.period).toBe('this_month');
  });

  it('rejects an unknown period', () => {
    expect(exportQuerySchema.safeParse({ period: 'last_decade' }).success).toBe(
      false,
    );
  });

  it('accepts the local datetimes the custom range sends', () => {
    // Regression: the dialog used to send bare "2026-08-01" from a date
    // input, which is not a valid ISO datetime.
    const result = exportQuerySchema.safeParse({
      period: 'custom',
      from: '2026-08-01T00:00:00',
      to: '2026-08-31T23:59:59',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBeInstanceOf(Date);
      expect(result.data.to).toBeInstanceOf(Date);
    }
  });

  it('rejects a bare date with no time component', () => {
    expect(
      exportQuerySchema.safeParse({ period: 'custom', from: '2026-08-01' })
        .success,
    ).toBe(false);
  });
});
