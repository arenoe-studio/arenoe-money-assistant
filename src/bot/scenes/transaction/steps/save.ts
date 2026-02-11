import { BotContext } from '../../../../types';
import { Transaction } from '../../../../schemas/transaction';
import { writeBatchTransaction } from '../../../../services/sheets';
import { formatCurrency } from '../../../../utils/currency';
import { autoCategory, formatDate, titleCase } from '../../../../utils/format';
import { logger } from '../../../../utils/logger';
import { deductBalance } from '../../../../services/balance';

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
        // 1. Save to Google Sheets
        await writeBatchTransaction(ctx.from!.id, transactions as Transaction[]);

        // 2. Deduct Balance
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
                const result = await deductBalance(ctx.from!.id, method, amount);
                // Store remaining balance for display
                if (method === first.metodePembayaran) {
                    remainingBalance = result.newBalance;
                }
            }
        }

        // 3. Generate Success Message
        const now = new Date();
        const purchaseDate = first.tanggal || now;

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
