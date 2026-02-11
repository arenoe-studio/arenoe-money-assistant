
import { Context } from 'telegraf';
import { logger } from './logger';

/**
 * Gets the download URL for a file from Telegram.
 * @param ctx Telegraf context
 * @param fileId The file ID to fetch
 * @returns The public URL of the file
 */
export async function getFileUrl(ctx: Context, fileId: string): Promise<string> {
    try {
        const url = await ctx.telegram.getFileLink(fileId);
        return url.href;
    } catch (error) {
        logger.error('Failed to get file URL', { fileId, error });
        throw new Error('Gagal mengambil link file dari Telegram.');
    }
}
