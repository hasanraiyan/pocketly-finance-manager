import { calculateBalance } from './calculate-balance';

describe('calculateBalance', () => {
  it('matches the SRS worked example', () => {
    // Initial 10,000 + income 5,000 - expense 2,000 + transferIn 1,000 - transferOut 500 = 13,500
    expect(
      calculateBalance({
        initialBalance: 10_000,
        income: 5_000,
        expense: 2_000,
        transfersIn: 1_000,
        transfersOut: 500,
      }),
    ).toBe(13_500);
  });

  it('handles an account with no activity', () => {
    expect(
      calculateBalance({
        initialBalance: 500,
        income: 0,
        expense: 0,
        transfersIn: 0,
        transfersOut: 0,
      }),
    ).toBe(500);
  });

  it('allows a negative balance', () => {
    expect(
      calculateBalance({
        initialBalance: 0,
        income: 0,
        expense: 100,
        transfersIn: 0,
        transfersOut: 0,
      }),
    ).toBe(-100);
  });
});
