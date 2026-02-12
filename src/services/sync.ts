
import { db } from '../db/client';
import { transactions, users } from '../db/schema';
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

/**
 * Processes an incoming webhook from Google Apps Script.
 *
 * Supports two scenarios:
 * 1. **UPDATE** — the transactionId already exists in DB → update the record.
 * 2. **INSERT** — the transactionId does NOT exist in DB → create a new record
 *    (only if `telegramId` is provided so we can map the user).
 */
export async function processSyncFromSheets(secret: string, payload: SheetTransactionPayload) {
    // ── 0. Validate webhook secret ──────────────────────────────────────
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
        logger.warn('Sync: Invalid webhook secret received.');
        throw new ApplicationError('Unauthorized: invalid webhook secret');
    }

    // ── 1. Validate payload ─────────────────────────────────────────────
    if (!payload.transactionId) {
        throw new ApplicationError('Invalid payload: Missing transactionId');
    }

    logger.info(`Sync: Processing webhook for transaction ${payload.transactionId}`);

    // ── 2. Check for existing transaction ──────────────────────────────
    const existingTx = await db.query.transactions.findFirst({
        where: eq(transactions.transactionId, payload.transactionId)
    });

    if (existingTx) {
        // ════════ SCENARIO A: UPDATE ════════════════════════════════════
        await handleUpdate(existingTx, payload);
    } else {
        // ════════ SCENARIO B: INSERT ════════════════════════════════════
        await handleInsert(payload);
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario A: Update existing transaction
// ─────────────────────────────────────────────────────────────────────────
async function handleUpdate(
    existingTx: typeof transactions.$inferSelect,
    payload: SheetTransactionPayload
) {
    if (!existingTx.userId) {
        logger.error(`Sync: Transaction ${payload.transactionId} exists but has no userId.`);
        return;
    }

    // Resolve telegram ID for balance ops
    const user = await db.query.users.findFirst({
        where: eq(users.id, existingTx.userId)
    });

    if (!user) {
        logger.error(`Sync: User ID ${existingTx.userId} not found for transaction ${payload.transactionId}`);
        return;
    }

    const telegramId = Number(user.telegramId);
    const newAmount = payload.harga || 0;
    const newMethod = payload.metodePembayaran || existingTx.metodePembayaran;
    const newDate = payload.tanggal ? new Date(payload.tanggal) : existingTx.tanggal || new Date();

    const safeType = (['expense', 'income', 'transfer', 'debt'] as const).includes(payload.type as any)
        ? payload.type
        : existingTx.type as 'expense' | 'income' | 'transfer' | 'debt';

    logger.info(`Sync: Updating transaction ${payload.transactionId} for user ${telegramId}`);

    // ── Revert old balance ──────────────────────────────────────────
    if (existingTx.type === 'expense') {
        await balanceService.addBalance(telegramId, existingTx.metodePembayaran || 'Cash', existingTx.harga);
    } else if (existingTx.type === 'income') {
        await balanceService.deductBalance(telegramId, existingTx.metodePembayaran || 'Cash', existingTx.harga);
    }

    // ── Apply new balance ───────────────────────────────────────────
    if (safeType === 'expense') {
        await balanceService.deductBalance(telegramId, newMethod, newAmount);
    } else if (safeType === 'income') {
        await balanceService.addBalance(telegramId, newMethod, newAmount);
    }

    // ── Update transaction record ───────────────────────────────────
    await db.update(transactions)
        .set({
            items: payload.items || existingTx.items,
            harga: newAmount,
            namaToko: payload.namaToko || existingTx.namaToko,
            metodePembayaran: newMethod,
            tanggal: newDate,
            type: safeType,
            sheetRowId: payload.sheetRowId || existingTx.sheetRowId,
            lastSyncAt: new Date(),
            syncedToSheets: true
        })
        .where(eq(transactions.id, existingTx.id));

    logger.info(`Sync: Successfully updated transaction ${payload.transactionId}`);
}

// ─────────────────────────────────────────────────────────────────────────
// Scenario B: Insert new transaction from Sheet
// ─────────────────────────────────────────────────────────────────────────
async function handleInsert(payload: SheetTransactionPayload) {
    if (!payload.telegramId) {
        logger.warn(`Sync: Cannot insert — no telegramId in payload for txId ${payload.transactionId}`);
        return;
    }

    const user = await getOrCreateUser(payload.telegramId);

    const safeType = (['expense', 'income', 'transfer', 'debt'] as const).includes(payload.type as any)
        ? payload.type
        : 'expense';

    const amount = payload.harga || 0;
    const method = payload.metodePembayaran || 'Cash';
    const date = payload.tanggal ? new Date(payload.tanggal) : new Date();

    logger.info(`Sync: Inserting new transaction ${payload.transactionId} for user ${payload.telegramId}`);

    // ── Insert into DB ──────────────────────────────────────────────
    await db.insert(transactions).values({
        userId: user.id,
        transactionId: payload.transactionId,
        items: payload.items || 'Manual Entry',
        harga: amount,
        namaToko: payload.namaToko || '-',
        metodePembayaran: method,
        tanggal: date,
        type: safeType,
        sheetRowId: payload.sheetRowId || null,
        syncedToSheets: true,
        lastSyncAt: new Date(),
        createdAt: new Date()
    });

    // ── Adjust balance ──────────────────────────────────────────────
    if (safeType === 'expense') {
        await balanceService.deductBalance(payload.telegramId, method, amount);
    } else if (safeType === 'income') {
        await balanceService.addBalance(payload.telegramId, method, amount);
    }

    logger.info(`Sync: Successfully inserted transaction ${payload.transactionId}`);
}
