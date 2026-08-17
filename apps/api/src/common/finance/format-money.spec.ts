import { formatMoney, toMajorUnits } from './format-money';

describe('formatMoney', () => {
  it('scales minor units down to major units', () => {
    // The bug this guards: 155180 paise is ₹1,551.80, not ₹1,55,180.00.
    expect(formatMoney(155_180, 'INR')).toBe('₹1,551.80');
  });

  it('keeps two decimal places for round amounts', () => {
    expect(formatMoney(500_000, 'INR')).toBe('₹5,000.00');
  });

  it('handles sub-rupee amounts', () => {
    expect(formatMoney(10, 'INR')).toBe('₹0.10');
  });

  it('handles zero', () => {
    expect(formatMoney(0, 'INR')).toBe('₹0.00');
  });

  it('formats negative amounts', () => {
    expect(formatMoney(-2_500, 'INR')).toBe('-₹25.00');
  });

  it('falls back to a prefixed decimal for an unknown currency code', () => {
    expect(formatMoney(155_180, 'NOTACURRENCY')).toBe('NOTACURRENCY 1551.80');
  });
});

describe('toMajorUnits', () => {
  it('renders a bare decimal with no grouping or symbol', () => {
    expect(toMajorUnits(155_180)).toBe('1551.80');
  });

  it('always keeps two decimal places', () => {
    expect(toMajorUnits(500_000)).toBe('5000.00');
    expect(toMajorUnits(0)).toBe('0.00');
  });
});
