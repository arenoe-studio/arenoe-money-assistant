import { Markup } from 'telegraf';
import { DateTime } from 'luxon';

/**
 * Generate year selection keyboard
 */
export function generateYearKeyboard(currentYear?: number): any {
    const year = currentYear || DateTime.now().year;
    const years = [year - 1, year, year + 1];

    const buttons = years.map(y =>
        Markup.button.callback(y.toString(), `report_year_${y}`)
    );

    return Markup.inlineKeyboard([
        buttons,
        [Markup.button.callback('🔙 Batal', 'report_cancel')]
    ]);
}

/**
 * Generate month selection keyboard
 */
export function generateMonthKeyboard(): any {
    const months = [
        { name: 'Jan', value: 1 },
        { name: 'Feb', value: 2 },
        { name: 'Mar', value: 3 },
        { name: 'Apr', value: 4 },
        { name: 'Mei', value: 5 },
        { name: 'Jun', value: 6 },
        { name: 'Jul', value: 7 },
        { name: 'Agu', value: 8 },
        { name: 'Sep', value: 9 },
        { name: 'Okt', value: 10 },
        { name: 'Nov', value: 11 },
        { name: 'Des', value: 12 }
    ];

    const rows = [];
    for (let i = 0; i < months.length; i += 3) {
        rows.push(
            months.slice(i, i + 3).map(m =>
                Markup.button.callback(m.name, `report_month_${m.value}`)
            )
        );
    }

    rows.push([Markup.button.callback('🔙 Batal', 'report_cancel')]);

    return Markup.inlineKeyboard(rows);
}

/**
 * Generate day selection keyboard based on year and month
 */
export function generateDayKeyboard(year: number, month: number): any {
    const daysInMonth = DateTime.local(year, month).daysInMonth || 31;
    const buttons = [];

    // Create rows of 7 days (like a calendar)
    for (let day = 1; day <= daysInMonth; day++) {
        buttons.push(
            Markup.button.callback(day.toString(), `report_day_${day}`)
        );
    }

    const rows = [];
    for (let i = 0; i < buttons.length; i += 7) {
        rows.push(buttons.slice(i, i + 7));
    }

    rows.push([Markup.button.callback('🔙 Batal', 'report_cancel')]);

    return Markup.inlineKeyboard(rows);
}

/**
 * Get current week range (Monday to Sunday)
 */
export function getWeekRange(): { start: Date; end: Date } {
    const now = DateTime.now().setZone('Asia/Jakarta');
    const start = now.startOf('week'); // Monday
    const end = now.endOf('week'); // Sunday

    return {
        start: start.toJSDate(),
        end: end.toJSDate()
    };
}

/**
 * Get current month range
 */
export function getMonthRange(): { start: Date; end: Date } {
    const now = DateTime.now().setZone('Asia/Jakarta');
    const start = now.startOf('month');
    const end = now.endOf('month');

    return {
        start: start.toJSDate(),
        end: end.toJSDate()
    };
}

/**
 * Validate date range
 */
export function validateDateRange(start: Date, end: Date): { valid: boolean; message?: string } {
    if (end < start) {
        return {
            valid: false,
            message: '❌ Tanggal akhir tidak boleh lebih kecil dari tanggal mulai!'
        };
    }

    // Check if range is more than 1 year
    const diffInDays = DateTime.fromJSDate(end).diff(DateTime.fromJSDate(start), 'days').days;
    if (diffInDays > 365) {
        return {
            valid: false,
            message: '⚠️ Rentang waktu tidak boleh lebih dari 1 tahun!'
        };
    }

    return { valid: true };
}
