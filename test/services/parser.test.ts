
import { describe, it, expect, vi } from 'vitest';
import { parseMessage } from '../../src/services/parser';

// Mock AI service to avoid API calls during tests
vi.mock('../../src/services/ai', () => ({
  extractTransaction: vi.fn().mockResolvedValue({
    items: 'AI Item',
    harga: 999,
    namaToko: 'AI Shop',
    metodePembayaran: 'Cash'
  })
}));

describe('Parser Service', () => {
  describe('parseMessage (Regex Parsing)', () => {
    
    it('should parse "items price merchant payment" format', async () => {
      const input = 'Nasi Goreng 15k di Warteg Bahari pakai Cash';
      const result = await parseMessage(input);
      
      expect(result.items).toBe('Nasi Goreng');
      expect(result.harga).toBe(15000);
      expect(result.namaToko).toBe('Warteg Bahari');
      expect(result.metodePembayaran).toBe('Cash');
    });

    it('should parse "items price payment" (missing merchant)', async () => {
      const input = 'Pulsa 50rb pakai OVO';
      const result = await parseMessage(input);
      
      expect(result.items).toBe('Pulsa');
      expect(result.harga).toBe(50000);
      expect(result.metodePembayaran).toBe('OVO');
      // Merchant might be undefined or 'AI Shop' depending on if regex failed completely or just partially
      // In current logic, regex extracts partials. If partial, it merged with AI.
      // Since we mocked AI to return full data, "AI Shop" would fill the gap if regex missed it.
      // But let's check what Regex ALONE would capture if we didn't have AI fallback for this test?
      // Actually the function calls AI if !isComplete.
      // In this input, Regex misses Merchant. So isComplete = false.
      // So it calls AI.
      // Result will have AI Shop.
      expect(result.namaToko).toBe('AI Shop'); 
    });

    it('should parse simple "items price" format', async () => {
      const input = 'Kopi 20.000';
      const result = await parseMessage(input);
      
      expect(result.harga).toBe(20000);
      expect(result.items).toBe('Kopi');
    });
    
    it('should handle case insensitivity via regex', async () => {
      const input = 'beli sate 25KB di sate khas senayan via gopay';
      const result = await parseMessage(input);
      
      expect(result.harga).toBe(25000);
      expect(result.namaToko).toBe('sate khas senayan');
      expect(result.metodePembayaran).toBe('GoPay');
    });

  });
});
