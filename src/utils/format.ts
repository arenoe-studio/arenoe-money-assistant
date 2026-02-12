
import { DateTime } from 'luxon';

/**
 * Auto-categorize item based on name (Ported from userdocs/utils.js)
 */
export function autoCategory(name: string | null | undefined): string {
  if (!name) return "General";

  const n = name.toLowerCase();

  // Food
  if (/(ayam|nasi|bakso|mie|kopi|teh|roti|makan|minum|goreng|bakar|geprek|es|warung|soto|sate)/.test(n))
    return "Food";

  // Stationery
  if (/(bolpoin|pulpen|kertas|buku|alat tulis|penghapus|penggaris|pensil)/.test(n))
    return "Stationery";

  // Transport
  if (/(grab|gojek|transport|parkir|tol|ojek|taxi|bensin|pertalite|pertamax)/.test(n))
    return "Transport";

  // Shopping
  if (/(indomaret|alfamart|supermarket|groceries|belanja|sabun|shampoo|odol)/.test(n))
    return "Shopping";

  return "General";
}

/**
 * Format date to Indonesian format: "16 Januari 2025" or "16 Januari 2025 (14:30 WIB)"
 */
export function formatDate(date: Date | undefined, includeTime: boolean = false): string {
  const dt = date ? DateTime.fromJSDate(date) : DateTime.now();

  // Set locale to id-ID
  const local = dt.setLocale('id-ID').setZone('Asia/Jakarta');

  if (includeTime) {
    return local.toFormat("dd MMMM yyyy (HH:mm) 'WIB'");
  }

  return local.toFormat('dd MMMM yyyy');
}

/**
 * Parse date string from AI Vision/Parser as WIB timezone
 * AI returns strings like "2026-02-12 15:46" which should be treated as WIB, not UTC
 * Without this, new Date() treats it as UTC and adds 7 hours when displaying in WIB
 */
export function parseDateAsWIB(dateString: string): Date {
  // Parse the string explicitly in Asia/Jakarta timezone
  const dt = DateTime.fromFormat(dateString, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Jakarta' });

  if (!dt.isValid) {
    // Fallback: try ISO format
    const isoDate = DateTime.fromISO(dateString, { zone: 'Asia/Jakarta' });
    if (isoDate.isValid) {
      return isoDate.toJSDate();
    }
    // Last resort: use current time
    return new Date();
  }

  return dt.toJSDate();
}

/**
 * Convert string to Title Case (Ported from userdocs/utils.js)
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
