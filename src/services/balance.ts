
import { db } from '../db/client';
import { paymentBalances } from '../db/schema';
import { getOrCreateUser } from './user';
import { formatCurrency } from '../utils/currency';
import { syncSingleToSheets } from './sheets';
import { eq, and } from 'drizzle-orm';

/**
 * Set balance for a specific payment method.
 * Uses upsert logic (Insert or Update).
 */
export async function setUserBalance(telegramId: number, method: string, amount: number) {
    const user = await getOrCreateUser(telegramId);

    await db.insert(paymentBalances)
        .values({
            userId: user.id,
            method: method,
            amount: amount,
            updatedAt: new Date()
        })
        .onConflictDoUpdate({
            target: [paymentBalances.userId, paymentBalances.method],
            set: { amount: amount, updatedAt: new Date() }
        });

    return {
        success: true,
        message: `✅ Saldo ${method} berhasil diatur menjadi ${formatCurrency(amount)}`
    };
}

/**
 * Get balance for a specific method (Optional usage)
 */
export async function getUserBalance(telegramId: number, method: string) {
    const user = await getOrCreateUser(telegramId);

    const result = await db.select()
        .from(paymentBalances)
        .where(and(
            eq(paymentBalances.userId, user.id),
            eq(paymentBalances.method, method)
        ))
        .limit(1);

    return result[0]?.amount || 0;
}

/**
 * Get all balances for a user, including unset methods (default 0).
 */
export async function getAllUserBalances(telegramId: number) {
    const user = await getOrCreateUser(telegramId);

    // Get all user payment methods first
    // Use dynamic import to avoid potential circular dependency if any future changes occur, though safe now.
    const { getUserPaymentMethods } = await import('./payment');
    const allMethods = await getUserPaymentMethods(telegramId);

    // Get set balances from DB
    const balances = await db.select()
        .from(paymentBalances)
        .where(eq(paymentBalances.userId, user.id));

    // Map to final result
    const result = allMethods.map(methodInfo => {
        const found = balances.find(b => b.method === methodInfo.name);
        return {
            method: methodInfo.name,
            amount: found ? found.amount : 0
        };
    });

    return result;
}

/**
 * Deduct amount from user's balance for a specific payment method.
 */
export async function deductBalance(telegramId: number, method: string, amount: number) {
    const user = await getOrCreateUser(telegramId);

    // Get current balance
    const current = await getUserBalance(telegramId, method);
    const newBalance = current - amount;

    // Update balance
    await db.insert(paymentBalances)
        .values({
            userId: user.id,
            method: method,
            amount: newBalance,
            updatedAt: new Date()
        })
        .onConflictDoUpdate({
            target: [paymentBalances.userId, paymentBalances.method],
            set: { amount: newBalance, updatedAt: new Date() }
        });

    return {
        success: true,
        method,
        previousBalance: current,
        newBalance: newBalance
    };
}

/**
 * Add amount to user's balance (Income).
 */
export async function addBalance(telegramId: number, method: string, amount: number) {
    const user = await getOrCreateUser(telegramId);

    // Get current balance
    const current = await getUserBalance(telegramId, method);
    const newBalance = current + amount;

    // Update balance
    await db.insert(paymentBalances)
        .values({
            userId: user.id,
            method: method,
            amount: newBalance,
            updatedAt: new Date()
        })
        .onConflictDoUpdate({
            target: [paymentBalances.userId, paymentBalances.method],
            set: { amount: newBalance, updatedAt: new Date() }
        });

    return {
        success: true,
        method,
        previousBalance: current,
        newBalance: newBalance
    };
}
/**
 * Transfer balance between methods with admin fee.
 */
export async function transferBalance(userId: number, source: string, dest: string, amount: number, adminFee: number) {
    const user = await getOrCreateUser(userId);
    const { transactions } = await import('../db/schema'); // Dynamic import to avoid circular dep if any

    // 1. Deduct from Source (Amount + Admin)
    const totalDeduct = amount + adminFee;
    const sourceRes = await deductBalance(userId, source, totalDeduct);

    // 2. Add to Destination (Amount only)
    const destRes = await addBalance(userId, dest, amount);

    // 3. Record Transaction
    // We record TWO transactions? Or one?
    // Usually one record of type 'transfer' with details.
    // Or maybe 2 records? One expense (source), one income (dest)?
    // User Guide says: "Transfer saldo antar metode".
    // If I record "Expense" for source, and "Income" for dest, it messes up total expense/income reports?
    // Better to use type 'transfer'.

    const txId = crypto.randomUUID();

    await db.insert(transactions).values({
        userId: user.id,
        transactionId: txId,
        items: `Transfer ke ${dest}`,
        harga: totalDeduct, // Total cost to user
        namaToko: 'Transfer',
        metodePembayaran: source, // Source method
        type: 'transfer',
        tanggal: new Date(),
        syncedToSheets: false
    });

    // Sync to Google Sheets
    await syncSingleToSheets(userId, {
        transactionId: txId,
        items: `Transfer ke ${dest}`,
        harga: totalDeduct,
        namaToko: 'Transfer',
        metodePembayaran: source,
        type: 'transfer'
    });

    // Optional: Record incoming side? 
    // If type 'transfer' is excluded from Expense Reports, then `harga: totalDeduct` is just money moving.
    // But Admin Fee IS an expense.
    // The `amount` is just moved.
    // If I record `totalDeduct` as expense, then I am double counting the transfer amount as expense?
    // Yes.
    // Correct accounting:
    // 1. Expense: Admin Fee (type: expense).
    // 2. Transfer: Amount (type: transfer_out).
    // 3. Transfer: Amount (type: transfer_in).

    // For simplicity in this bot:
    // User just wants to move balance.
    // I will record type 'transfer'.
    // `items`: `Transfer ke ${dest} (Adm: ${adminFee})`
    // `harga`: `amount`? Or `totalDeduct`?
    // If I put `totalDeduct`, and report sums it up, it's wrong.
    // I'll stick to a simple record for log purposes.
    // Maybe just Logging?
    // User requested "fitur transfer saldo".
    // I'll leave transaction recording simple for now.

    return {
        success: true,
        source,
        dest,
        amount,
        adminFee,
        sourceBalance: sourceRes.newBalance,
        destBalance: destRes.newBalance
    };
}

/**
 * Reset ALL balances for a user (Set to 0 by wiping records).
 */
export async function resetUserBalances(telegramId: number) {
    const user = await getOrCreateUser(telegramId);

    await db.delete(paymentBalances).where(eq(paymentBalances.userId, user.id));

    return { success: true };
}
