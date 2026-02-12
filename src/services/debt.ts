import { db } from '../db/client';
import { debts, transactions } from '../db/schema';
import { getOrCreateUser } from './user';
import { getUserBalance, deductBalance } from './balance';
import { syncSingleToSheets } from './sheets';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';

export interface DebtInfo {
    id: number;
    userId: number;
    creditorName: string;
    description: string;
    amount: number;
    merchant: string;
    status: 'unpaid' | 'paid';
    transactionId: string;
    paidAt: Date | null;
    paidWith: string | null;
    createdAt: Date | null;
}

/**
 * Create a new debt record
 * This will:
 * 1. Create a debt entry in the debts table
 * 2. Create a transaction record with type 'debt' (negative amount showing as expense)
 */
export async function createDebt(
    telegramId: number,
    creditorName: string,
    description: string,
    amount: number,
    merchant: string
) {
    const user = await getOrCreateUser(telegramId);
    const transactionId = crypto.randomUUID();

    try {
        // Create debt record
        const [debt] = await db.insert(debts).values({
            userId: user.id,
            creditorName,
            description,
            amount,
            merchant,
            status: 'unpaid',
            transactionId,
            createdAt: new Date()
        }).returning();

        // Create transaction record (as debt type)
        await db.insert(transactions).values({
            userId: user.id,
            transactionId,
            items: description,
            harga: amount,
            namaToko: merchant,
            metodePembayaran: `Hutang - ${creditorName}`,
            type: 'debt',
            tanggal: new Date(),
            syncedToSheets: false
        });

        // Sync to Google Sheets
        await syncSingleToSheets(telegramId, {
            transactionId,
            items: description,
            harga: amount,
            namaToko: merchant,
            metodePembayaran: `Hutang - ${creditorName}`,
            type: 'debt'
        });

        logger.info('Debt created', { debtId: debt.id, creditorName, amount });

        return {
            success: true,
            debt
        };
    } catch (error) {
        logger.error('Error creating debt', { error });
        throw error;
    }
}

/**
 * Get all debts for a user
 * @param status - Optional filter by status ('unpaid' | 'paid')
 */
export async function getUserDebts(telegramId: number, status?: 'unpaid' | 'paid'): Promise<DebtInfo[]> {
    const user = await getOrCreateUser(telegramId);

    const conditions = [eq(debts.userId, user.id)];
    if (status) {
        conditions.push(eq(debts.status, status));
    }

    const result = await db.select()
        .from(debts)
        .where(and(...conditions))
        .orderBy(debts.createdAt);

    return result as DebtInfo[];
}

/**
 * Get a specific debt by ID
 */
export async function getDebtById(debtId: number): Promise<DebtInfo | null> {
    const result = await db.select()
        .from(debts)
        .where(eq(debts.id, debtId))
        .limit(1);

    return result[0] as DebtInfo || null;
}

/**
 * Pay a debt
 * This will:
 * 1. Mark the debt as paid
 * 2. Create an expense transaction with the selected payment method
 * 3. Deduct the amount from the user's balance
 */
export async function payDebt(telegramId: number, debtId: number, paymentMethod: string) {
    const user = await getOrCreateUser(telegramId);
    const debt = await getDebtById(debtId);

    if (!debt) {
        throw new Error('Debt not found');
    }

    if (debt.userId !== user.id) {
        throw new Error('Unauthorized');
    }

    if (debt.status === 'paid') {
        throw new Error('Debt already paid');
    }

    // Check if user has sufficient balance
    const currentBalance = await getUserBalance(telegramId, paymentMethod);
    if (currentBalance < debt.amount) {
        throw new Error(`Saldo ${paymentMethod} tidak cukup. Saldo saat ini: ${currentBalance}, Butuh: ${debt.amount}`);
    }

    const paymentTransactionId = crypto.randomUUID();

    try {
        // 1. Mark debt as paid
        await db.update(debts)
            .set({
                status: 'paid',
                paidAt: new Date(),
                paidWith: paymentMethod
            })
            .where(eq(debts.id, debtId));

        // 2. Create expense transaction for the payment
        await db.insert(transactions).values({
            userId: user.id,
            transactionId: paymentTransactionId,
            items: `Bayar Hutang - ${debt.creditorName}: ${debt.description}`,
            harga: debt.amount,
            namaToko: debt.merchant,
            metodePembayaran: paymentMethod,
            type: 'expense',
            tanggal: new Date(),
            syncedToSheets: false
        });

        // Sync to Google Sheets
        await syncSingleToSheets(telegramId, {
            transactionId: paymentTransactionId,
            items: `Bayar Hutang - ${debt.creditorName}: ${debt.description}`,
            harga: debt.amount,
            namaToko: debt.merchant,
            metodePembayaran: paymentMethod,
            type: 'expense'
        });

        // 3. Deduct balance
        const balanceResult = await deductBalance(telegramId, paymentMethod, debt.amount);

        logger.info('Debt paid', { debtId, paymentMethod, amount: debt.amount });

        return {
            success: true,
            debt,
            newBalance: balanceResult.newBalance
        };
    } catch (error) {
        logger.error('Error paying debt', { error, debtId });
        throw error;
    }
}
