
import { Composer } from 'telegraf';
import { BotContext } from '../../types';
import { getAuthUrl, saveSpreadsheetId } from '../../services/oauth';
import { logger } from '../../utils/logger';

export const connectSheetsCommand = new Composer<BotContext>();

connectSheetsCommand.command('connectsheets', async (ctx) => {
    try {
        const telegramId = ctx.from.id;

        // Generate OAuth URL
        const authUrl = getAuthUrl(telegramId);

        const keyboard = {
            inline_keyboard: [
                [{ text: '🔐 Login Google Account', url: authUrl }]
            ]
        };

        await ctx.reply(
            '🔗 *Hubungkan Google Sheets*\n\n' +
            'Klik tombol di bawah untuk login dan memberikan izin akses ke Google Sheets Anda.\n\n' +
            'Setelah sukses, copy **ID Spreadsheet** Anda (bagian acak di URL Sheet setelah `/d/`) dan kirim perintah:\n\n' +
            '`/setsheet ID_SPREADSHEET`',
            {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            }
        );

        logger.info(`User ${telegramId} requested Google Sheets connection`);
    } catch (error: any) {
        logger.error('Connect sheets error', { error: error.message });
        await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
});

connectSheetsCommand.command('setsheet', async (ctx) => {
    try {
        const telegramId = ctx.from.id;
        const args = ctx.message.text.split(' ');

        if (args.length < 2) {
            await ctx.reply(
                '⚠️ Format salah. Gunakan:\n' +
                '`/setsheet SPREADSHEET_ID`\n\n' +
                'Contoh:\n' +
                '`/setsheet 1abc123xyz456def789`',
                { parse_mode: 'Markdown' }
            );
            return;
        }

        const spreadsheetId = args[1].trim();

        // Validate format (basic check)
        if (spreadsheetId.length < 20) {
            await ctx.reply('❌ Spreadsheet ID tidak valid. Pastikan Anda copy ID yang benar.');
            return;
        }

        await saveSpreadsheetId(telegramId, spreadsheetId);

        await ctx.reply(
            '✅ *Berhasil!*\n\n' +
            'Google Sheets Anda telah terhubung. Mulai sekarang:\n\n' +
            '📱 Transaksi dari Telegram → Otomatis masuk ke Sheets\n' +
            '📊 Edit di Sheets → Otomatis update di Bot\n\n' +
            'Coba catat transaksi sekarang! 🎉',
            { parse_mode: 'Markdown' }
        );

        logger.info(`Spreadsheet ${spreadsheetId} connected for user ${telegramId}`);
    } catch (error: any) {
        logger.error('Set sheet error', { error: error.message });
        await ctx.reply('❌ Gagal menyimpan Spreadsheet ID. Silakan coba lagi.');
    }
});
