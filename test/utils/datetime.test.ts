
import { describe, it, expect } from 'vitest';
import { parseDate, formatDate, TIMEZONE } from '../../src/utils/datetime';
import { DateTime } from 'luxon';

describe('Datetime Utility', () => {
  const currentYear = DateTime.now().setZone(TIMEZONE).year;

  describe('parseDate', () => {
    it('should parse "dd MMMM yyyy"', () => {
      const result = parseDate('15 Januari 2026');
      expect(result).not.toBeNull();
      expect(result?.year).toBe(2026);
      expect(result?.month).toBe(1); // January is 1 in Luxon
      expect(result?.day).toBe(15);
    });

    it('should parse "dd/MM/yyyy"', () => {
      const result = parseDate('17/08/1945');
      expect(result).not.toBeNull();
      expect(result?.year).toBe(1945);
      expect(result?.month).toBe(8);
      expect(result?.day).toBe(17);
    });
    
    it('should return null for invalid date', () => {
      expect(parseDate('invalid date')).toBe(null);
      expect(parseDate('32/01/2026')).toBe(null);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly in Indonesian', () => {
        // Fixed date for testing
        const date = DateTime.fromObject({ year: 2026, month: 1, day: 1 }, { zone: TIMEZONE });
        const formatted = formatDate(date);
        // 1 Jan 2026 is a Thursday (Kamis)
        expect(formatted).toContain('Kamis');
        expect(formatted).toContain('01 Januari 2026');
    });
  });
});
