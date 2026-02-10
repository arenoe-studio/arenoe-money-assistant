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
export function parseCurrency(input) {
    if (!input)
        return null;
    let cleanInput = input.toLowerCase().trim();
    // Remove RP prefix if present
    cleanInput = cleanInput.replace(/^rp\.?\s*/, '');
    let multiplier = 1;
    // Check suffixes
    if (cleanInput.endsWith('k') || cleanInput.endsWith('kb')) {
        multiplier = 1000;
        cleanInput = cleanInput.replace(/kb?$/, '');
    }
    else if (cleanInput.endsWith('rb') || cleanInput.endsWith('ribu')) {
        multiplier = 1000;
        cleanInput = cleanInput.replace(/r(b|ibu)$/, '');
    }
    cleanInput = cleanInput.trim();
    // Handle Indonesian thousands separator (period) vs decimal (comma)
    // Standardize: remove dots, replace comma with dot
    cleanInput = cleanInput.replace(/\./g, '').replace(/,/g, '.');
    if (!cleanInput || isNaN(Number(cleanInput))) {
        return null;
    }
    const value = currency(cleanInput, { precision: 0 }).value;
    return value * multiplier;
}
/**
 * Formats a number as IDR currency string
 * @param value The numeric value
 * @returns Formatted string (e.g. "Rp 15.000")
 */
export function formatCurrency(value) {
    return currency(value, {
        symbol: 'Rp ',
        decimal: ',',
        separator: '.',
        precision: 0
    }).format();
}
