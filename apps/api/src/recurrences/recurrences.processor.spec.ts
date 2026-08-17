import { Model, Types } from 'mongoose';
import { TransactionsService } from '../transactions/transactions.service';
import { RecurrencesProcessor } from './recurrences.processor';
import { Recurrence, RecurrenceDocument } from './schemas/recurrence.schema';

type CreateCall = [
  Types.ObjectId,
  { amount: number; date: Date },
  { recurrenceId: Types.ObjectId; occurrenceDate: Date },
];

/** Returns the document and its save mock separately, so assertions never
 *  reach through the typed document for a jest mock. */
function makeRule(overrides: Partial<Recurrence> = {}) {
  const save = jest.fn().mockResolvedValue(undefined);
  const rule = {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    type: 'expense' as const,
    amount: 50000,
    description: 'Rent',
    accountId: new Types.ObjectId(),
    frequency: 'monthly' as const,
    interval: 1,
    startDate: new Date('2026-01-01T00:00:00Z'),
    endDate: null,
    timezone: 'UTC',
    nextRunAt: new Date('2026-02-01T00:00:00Z'),
    lastRunAt: null,
    paused: false,
    deletedAt: null,
    save,
    ...overrides,
  } as unknown as RecurrenceDocument;

  return { rule, save };
}

function duplicateKeyError() {
  return Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
}

describe('RecurrencesProcessor', () => {
  let transactionsService: { create: jest.Mock };
  let recurrenceModel: { find: jest.Mock };
  let processor: RecurrencesProcessor;
  let dueRules: RecurrenceDocument[];

  beforeEach(() => {
    // Pin "now" just after the default rule's due date. Without this the
    // worker correctly catches up every occurrence between the due date and
    // the real clock, which is right behaviour but makes counts meaningless.
    jest.useFakeTimers().setSystemTime(new Date('2026-02-01T06:00:00Z'));
    dueRules = [];
    transactionsService = { create: jest.fn().mockResolvedValue({}) };
    recurrenceModel = {
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockImplementation(() => Promise.resolve(dueRules)),
      }),
    };
    processor = new RecurrencesProcessor(
      recurrenceModel as unknown as Model<RecurrenceDocument>,
      transactionsService as unknown as TransactionsService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function createCalls(): CreateCall[] {
    return transactionsService.create.mock.calls as CreateCall[];
  }

  it('only looks at rules that are due, live and not paused', async () => {
    await processor.process();

    const [[filter]] = recurrenceModel.find.mock.calls as Array<
      [{ paused: boolean; deletedAt: null; nextRunAt: { $ne: null } }]
    >;
    expect(filter.paused).toBe(false);
    expect(filter.deletedAt).toBeNull();
    expect(filter.nextRunAt.$ne).toBeNull();
  });

  it('posts the due occurrence and advances the schedule', async () => {
    const { rule, save } = makeRule();
    dueRules = [rule];

    const result = await processor.process();

    expect(result.posted).toBe(1);
    expect(transactionsService.create).toHaveBeenCalledTimes(1);

    const [userId, dto, origin] = createCalls()[0];
    expect(userId).toBe(rule.userId);
    expect(dto.amount).toBe(50000);
    expect(origin.recurrenceId).toBe(rule._id);

    // Schedule moved on to March, and lastRunAt records February.
    expect(rule.nextRunAt?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(rule.lastRunAt?.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(save).toHaveBeenCalled();
  });

  /**
   * The double-posting guard. The unique (recurrenceId, occurrenceDate)
   * index is what actually prevents it; this asserts the worker treats the
   * resulting error as "already done" rather than crashing the run or
   * retrying the same occurrence forever.
   */
  it('treats a duplicate-key error as already-posted, not as a failure', async () => {
    const { rule, save } = makeRule();
    dueRules = [rule];
    transactionsService.create.mockRejectedValueOnce(duplicateKeyError());

    const result = await processor.process();

    expect(result.posted).toBe(0);
    expect(rule.nextRunAt?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(save).toHaveBeenCalled();
  });

  it('creates every missed occurrence with its own original date', async () => {
    // Down since the 1st; three daily occurrences owed by the 4th.
    jest.setSystemTime(new Date('2026-01-04T06:00:00Z'));

    const { rule } = makeRule({
      frequency: 'daily',
      startDate: new Date('2026-01-01T00:00:00Z'),
      nextRunAt: new Date('2026-01-02T00:00:00Z'),
    });
    dueRules = [rule];

    const result = await processor.process();

    expect(result.posted).toBe(3);
    const dates = createCalls().map(([, , origin]) => origin.occurrenceDate);
    expect(dates.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
  });

  it('stops scheduling once the rule passes its endDate', async () => {
    const { rule } = makeRule({ endDate: new Date('2026-02-15T00:00:00Z') });
    dueRules = [rule];

    await processor.process();

    // March 1 is past endDate, so there is nothing further to run.
    expect(rule.nextRunAt).toBeNull();
  });

  it('keeps going when one rule throws', async () => {
    const broken = makeRule();
    const healthy = makeRule();
    dueRules = [broken.rule, healthy.rule];
    transactionsService.create
      .mockRejectedValueOnce(new Error('account vanished'))
      .mockResolvedValueOnce({});

    const result = await processor.process();

    expect(result.posted).toBe(1);
    expect(healthy.save).toHaveBeenCalled();
  });

  it('posts nothing when no rule is due', async () => {
    const result = await processor.process();

    expect(result).toEqual({ posted: 0, rules: 0 });
    expect(transactionsService.create).not.toHaveBeenCalled();
  });
});
