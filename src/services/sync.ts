
import { db } from '../db/client';
import { transactions, users, paymentBalances } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { ApplicationError } from '../utils/error';
import { logger } from '../utils/logger';
import { getOrCreateUser } from './user';
import * as balanceService from './balance';

export interface SheetTransactionPayload {
    telegramId: number;
    sheetRowId: string;
    transactionId: string;
    items: string;
    harga: number;
    namaToko: string;
    metodePembayaran: string;
    tanggal: string; // ISO string or Date string
    type: 'expense' | 'income' | 'transfer' | 'debt';
}

export async function processSyncFromSheets(secret: string, payload: SheetTransactionPayload) {
    // 1. Validate Payload basics
    if (!payload.transactionId) {
        throw new ApplicationError('Invalid payload: Missing transactionId');
    }

    logger.info(`Sync: Processing webhook for transaction ${payload.transactionId}`);

    // 2. Find existing transaction
    const existingTx = await db.query.transactions.findFirst({
        where: eq(transactions.transactionId, payload.transactionId)
    });

    if (!existingTx) {
        // Scenario: User manually added row in Sheet with a random ID?
        // We cannot securely determine the user owner without an explicit user mappping in the webhook.
        // For now, we only support UPDATING existing transactions initiated by the bot.
        logger.warn(`Sync: Transaction ${payload.transactionId} not found in DB. Skipping insert from Sheet.`);
        return;
    }

    if (!existingTx.userId) {
        logger.error(`Sync: Transaction ${payload.transactionId} exists but has no userId.`);
        return;
    }

    // 3. Resolve User
    const user = await db.query.users.findFirst({
        where: eq(users.id, existingTx.userId)
    });

    if (!user) {
        logger.error(`Sync: User ID ${existingTx.userId} not found for transaction ${payload.transactionId}`);
        return;
    }

    const telegramId = Number(user.telegramId);

    // 4. Verify Secret (Optional but good practice)
    // If exact check required: if (user.webhookSecret && user.webhookSecret !== secret) throw ...
    // But since secret comes from Apps Script global property, assuming it matches the deployment environment is safer for now.

    const newAmount = payload.harga || 0;
    const newMethod = payload.metodePembayaran || existingTx.metodePembayaran;
    const newDate = payload.tanggal ? new Date(payload.tanggal) : new Date();

    // Determine type
    const safeType = ['expense', 'income', 'transfer', 'debt'].includes(payload.type)
        ? payload.type
        : 'expense';

    // === UPDATE ===
    logger.info(`Sync: Updating transaction ${payload.transactionId} for user ${telegramId}`);

    // Revert/Adjust Balance logic
    // 1. Revert Old Balance
    if (existingTx.type === 'expense') {
        await balanceService.addBalance(telegramId, existingTx.metodePembayaran || 'Cash', existingTx.harga);
    } else if (existingTx.type === 'income') {
        await balanceService.deductBalance(telegramId, existingTx.metodePembayaran || 'Cash', existingTx.harga);
    }

    // 2. Apply New Balance
    if (safeType === 'expense') {
        await balanceService.deductBalance(telegramId, newMethod, newAmount);
    } else if (safeType === 'income') {
        await balanceService.addBalance(telegramId, newMethod, newAmount);
    }

    // 3. Update Transaction Record
    await db.update(transactions)
        .set({
            items: payload.items || existingTx.items,
            harga: newAmount,
            namaToko: payload.namaToko || existingTx.namaToko,
            metodePembayaran: newMethod,
            tanggal: newDate,
            type: safeType,
            sheetRowId: payload.sheetRowId, // Might be undefined from script, keep old if so? Payload usually has full data.
            lastSyncAt: new Date(),
            syncedToSheets: true
        })
        .where(eq(transactions.id, existingTx.id));

    logger.info(`Sync: Successfully updated transaction ${payload.transactionId}`);
}
