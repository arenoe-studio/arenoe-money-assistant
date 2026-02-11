
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { Transaction } from '../schemas/transaction';
import { ApplicationError } from '../utils/error';
import { logger } from '../utils/logger';
import { db } from '../db/client';
import { users } from '../db/schema'; // We'll create this schema next
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentTimestamp } from '../utils/datetime';

dotenv.config();

// Initialize OAuth2 client
// Note: In real implementation, we need to handle token refresh flow
// For now, checks if we have credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * Appends a transaction to the user's Google Sheet.
 * @param userId Telegram User ID
 * @param transaction Validated transaction data
 */
export async function writeTransaction(userId: number, transaction: Transaction): Promise<void> {
  try {
    // 1. Fetch user credentials from DB to get refresh token & spreadsheet ID
    const user = await db.query.users.findFirst({
      where: eq(users.telegramId, userId)
    });

    if (!user || !user.refreshToken || !user.spreadsheetId) {
      logger.warn(`User ${userId} has not connected Google Sheets yet. Skipping write.`);
      return; // Silent fail - user hasn't setup sheets yet
    }

    // 2. Set credentials with refresh token
    oauth2Client.setCredentials({
      refresh_token: user.refreshToken
    });

    // 3. Initialize Sheets API
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // 4. Prepare row data matching our sheet structure
    // Columns: Transaction ID | Items | Harga | Nama Toko | Metode Pembayaran | Tanggal | Type
    const row = [
      crypto.randomUUID(), // Transaction ID
      transaction.items,
      transaction.harga,
      transaction.namaToko,
      transaction.metodePembayaran,
      getCurrentTimestamp(),
      'expense' // Default type, could be dynamic based on transaction context
    ];

    // 5. Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: user.spreadsheetId,
      range: 'Transactions!A:G', // Sheet name and column range
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row]
      }
    });

    logger.info(`Successfully wrote transaction to Google Sheets for user ${userId}`);

  } catch (error: any) {
    logger.error('Google Sheets Write Error', { error: error.message, userId });
    // Don't throw - we don't want to block the transaction if sheets fails
    // Transaction is already saved in DB, sheets is just a mirror
  }
}

/**
 * Writes multiple items as a batch transaction (sharing same Transaction ID)
 */
export async function writeBatchTransaction(
  userId: number,
  transactions: Transaction[],
  overrideTransactionId?: string
): Promise<void> {
  try {
    // 1. Fetch user credentials
    const user = await db.query.users.findFirst({
      where: eq(users.telegramId, userId)
    });

    if (!user || !user.refreshToken || !user.spreadsheetId) {
      logger.warn(`User ${userId} has not connected Google Sheets yet. Skipping batch write.`);
      return; // Silent fail
    }

    // 2. Set credentials
    oauth2Client.setCredentials({
      refresh_token: user.refreshToken
    });

    // 3. Initialize Sheets API
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // 4. Generate shared transaction ID
    const transactionId = overrideTransactionId || crypto.randomUUID();
    const timestamp = getCurrentTimestamp();

    // 5. Prepare rows
    const rows = transactions.map(tx => [
      transactionId,
      tx.items,
      tx.harga,
      tx.namaToko,
      tx.metodePembayaran,
      timestamp,
      'expense'
    ]);

    // 6. Batch append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: user.spreadsheetId,
      range: 'Transactions!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows
      }
    });

    logger.info(`Successfully wrote batch transaction ${transactionId} with ${rows.length} rows for user ${userId}`);

  } catch (error: any) {
    logger.error('Google Sheets Batch Write Error', { error: error.message, userId });
    // Don't throw - transaction already saved in DB
  }
}
