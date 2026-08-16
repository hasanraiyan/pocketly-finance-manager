export interface BudgetStatusInputs {
  amount: number;
  spent: number;
}

export interface BudgetStatus {
  amount: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
}

export function calculateBudgetStatus({
  amount,
  spent,
}: BudgetStatusInputs): BudgetStatus {
  return {
    amount,
    spent,
    remaining: amount - spent,
    percentageUsed: amount === 0 ? 0 : Math.round((spent / amount) * 100),
  };
}
