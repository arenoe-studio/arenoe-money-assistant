
import currency from 'currency.js';

/**
 * Parses a string input into a numeric value representing Indonesian Rupiah.
 * Supports formats:
 * - 15k, 15kb -> 15000
 * - 15rb, 15ribu -> 15000
 * - 15000 -> 15000
 * - 15.000 -> 15000
 * 
 * @param input The string to parse
 * @returns The parsed number or null if invalid
 */
export function parseCurrency(input: string): number | null {
  if (!input) return null;

  // 1. Basic cleanup: remove currency symbol, trim
  let cleanInput = input.toLowerCase().trim()
    .replace(/^rp\.?\s*/, '')
    .replace(/\s+/g, ' '); // normalize spaces

  // 2. check for suffixes
  const suffixes = ['jt', 'juta', 'm', 'mn', 'rb', 'ribu', 'k', 'kb', 'ratus', 'rat'];
  const hasSuffix = suffixes.some(s => cleanInput.includes(s));

  if (!hasSuffix) {
      // Standard number parsing (IDR format: 1.000.000,00)
      // Remove dots (thousand separators), replace comma with dot (decimal).
      const standardClean = cleanInput.replace(/\./g, '').replace(/,/g, '.');
      const val = parseFloat(standardClean);
      return !isNaN(val) && val > 0 ? val : null;
  }

  // 3. Complex Parsing (Chunk-based)
  let total = 0;
  let currentBuffer = 0;
  let hasMatch = false;

  const regex = /(\d+(?:[.,]\d+)?)\s*([a-z]*)/g;
  
  let match;
  while ((match = regex.exec(cleanInput)) !== null) {
      const numStr = match[1];
      const suffix = match[2];

      if (!numStr) continue;

      // Normalize number
      const val = parseFloat(numStr.replace(',', '.'));
      if (isNaN(val)) continue;

      hasMatch = true;

      if (['jt', 'juta', 'm', 'mn'].includes(suffix)) {
          total += (currentBuffer + val) * 1000000;
          currentBuffer = 0;
      } 
      else if (['rb', 'ribu', 'k', 'kb'].includes(suffix)) {
          total += (currentBuffer + val) * 1000;
          currentBuffer = 0;
      }
      else if (['ratus', 'rat'].includes(suffix)) {
          currentBuffer += val * 100;
      }
      else {
          currentBuffer += val;
      }
  }

  total += currentBuffer;

  return hasMatch && total > 0 ? total : null;
}

/**
 * Formats a number as IDR currency string
 * @param value The numeric value
 * @returns Formatted string (e.g. "Rp 15.000")
 */
export function formatCurrency(value: number): string {
  return currency(value, {
    symbol: 'Rp ',
    decimal: ',',
    separator: '.',
    precision: 0
  }).format();
}
