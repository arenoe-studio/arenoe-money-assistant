
import { google } from 'googleapis';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Generate OAuth2 authorization URL for user to click
 */
export function getAuthUrl(telegramId: number): string {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: telegramId.toString(), // Pass telegram ID via state param
        prompt: 'consent' // Force consent screen to get refresh token
    });
}

/**
 * Exchange authorization code for tokens and save to database
 */
export async function handleOAuthCallback(code: string, telegramId: number) {
    try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
            throw new Error('No refresh token received. User may have already authorized.');
        }

        // Save refresh token to database
        await db.update(users)
            .set({
                refreshToken: tokens.refresh_token,
                updatedAt: new Date()
            })
            .where(eq(users.telegramId, telegramId));

        logger.info(`OAuth tokens saved for user ${telegramId}`);

        return { success: true };
    } catch (error: any) {
        logger.error('OAuth callback error', { error: error.message });
        throw error;
    }
}

/**
 * Save spreadsheet ID for a user
 */
export async function saveSpreadsheetId(telegramId: number, spreadsheetId: string) {
    await db.update(users)
        .set({
            spreadsheetId,
            updatedAt: new Date()
        })
        .where(eq(users.telegramId, telegramId));

    logger.info(`Spreadsheet ID saved for user ${telegramId}`);
}
