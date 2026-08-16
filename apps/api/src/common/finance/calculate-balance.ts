export interface BalanceInputs {
  initialBalance: number;
  income: number;
  expense: number;
  transfersIn: number;
  transfersOut: number;
}

export function calculateBalance({
  initialBalance,
  income,
  expense,
  transfersIn,
  transfersOut,
}: BalanceInputs): number {
  return initialBalance + income - expense + transfersIn - transfersOut;
}
