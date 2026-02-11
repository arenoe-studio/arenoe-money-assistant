import { db } from '../db/client';
import { transactions, debts } from '../db/schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { autoCategory } from '../utils/format';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/format';
import { DateTime } from 'luxon';
import { getOrCreateUser } from './user';

export interface TransactionReport {
    items: string;
    harga: number;
    namaToko: string;
    metodePembayaran: string;
    tanggal: Date;
    kategori?: string;
}

export interface DebtReport {
    creditorName: string;
    description: string;
    amount: number;
    merchant: string;
    status: 'unpaid' | 'paid';
    createdAt: Date;
}

export interface CategorySummary {
    category: string;
    total: number;
}

export interface DailySummary {
    date: string;
    transactions: TransactionReport[];
}

export interface DebtDailySummary {
    date: string;
    debts: DebtReport[];
}

/**
 * Fetch transactions within a date range for a specific user
 */
export async function getTransactionsByDateRange(
    telegramId: number,
    startDate: Date,
    endDate: Date
): Promise<TransactionReport[]> {
    // Get internal user ID
    const user = await getOrCreateUser(telegramId);

    // Set time to start of day for startDate and end of day for endDate
    const start = DateTime.fromJSDate(startDate).startOf('day').toJSDate();
    const end = DateTime.fromJSDate(endDate).endOf('day').toJSDate();

    const results = await db
        .select({
            items: transactions.items,
            harga: transactions.harga,
            namaToko: transactions.namaToko,
            metodePembayaran: transactions.metodePembayaran,
            tanggal: transactions.tanggal
        })
        .from(transactions)
        .where(
            and(
                eq(transactions.userId, user.id),
                eq(transactions.type, 'expense'),
                gte(transactions.tanggal, start),
                lte(transactions.tanggal, end)
            )
        )
        .orderBy(transactions.tanggal);

    // Filter out debt payment transactions (they're already shown in debt list)
    return results
        .filter(r => !r.items.startsWith('Bayar Hutang'))
        .map(r => ({
            ...r,
            tanggal: r.tanggal || new Date(),
            kategori: autoCategory(r.items)
        }));
}

/**
 * Fetch debts within a date range for a specific user
 */
export async function getDebtsByDateRange(
    telegramId: number,
    startDate: Date,
    endDate: Date
): Promise<DebtReport[]> {
    const user = await getOrCreateUser(telegramId);

    const start = DateTime.fromJSDate(startDate).startOf('day').toJSDate();
    const end = DateTime.fromJSDate(endDate).endOf('day').toJSDate();

    const results = await db
        .select({
            creditorName: debts.creditorName,
            description: debts.description,
            amount: debts.amount,
            merchant: debts.merchant,
            status: debts.status,
            createdAt: debts.createdAt
        })
        .from(debts)
        .where(
            and(
                eq(debts.userId, user.id),
                gte(debts.createdAt, start),
                lte(debts.createdAt, end)
            )
        )
        .orderBy(debts.createdAt);

    return results.map(r => ({
        ...r,
        status: r.status as 'unpaid' | 'paid',
        createdAt: r.createdAt || new Date()
    }));
}

/**
 * Aggregate transactions by category
 */
export function aggregateByCategory(transactions: TransactionReport[]): CategorySummary[] {
    const categoryMap = new Map<string, number>();

    transactions.forEach(t => {
        const cat = t.kategori || 'Other';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + t.harga);
    });

    return Array.from(categoryMap.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);
}

/**
 * Aggregate transactions by date
 */
export function aggregateByDate(transactions: TransactionReport[]): DailySummary[] {
    const dateMap = new Map<string, TransactionReport[]>();

    transactions.forEach(t => {
        const dateKey = DateTime.fromJSDate(t.tanggal).toFormat('d MMMM yyyy', { locale: 'id' });
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(t);
    });

    return Array.from(dateMap.entries())
        .map(([date, transactions]) => ({ date, transactions }))
        .sort((a, b) => {
            const dateA = DateTime.fromFormat(a.date, 'd MMMM yyyy', { locale: 'id' });
            const dateB = DateTime.fromFormat(b.date, 'd MMMM yyyy', { locale: 'id' });
            return dateA.toMillis() - dateB.toMillis();
        });
}

/**
 * Aggregate debts by date
 */
export function aggregateDebtsByDate(debts: DebtReport[]): DebtDailySummary[] {
    const dateMap = new Map<string, DebtReport[]>();

    debts.forEach(d => {
        const dateKey = DateTime.fromJSDate(d.createdAt).toFormat('d MMMM yyyy', { locale: 'id' });
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(d);
    });

    return Array.from(dateMap.entries())
        .map(([date, debts]) => ({ date, debts }))
        .sort((a, b) => {
            const dateA = DateTime.fromFormat(a.date, 'd MMMM yyyy', { locale: 'id' });
            const dateB = DateTime.fromFormat(b.date, 'd MMMM yyyy', { locale: 'id' });
            return dateA.toMillis() - dateB.toMillis();
        });
}

/**
 * Generate formatted report text
 */
export function formatReport(
    transactions: TransactionReport[],
    debts: DebtReport[],
    startDate: Date,
    endDate: Date
): string {
    const startStr = formatDate(startDate, false);
    const endStr = formatDate(endDate, false);

    let report = `📊 LAPORAN KEUANGAN\n`;
    report += `Periode: ${startStr} s/d ${endStr}\n\n`;

    // Expense section
    if (transactions.length === 0) {
        report += `📭 Tidak ada transaksi pengeluaran dalam periode ini.\n\n`;
    } else {
        const total = transactions.reduce((sum, t) => sum + t.harga, 0);
        const categories = aggregateByCategory(transactions);
        const dailySummaries = aggregateByDate(transactions);

        report += `💰 Total Pengeluaran: ${formatCurrency(total)}\n\n`;

        // Category breakdown
        report += `📂 Rincian Kategori:\n`;
        categories.forEach(cat => {
            const emoji = getCategoryEmoji(cat.category);
            report += `${emoji} ${cat.category}: ${formatCurrency(cat.total)}\n`;
        });

        report += `\n\n📝 Daftar Pengeluaran:\n`;

        // Daily breakdown
        dailySummaries.forEach(daily => {
            report += `\n${daily.date}\n`;
            daily.transactions.forEach(t => {
                report += `• ${t.items} - ${t.namaToko} - ${formatCurrency(t.harga)}\n`;
            });
        });
    }

    // Debt section
    if (debts.length > 0) {
        const debtDailySummaries = aggregateDebtsByDate(debts);

        // Calculate totals
        const totalUnpaid = debts.filter(d => d.status === 'unpaid').reduce((sum, d) => sum + d.amount, 0);
        const totalPaid = debts.filter(d => d.status === 'paid').reduce((sum, d) => sum + d.amount, 0);
        const totalDebt = totalUnpaid + totalPaid;

        report += `\n\n💳 Daftar Hutang:\n`;
        report += `Total: ${formatCurrency(totalDebt)} (Belum Lunas: ${formatCurrency(totalUnpaid)}, Lunas: ${formatCurrency(totalPaid)})\n`;

        debtDailySummaries.forEach(daily => {
            report += `\n${daily.date}\n`;
            daily.debts.forEach(d => {
                const statusText = d.status === 'paid' ? 'Lunas' : 'Belum Lunas';
                report += `• ${d.creditorName}: ${d.description} - ${d.merchant} - ${formatCurrency(d.amount)} - ${statusText}\n`;
            });
        });
    }

    return report;
}

/**
 * Get emoji for category
 */
function getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
        'Food': '🍔',
        'Transport': '🚗',
        'Shopping': '🛍️',
        'Bills': '📄',
        'Health': '⚕️',
        'Entertainment': '🎮',
        'Other': '📦'
    };
    return emojiMap[category] || '📦';
}
