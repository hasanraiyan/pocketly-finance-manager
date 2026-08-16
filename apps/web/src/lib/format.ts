/** Amounts are stored as integer minor units (e.g. 10050 = ₹100.50). */
export function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
  }).format(minorUnits / 100);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
