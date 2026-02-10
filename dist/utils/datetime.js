import { DateTime } from 'luxon';
export const TIMEZONE = 'Asia/Jakarta';
/**
 * Returns the current timestamp in ISO format with Jakarta timezone.
 */
export function getCurrentTimestamp() {
    return DateTime.now().setZone(TIMEZONE).toISO() || '';
}
/**
 * Returns the current DateTime object in Jakarta timezone.
 */
export function now() {
    return DateTime.now().setZone(TIMEZONE);
}
/**
 * Parses a date string into a Luxon DateTime object.
 * Supports typical Indonesian date formats.
 *
 * @param input Date string (e.g. "15 Januari 2026", "15/01/2026")
 * @returns DateTime object or null if invalid
 */
export function parseDate(input) {
    const formats = [
        'dd MMMM yyyy', // 15 Januari 2026
        'd MMMM yyyy', // 5 Januari 2026
        'dd MM yyyy', // 15 01 2026
        'dd/MM/yyyy', // 15/01/2026
        'd/M/yyyy', // 5/1/2026
        'yyyy-MM-dd', // 2026-01-15
        'dd-MM-yyyy' // 15-01-2026
    ];
    for (const format of formats) {
        const parsed = DateTime.fromFormat(input, format, {
            zone: TIMEZONE,
            locale: 'id'
        });
        if (parsed.isValid) {
            return parsed;
        }
    }
    return null;
}
/**
 * Formats a date for display
 * @param date DateTime object or ISO string
 * @returns Formatted string (e.g. "Senin, 15 Januari 2026")
 */
export function formatDate(date) {
    const dt = typeof date === 'string'
        ? DateTime.fromISO(date).setZone(TIMEZONE)
        : date.setZone(TIMEZONE);
    return dt.setLocale('id').toFormat('EEEE, dd MMMM yyyy');
}
