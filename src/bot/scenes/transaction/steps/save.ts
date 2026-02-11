import { BotContext } from '../../../../types';
import { Transaction } from '../../../../schemas/transaction';
import { writeBatchTransaction } from '../../../../services/sheets';
import { formatCurrency } from '../../../../utils/currency';
import { autoCategory, formatDate, titleCase } from '../../../../utils/format';
import { logger } from '../../../../utils/logger';
import { deductBalance } from '../../../../services/balance';
import { db } from '../../../../db/client';
import { transactions as transactionsTable, users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Saves transactions to Google Sheets and deducts balance.
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
            // Auto-register strictly if needed, but usually handled elsewhere
            logger.warn(`User ${telegramId} not found during save, creating default record.`);
            const [newUser] = await db.insert(users).values({
                telegramId,
                createdAt: new Date(),
                updatedAt: new Date()
            }).returning();
            user = newUser;
        }

        // 1. Save to Database (Neon)
        // Use Node's crypto for UUID or a simple library. 
        // Assuming global crypto is available or we use uuid package if imported.
        // Let's use current time + random suffix for transaction ID to be safe without extra deps here
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
            type: 'expense',
            syncedToSheets: false,
            createdAt: now
        }));

        await db.insert(transactionsTable).values(records);
        logger.info(`Saved ${records.length} transactions to DB for user ${telegramId}`);

        // 2. Save to Google Sheets
        try {
            await writeBatchTransaction(telegramId, transactions as Transaction[]);
            // Optionally update syncedToSheets flag here
            // await db.update(transactionsTable).set({ syncedToSheets: true }).where(eq(transactionsTable.transactionId, batchId));
        } catch (sheetError) {
            logger.warn('Failed to sync to Google Sheets, saved locally only', { error: sheetError });
        }

        // 3. Deduct Balance
        // Group totals by method (usually just one)
        const methodTotals = transactions.reduce((acc, t) => {
            const m = t.metodePembayaran || 'General';
            acc[m] = (acc[m] || 0) + (t.harga || 0);
            return acc;
        }, {} as Record<string, number>);

        let remainingBalance: number | undefined;
        const first = transactions[0];

        for (const [method, amount] of Object.entries(methodTotals)) {
            if (method !== 'General') { // detailed methods only
                const result = await deductBalance(telegramId, method, amount);
                // Store remaining balance for display
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

        // Add visual indicator if Sheets sync worked or failed (optional)
        // For now, keep it simple. If DB save works, it's a success.

        const successMessage = `✅ Tercatat:

📅 Tanggal Beli: ${purchaseDateStr}
🕒 Tanggal Catat: ${recordDateStr}
🏪 Toko: ${titleCase(first.namaToko) || "-"}
💳 Metode Pembayaran: ${titleCase(first.metodePembayaran) || "-"}${remainingStr}
💰 Total Belanja: ${priceStr}

Items:
${itemsList}`;

        return successMessage;

    } catch (error) {
        logger.error('Error saving transaction', { error });
        throw error;
    }
};
