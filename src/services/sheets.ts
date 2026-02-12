
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { ApplicationError } from '../utils/error';
import { logger } from '../utils/logger';
import { db } from '../db/client';
import { users, transactions } from '../db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentTimestamp } from '../utils/datetime';

dotenv.config();

// Shared OAuth2 client instance
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/** Data shape for a single row to write to Sheets. */
export interface SheetRow {
  transactionId: string;
  items: string;
  harga: number;
  namaToko: string;
  metodePembayaran: string;
  tanggal?: string; // ISO string; defaults to now
  type: 'expense' | 'income' | 'transfer' | 'debt';
}

/**
 * Initializes a Google Sheets client for a specific user.
 * Returns null if the user hasn't connected Sheets yet (silent no-op).
 */
async function getSheetsClient(telegramId: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.telegramId, telegramId)
  });

  if (!user || !user.refreshToken || !user.spreadsheetId) {
    logger.debug(`User ${telegramId} has not connected Google Sheets. Skipping.`);
    return null;
  }

  oauth2Client.setCredentials({ refresh_token: user.refreshToken });
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  return { sheets, spreadsheetId: user.spreadsheetId };
}

/**
 * Writes one or more rows to the user's Google Sheet, then marks them
 * as synced in the Neon database.
 *
 * @param telegramId Telegram user ID
 * @param rows       Array of SheetRow objects to append
 * @param batchTransactionId  The shared transactionId used in DB records
 */
export async function syncToSheets(
  telegramId: number,
  rows: SheetRow[],
  batchTransactionId: string
): Promise<void> {
  try {
    const client = await getSheetsClient(telegramId);
    if (!client) return; // User hasn't connected Sheets — silent no-op

    const { sheets, spreadsheetId } = client;

    // Map rows to the Sheet column structure:
    // A: Transaction ID | B: Items | C: Harga | D: Nama Toko | E: Metode Pembayaran | F: Tanggal | G: Type
    const sheetRows = rows.map(r => [
      r.transactionId,
      r.items,
      r.harga,
      r.namaToko,
      r.metodePembayaran,
      r.tanggal || getCurrentTimestamp(),
      r.type
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Transactions!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: sheetRows }
    });

    // Mark DB records as synced
    await db.update(transactions)
      .set({ syncedToSheets: true, lastSyncAt: new Date() })
      .where(eq(transactions.transactionId, batchTransactionId));

    logger.info(`Synced ${sheetRows.length} row(s) to Sheets for user ${telegramId} [txId=${batchTransactionId}]`);
  } catch (error: any) {
    // Non-blocking: transaction is already saved in DB.
    logger.error('Google Sheets Sync Error', { error: error.message, telegramId, batchTransactionId });
  }
}

/**
 * Convenience: sync a single transaction record.
 */
export async function syncSingleToSheets(
  telegramId: number,
  row: SheetRow
): Promise<void> {
  return syncToSheets(telegramId, [row], row.transactionId);
}
