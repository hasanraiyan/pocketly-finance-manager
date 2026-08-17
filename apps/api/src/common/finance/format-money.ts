/**
 * Amounts are stored as integer minor units (e.g. 10050 = ₹100.50), so
 * anything shown to a person has to be scaled down first. Mirrors
 * `apps/web/src/lib/format.ts` -- keep the two in step.
 */
export function formatMoney(minorUnits: number, currency: string): string {
  const major = minorUnits / 100;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    // Unknown currency code -- fall back to a plain prefixed decimal.
    return `${currency} ${major.toFixed(2)}`;
  }
}

/**
 * Minor units as a bare decimal string, for machine-readable output like
 * CSV where a currency symbol and digit grouping would stop a spreadsheet
 * from reading the column as a number.
 */
export function toMajorUnits(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}
