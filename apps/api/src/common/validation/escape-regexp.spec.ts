import { escapeRegExp } from './escape-regexp';

describe('escapeRegExp', () => {
  it('escapes regex metacharacters so search input cannot inject a pattern', () => {
    const malicious = '.*';
    const escaped = escapeRegExp(malicious);
    expect(new RegExp(escaped).test('anything')).toBe(false);
    expect(new RegExp(escaped).test('.*')).toBe(true);
  });

  it('leaves plain text unchanged', () => {
    expect(escapeRegExp('dinner with friends')).toBe('dinner with friends');
  });
});
