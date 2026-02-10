import { extractTransaction } from './ai';
import { parseCurrency } from '../utils/currency';
import { logger } from '../utils/logger';
/**
 * Regex patterns for local parsing
 */
const PATTERNS = {
    // Price: 15k, 15rb, 15ribu, 15.000, 15000
    // Matches number followed by k/rb/ribu or end of string/whitespace
    price: /(\d+(?:[.,]\d+)?)\s*(k(?:b)?|r(?:b|ibu)?|(?=\s|$))/i,
    // Payment: Cash, OVO, GoPay, DANA, etc.
    // Look for keywords like "pakai", "bayar", "via" followed by payment method
    payment: /(?:pakai|bayar|pake|via)\s+(cash|ovo|gopay|dana|shopeepay|bca|mandiri)/i,
    // Merchant: after "di" keyword
    merchant: /di\s+([a-z0-9\s"&.,'-]+?)(?:\s+(?:pakai|bayar|pake|via)|\s*$)/i,
    // Items: usually at the start, before price
    // This is the hardest to capture with regex reliably, so we use a heuristic
    items: /^(.+?)\s+(?=\d+(?:[.,]\d+)?\s*(?:k|rb|ribu|\d))/i
};
/**
 * Parse a message using a hybrid approach:
 * 1. Try regex first (fast, free)
 * 2. If incomplete, use AI (slower, paid)
 * 3. Merge results
 */
export async function parseMessage(message) {
    // 1. Regex Parsing
    const regexResult = parseWithRegex(message);
    logger.info('Regex parsing result', { result: regexResult });
    // If regex found all fields, return immediately (Fast Path)
    if (isComplete(regexResult)) {
        return regexResult;
    }
    // 2. AI Parsing (Fallback for complex/natural language)
    try {
        const aiResult = await extractTransaction(message);
        logger.info('AI parsing result', { result: aiResult });
        // 3. Merge Strategies
        // Prefer regex for Price (more deterministic)
        // Prefer AI for Items and Merchant (better context understanding)
        // Payment is usually reliable in both, but regex might allow typos if we didn't use strict enum
        const merged = {
            items: regexResult.items || aiResult.items || undefined,
            harga: regexResult.harga || aiResult.harga || undefined,
            namaToko: regexResult.namaToko || aiResult.namaToko || undefined,
            metodePembayaran: regexResult.metodePembayaran || aiResult.metodePembayaran || undefined,
            tanggal: undefined // Date usually defaults to now, or parsed separately if needed
        };
        return removeNulls(merged);
    }
    catch (error) {
        logger.warn('AI parsing failed, returning regex result only', { error });
        return removeNulls(regexResult);
    }
}
/**
 * Extract data using Regex patterns
 */
function parseWithRegex(message) {
    const result = {};
    // Extract Price
    // We need to match the number part and pass to parseCurrency utility
    const priceMatch = message.match(PATTERNS.price);
    if (priceMatch) {
        // Reconstruct the matched string (e.g. "15k") to pass to utility
        const priceStr = priceMatch[0].trim();
        const priceVal = parseCurrency(priceStr);
        if (priceVal !== null) {
            result.harga = priceVal;
        }
    }
    // Extract Payment
    const paymentMatch = message.match(PATTERNS.payment);
    if (paymentMatch) {
        // Normalize case to Title Case or match enum
        const method = paymentMatch[1];
        // Simple normalization: "ovo" -> "OVO", "cash" -> "Cash"
        // For now dealing with case-insensitivity in code is better handled by exact match to Schema enum if possible
        // But since Zod schema expects specific enum values, we should try to map it
        result.metodePembayaran = normalizePaymentMethod(method);
    }
    // Extract Merchant
    const merchantMatch = message.match(PATTERNS.merchant);
    if (merchantMatch) {
        result.namaToko = merchantMatch[1].trim();
    }
    // Extract Items
    const itemsMatch = message.match(PATTERNS.items);
    if (itemsMatch) {
        result.items = itemsMatch[1].trim();
    }
    return result;
}
/**
 * Helper to normalize payment method string to Schema Enum
 */
function normalizePaymentMethod(input) {
    const map = {
        'cash': 'Cash',
        'tunai': 'Cash',
        'ovo': 'OVO',
        'gopay': 'GoPay',
        'dana': 'DANA',
        'shopeepay': 'ShopeePay',
        'shopee': 'ShopeePay',
        'bca': 'BCA',
        'mandiri': 'Mandiri'
    };
    return map[input.toLowerCase()] || input; // Return original if not found (validation will catch it)
}
function isComplete(data) {
    return !!(data.items && data.harga && data.namaToko && data.metodePembayaran);
}
function removeNulls(data) {
    const clean = {};
    for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
            clean[key] = data[key];
        }
    }
    return clean;
}
