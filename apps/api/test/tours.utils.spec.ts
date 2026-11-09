import { createReference, normalizePhone } from '../src/tours/tours.utils';

describe('tour utilities', () => {
  it('normalizes common phone formatting without changing the country prefix', () => {
    expect(normalizePhone(' +254 712-345-678 ')).toBe('+254712345678');
  });

  it('creates a prefixed uppercase reference', () => {
    expect(createReference('TG')).toMatch(/^TG[A-F0-9]{8}$/);
  });
});
