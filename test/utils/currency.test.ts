
import { describe, it, expect } from 'vitest';
import { parseCurrency, formatCurrency } from '../../src/utils/currency';

describe('Currency Utility', () => {
  describe('parseCurrency', () => {
    it('should parse "k" suffix correctly', () => {
      expect(parseCurrency('15k')).toBe(15000);
      expect(parseCurrency('100K')).toBe(100000);
      expect(parseCurrency('2.5k')).toBe(2500);
    });

    it('should parse "rb" and "ribu" suffix correctly', () => {
      expect(parseCurrency('15rb')).toBe(15000);
      expect(parseCurrency('50ribu')).toBe(50000);
      expect(parseCurrency('100 RIBU')).toBe(100000);
    });

    it('should parse standard numbers correctly', () => {
      expect(parseCurrency('15000')).toBe(15000);
      expect(parseCurrency('15.000')).toBe(15000); // Standard IDR format
      expect(parseCurrency('15,000')).toBe(15000); // Comma as thousands in some locales, we treat flexible
      expect(parseCurrency('Rp 15.000')).toBe(15000);
    });

    it('should return null for invalid inputs', () => {
      expect(parseCurrency('abc')).toBe(null);
      expect(parseCurrency('')).toBe(null);
      // expect(parseCurrency(null as any)).toBe(null);
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers to IDR string', () => {
      expect(formatCurrency(15000)).toBe('Rp 15.000');
      expect(formatCurrency(1000000)).toBe('Rp 1.000.000');
      expect(formatCurrency(0)).toBe('Rp 0');
    });
  });
});
