import {
  nextOccurrenceAfter,
  occurrenceAt,
  occurrencesBetween,
} from './next-occurrence';

const UTC = 'UTC';
const KOLKATA = 'Asia/Kolkata';

describe('occurrenceAt', () => {
  it('advances by whole periods from the start date', () => {
    const start = new Date('2026-01-10T00:00:00Z');

    expect(occurrenceAt(start, 'daily', 1, 5, UTC).toISOString()).toBe(
      '2026-01-15T00:00:00.000Z',
    );
    expect(occurrenceAt(start, 'weekly', 1, 2, UTC).toISOString()).toBe(
      '2026-01-24T00:00:00.000Z',
    );
    expect(occurrenceAt(start, 'monthly', 1, 3, UTC).toISOString()).toBe(
      '2026-04-10T00:00:00.000Z',
    );
    expect(occurrenceAt(start, 'yearly', 1, 1, UTC).toISOString()).toBe(
      '2027-01-10T00:00:00.000Z',
    );
  });

  it('honours an interval greater than one', () => {
    const start = new Date('2026-01-10T00:00:00Z');
    // every 3 months, second occurrence
    expect(occurrenceAt(start, 'monthly', 3, 2, UTC).toISOString()).toBe(
      '2026-07-10T00:00:00.000Z',
    );
  });

  /**
   * The regression this whole module exists for. Stepping occurrence-to-
   * occurrence would clamp Jan 31 -> Feb 28 and then stay on the 28th for
   * good; anchoring on startDate recovers the 31st in every long month.
   */
  it('does not drift when the start date is a month-end', () => {
    const start = new Date('2026-01-31T00:00:00Z');

    const months = [1, 2, 3, 4, 5].map((n) =>
      occurrenceAt(start, 'monthly', 1, n, UTC).toISOString().slice(0, 10),
    );

    expect(months).toEqual([
      '2026-02-28', // clamped -- February has no 31st
      '2026-03-31', // recovered, not 2026-03-28
      '2026-04-30', // clamped -- April has 30 days
      '2026-05-31', // recovered
      '2026-06-30',
    ]);
  });

  it('handles Feb 29 on a leap year start', () => {
    const start = new Date('2028-02-29T00:00:00Z');
    expect(
      occurrenceAt(start, 'yearly', 1, 1, UTC).toISOString().slice(0, 10),
    ).toBe('2029-02-28');
    expect(
      occurrenceAt(start, 'yearly', 1, 4, UTC).toISOString().slice(0, 10),
    ).toBe('2032-02-29');
  });

  it('advances by local days, so the wall-clock time is stable across a DST shift', () => {
    // 2026-03-08 is a US DST spring-forward. A naive +24h would move a
    // 09:00 local rule to 10:00 local.
    const start = new Date('2026-03-06T14:00:00Z'); // 09:00 America/New_York
    const next = occurrenceAt(start, 'daily', 1, 3, 'America/New_York');

    expect(next.toISOString()).toBe('2026-03-09T13:00:00.000Z'); // still 09:00 local
  });

  it('computes month boundaries in the user timezone, not UTC', () => {
    // 2026-01-31T19:00Z is already 2026-02-01 00:30 local in Kolkata (UTC+5:30),
    // so the rule anchors on Feb 1 -- not Jan 31 as a UTC reading would have it.
    const start = new Date('2026-01-31T19:00:00Z');
    const next = occurrenceAt(start, 'monthly', 1, 1, KOLKATA);

    // local Mar 1 00:30 -> 2026-02-28T19:00Z
    expect(next.toISOString()).toBe('2026-02-28T19:00:00.000Z');
  });
});

describe('nextOccurrenceAfter', () => {
  const rule = {
    startDate: new Date('2026-01-01T00:00:00Z'),
    frequency: 'monthly' as const,
    interval: 1,
    timezone: UTC,
  };

  it('returns the start date for a rule that has not started yet', () => {
    const future = { ...rule, startDate: new Date('2026-06-01T00:00:00Z') };
    expect(
      nextOccurrenceAfter(future, new Date('2026-01-15T00:00:00Z')),
    ).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('returns the following occurrence mid-schedule', () => {
    expect(nextOccurrenceAfter(rule, new Date('2026-03-15T00:00:00Z'))).toEqual(
      new Date('2026-04-01T00:00:00Z'),
    );
  });

  it('is strictly after -- landing exactly on an occurrence returns the next one', () => {
    expect(nextOccurrenceAfter(rule, new Date('2026-04-01T00:00:00Z'))).toEqual(
      new Date('2026-05-01T00:00:00Z'),
    );
  });

  it('returns null once the schedule passes endDate', () => {
    const ending = { ...rule, endDate: new Date('2026-03-31T00:00:00Z') };
    expect(
      nextOccurrenceAfter(ending, new Date('2026-03-15T00:00:00Z')),
    ).toBeNull();
  });

  it('returns null for a not-yet-started rule whose endDate already passed', () => {
    const ending = {
      ...rule,
      startDate: new Date('2026-06-01T00:00:00Z'),
      endDate: new Date('2026-05-01T00:00:00Z'),
    };
    expect(
      nextOccurrenceAfter(ending, new Date('2026-01-01T00:00:00Z')),
    ).toBeNull();
  });
});

describe('occurrencesBetween', () => {
  const daily = {
    startDate: new Date('2026-01-01T00:00:00Z'),
    frequency: 'daily' as const,
    interval: 1,
    timezone: UTC,
  };

  it('returns every missed occurrence with its own original date', () => {
    const missed = occurrencesBetween(
      daily,
      new Date('2026-01-10T00:00:00Z'),
      new Date('2026-01-13T00:00:00Z'),
    );

    expect(missed.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-11',
      '2026-01-12',
      '2026-01-13',
    ]);
  });

  it('returns an empty list when nothing is due', () => {
    expect(
      occurrencesBetween(
        daily,
        new Date('2026-01-10T00:00:00Z'),
        new Date('2026-01-10T12:00:00Z'),
      ),
    ).toEqual([]);
  });

  it('caps a pathological backlog rather than posting thousands of records', () => {
    const dormantSince2020 = {
      ...daily,
      startDate: new Date('2020-01-01T00:00:00Z'),
    };

    const caught = occurrencesBetween(
      dormantSince2020,
      new Date('2020-01-01T00:00:00Z'),
      new Date('2026-01-01T00:00:00Z'),
    );

    expect(caught).toHaveLength(30);
  });

  it('stops at endDate even when the window extends past it', () => {
    const ending = { ...daily, endDate: new Date('2026-01-12T00:00:00Z') };

    const caught = occurrencesBetween(
      ending,
      new Date('2026-01-10T00:00:00Z'),
      new Date('2026-01-20T00:00:00Z'),
    );

    expect(caught.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-11',
      '2026-01-12',
    ]);
  });
});
