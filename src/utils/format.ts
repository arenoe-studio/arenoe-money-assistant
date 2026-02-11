
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
