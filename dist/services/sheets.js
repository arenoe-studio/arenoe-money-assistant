import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { ApplicationError } from '../utils/error';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentTimestamp } from '../utils/datetime';
dotenv.config();
// Initialize OAuth2 client
// Note: In real implementation, we need to handle token refresh flow
// For now, checks if we have credentials
const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
/**
 * Appends a transaction to the user's Google Sheet.
 * @param userId Telegram User ID
 * @param transaction Validated transaction data
 */
export async function writeTransaction(userId, transaction) {
    try {
        // 1. Fetch user credentials from DB to get refresh token & spreadsheet ID
        // We assume the schema exists, I will create it in a moment if not present
        // For now, this is a placeholder query that matches our plan
        /*
        const user = await db.query.users.findFirst({
            where: eq(users.telegramId, userId)
        });
    
        if (!user || !user.refreshToken || !user.spreadsheetId) {
            throw new ApplicationError('Google Sheets belum terhubung. Silakan konfigurasi terlebih dahulu.');
        }
    
        // Set credentials
        oauth2Client.setCredentials({
            refresh_token: user.refreshToken // In real app, decrypt this first
        });
        */
        // MOCK IMPLEMENTATION FOR PHASE 3 INITIALIZATION
        // Since we haven't implemented the User OAuth flow/endpoints yet, 
        // we cannot actually write without a valid token in DB.
        // This function will be fully enabled once we have the User model and OAuth flow.
        logger.info(`[MOCK] Writing transaction to Google Sheets for user ${userId}`, transaction);
        // In a real flow:
        // const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        // await sheets.spreadsheets.values.append({ ... });
    }
    catch (error) {
        logger.error('Google Sheets Write Error', { error, userId });
        throw new ApplicationError('Gagal menyimpan ke Google Sheets', false);
    }
}
/**
 * Writes multiple items as a batch transaction (sharing same Transaction ID)
 */
export async function writeBatchTransaction(userId, transactions) {
    const transactionId = uuidv4();
    const timestamp = getCurrentTimestamp();
    const rows = transactions.map(tx => [
        transactionId,
        tx.items,
        tx.harga,
        tx.namaToko,
        tx.metodePembayaran,
        timestamp
    ]);
    // TODO: Call Sheets API with batchUpdate
    logger.info(`[MOCK] Writing batch transaction ${transactionId} with ${rows.length} rows`);
}
