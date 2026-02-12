
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

  if (date) {
    console.log('[formatDate] Input Date:', date.toISOString(), 'Local:', date.toString());
    console.log('[formatDate] DateTime after fromJSDate:', dt.toISO(), 'Zone:', dt.zoneName);
  }

  // Set locale to id-ID
  const local = dt.setLocale('id-ID').setZone('Asia/Jakarta');

  console.log('[formatDate] After setZone:', local.toISO(), 'Zone:', local.zoneName);

  if (includeTime) {
    const result = local.toFormat("dd MMMM yyyy (HH:mm) 'WIB'");
    console.log('[formatDate] Output with time:', result);
    return result;
  }

  const result = local.toFormat('dd MMMM yyyy');
  console.log('[formatDate] Output without time:', result);
  return result;
}

/**
 * Parse date string from AI Vision/Parser as WIB timezone
 * AI returns strings like "2026-02-12 15:46" or "2026-02-12" which should be treated as WIB, not UTC
 * Without this, new Date() treats it as UTC and adds 7 hours when displaying in WIB
 */
export function parseDateAsWIB(dateString: string): Date {
  console.log('[parseDateAsWIB] Input:', dateString);

  // Try date-time format first (YYYY-MM-DD HH:mm)
  let dt = DateTime.fromFormat(dateString, 'yyyy-MM-dd HH:mm', { zone: 'Asia/Jakarta' });

  if (!dt.isValid) {
    // Try date-only format (YYYY-MM-DD)
    // IMPORTANT: For date-only, we use the current time to avoid timezone shift issues
    // If we set to 00:00 WIB, it becomes previous day 17:00 UTC
    const dateOnly = DateTime.fromFormat(dateString, 'yyyy-MM-dd', { zone: 'Asia/Jakarta' });

    if (dateOnly.isValid) {
      // Get current time in WIB
      const now = DateTime.now().setZone('Asia/Jakarta');

      // Combine the date from AI with current time
      dt = dateOnly.set({
        hour: now.hour,
        minute: now.minute,
        second: now.second,
        millisecond: now.millisecond
      });

      console.log('[parseDateAsWIB] Parsed as date-only, using current time:', dt.toISO(), 'Zone:', dt.zoneName);
    }
  } else {
    console.log('[parseDateAsWIB] Parsed as date-time:', dt.toISO(), 'Zone:', dt.zoneName);
  }

  if (!dt.isValid) {
    // Fallback: try ISO format
    const isoDate = DateTime.fromISO(dateString, { zone: 'Asia/Jakarta' });
    if (isoDate.isValid) {
      console.log('[parseDateAsWIB] Parsed as ISO:', isoDate.toISO());
      return isoDate.toJSDate();
    }
    // Last resort: use current time
    console.log('[parseDateAsWIB] Failed to parse, using current time');
    return new Date();
  }

  const jsDate = dt.toJSDate();
  console.log('[parseDateAsWIB] Output JS Date:', jsDate.toISOString(), 'Local:', jsDate.toString());
  return jsDate;
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
