import { BotContext } from '../../../../types';
import { Transaction } from '../../../../schemas/transaction';
import { syncToSheets, SheetRow } from '../../../../services/sheets';
import { formatCurrency } from '../../../../utils/currency';
import { autoCategory, formatDate, titleCase } from '../../../../utils/format';
import { logger } from '../../../../utils/logger';
import { deductBalance } from '../../../../services/balance';
import { db } from '../../../../db/client';
import { transactions as transactionsTable, users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Saves transactions to Neon DB, syncs to Google Sheets, and deducts balance.
 * Returns the formatted success message.
 */
export const saveAndFormatTransaction = async (ctx: BotContext): Promise<string> => {
    const { transactions } = ctx.session;

    if (!transactions || transactions.length === 0) {
        throw new Error('No transactions found in session');
    }

    try {
        const telegramId = ctx.from!.id;

        // 0. Ensure user exists in DB
        let user = await db.query.users.findFirst({
            where: eq(users.telegramId, telegramId)
        });

        if (!user) {
            logger.warn(`User ${telegramId} not found during save, creating default record.`);
            const [newUser] = await db.insert(users).values({
                telegramId,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();
            user = newUser;
        }

        // 1. Save to Database (Neon)
        const batchId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const now = new Date();
        const records = transactions.map(t => ({
            userId: user!.id,
            transactionId: batchId,
            items: t.items || 'Unknown',
            harga: t.harga || 0,
            namaToko: t.namaToko || 'Unknown',
            metodePembayaran: t.metodePembayaran || 'Cash',
            tanggal: t.tanggal ? new Date(t.tanggal) : now,
            type: 'expense' as const,
            syncedToSheets: false,
            createdAt: now
        }));

        await db.insert(transactionsTable).values(records);
        logger.info(`Saved ${records.length} transactions to DB for user ${telegramId}`);

        // 2. Sync to Google Sheets (non-blocking — errors are caught inside)
        const sheetRows: SheetRow[] = transactions.map(t => ({
            transactionId: batchId,
            items: t.items || 'Unknown',
            harga: t.harga || 0,
            namaToko: t.namaToko || 'Unknown',
            metodePembayaran: t.metodePembayaran || 'Cash',
            tanggal: t.tanggal ? new Date(t.tanggal).toISOString() : now.toISOString(),
            type: 'expense' as const
        }));

        // Fire-and-forget but awaited for inline flow; errors are handled internally.
        await syncToSheets(telegramId, sheetRows, batchId);

        // 3. Deduct Balance
        const methodTotals = transactions.reduce((acc, t) => {
            const m = t.metodePembayaran || 'General';
            acc[m] = (acc[m] || 0) + (t.harga || 0);
            return acc;
        }, {} as Record<string, number>);

        let remainingBalance: number | undefined;
        const first = transactions[0];

        for (const [method, amount] of Object.entries(methodTotals)) {
            if (method !== 'General') {
                const result = await deductBalance(telegramId, method, amount);
                if (method === first.metodePembayaran) {
                    remainingBalance = result.newBalance;
                }
            }
        }

        // 4. Generate Success Message
        const purchaseDate = first.tanggal ? new Date(first.tanggal) : now;

        const purchaseDateStr = formatDate(purchaseDate, true);
        const recordDateStr = formatDate(now, true);

        const total = transactions.reduce((sum, t) => sum + (t.harga || 0), 0);
        const priceStr = formatCurrency(total);

        const itemsList = transactions.map(t => {
            const cat = t.kategori || autoCategory(t.items);
            const name = titleCase(t.items);
            const price = formatCurrency(t.harga || 0);
            return `• ${name} — ${price} (${cat})`;
        }).join('\n');

        const remainingStr = remainingBalance !== undefined
            ? `\n📉 Sisa Saldo (${first.metodePembayaran}): ${formatCurrency(remainingBalance)}`
            : '';

        const successMessage = `✅ Tercatat:\n\n📅 Tanggal Beli: ${purchaseDateStr}\n🕒 Tanggal Catat: ${recordDateStr}\n🏪 Toko: ${titleCase(first.namaToko) || "-"}\n💳 Metode Pembayaran: ${titleCase(first.metodePembayaran) || "-"}${remainingStr}\n💰 Total Belanja: ${priceStr}\n\nItems:\n${itemsList}`;

        return successMessage;

    } catch (error) {
        logger.error('Error saving transaction', { error });
        throw error;
    }
};
