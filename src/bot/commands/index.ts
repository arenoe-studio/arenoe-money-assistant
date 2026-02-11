
import { Telegraf, Markup } from 'telegraf';
import { BotContext } from '../../types';
import { transactionScene, SCENE_ID } from '../scenes/transaction';
import { logger } from '../../utils/logger';

/**
 * Registers all command handlers to the bot instance
 */
export function registerCommands(bot: Telegraf<BotContext>) {

    // /start - Welcome & Instructions
    bot.command('start', async (ctx) => {
        await ctx.reply(
            '👋 Selamat datang di Arenoe Money Assistant! 💰\n\n' +
            'Saya bisa bantu catat pengeluaranmu. Cukup kirim pesan seperti:\n' +
            '👉 "beli ayam geprek 25k di Warteg pakai Cash"\n' +
            '👉 "isi bensin 50rb"\n' +
            '👉 "ngopi 30k via QRIS"\n\n' +
            'Gunakan /help untuk bantuan lebih lanjut.',
            Markup.removeKeyboard()
        );
    });

    // /help - Detailed Usage
    bot.command('help', async (ctx) => {
        await ctx.reply(
            '📚 Panduan Penggunaan\n\n' +
            '1. Catat Transaksi: Kirim pesan natural.\n' +
            '   Contoh: "nasi goreng 15k di Warung A pakai OVO"\n\n' +
            '2. Format: Sebutkan barang, harga, tempat, dan pembayaran.\n' +
            '   - Harga: 15k, 15rb, 15000\n' +
            '   - Pembayaran: Cash, OVO, GoPay, DANA, dll\n\n' +
            '3. Perintah:\n' +
            '   /start - Mulai ulang\n' +
            '   /setting - Menu Pengaturan (Tambah Metode, Atur Saldo, Transfer)\n' +
            '   /cek - Lihat semua saldo\n' +
            '   /income - Catat pemasukan\n' +
            '   /paylater - Menu Hutang (Catat Hutang, Bayar Hutang)\n' +
            '   /laporan - Laporan Keuangan (Harian, Bulanan, Custom)\n' +
            '   /cancel - Batalkan transaksi'
        );
    });

    // /setting - Settings Menu
    bot.command('setting', async (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('➕ Tambah Metode Bayar', 'settings_add_payment')],
            [Markup.button.callback('💰 Atur Saldo Awal', 'settings_set_balance')],
            [Markup.button.callback('💸 Transfer Saldo', 'settings_transfer')],
            [Markup.button.callback('🔙 Tutup', 'settings_close')]
        ]);

        await ctx.reply('⚙️ Menu Pengaturan\nSilakan pilih opsi di bawah ini:', keyboard);
    });

    // Settings Actions
    bot.action('settings_add_payment', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('🆕 Tambah Metode Pembayaran');
        // Import scene ID to avoid circular dependency issues if possible, or use string literal
        await ctx.scene.enter('add_payment_wizard');
    });

    bot.action('settings_set_balance', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('💰 Atur Saldo Awal');
        await ctx.scene.enter('balance_wizard');
    });

    bot.action('settings_transfer', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('💸 Transfer Saldo');
        await ctx.scene.enter('transfer_wizard');
    });

    bot.action('settings_close', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
    });

    // /paylater - Paylater Menu
    bot.command('paylater', async (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💳 Hutang Baru', 'paylater_hutang')],
            [Markup.button.callback('💰 Bayar Hutang', 'paylater_bayar')],
            [Markup.button.callback('🔙 Tutup', 'paylater_close')]
        ]);

        await ctx.reply('💸 Menu Paylater\nSilakan pilih opsi di bawah ini:', keyboard);
    });

    // Paylater Actions
    bot.action('paylater_hutang', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('💳 Catat Hutang Baru');
        await ctx.scene.enter('hutang_wizard');
    });

    bot.action('paylater_bayar', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.editMessageText('💰 Bayar Hutang');
        await ctx.scene.enter('bayar_wizard');
    });

    bot.action('paylater_close', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
    });


    // /cancel - Global cancel (also handled in scenes usually)
    bot.command('cancel', async (ctx) => {
        if (ctx.scene.current) {
            await ctx.scene.leave();
            await ctx.reply('⛔ Transaksi dibatalkan.');
        } else {
            await ctx.reply('Tidak ada transaksi yang aktif.');
        }
    });

    // /transfer - Transfer Balance (Shortcut)
    bot.command('transfer', async (ctx) => {
        await ctx.scene.enter('transfer_wizard');
    });

    // /cek - Check Menu
    bot.command('cek', async (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('💰 Cek Saldo', 'cek_saldo')],
            [Markup.button.callback('📉 Cek Hutang', 'cek_hutang')],
            [Markup.button.callback('🔙 Tutup', 'cek_close')]
        ]);
        await ctx.reply('🔍 Menu Pengecekan\nSilakan pilih opsi:', keyboard);
    });

    bot.action('cek_close', async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
    });

    bot.action('cek_menu', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('💰 Cek Saldo', 'cek_saldo')],
                [Markup.button.callback('📉 Cek Hutang', 'cek_hutang')],
                [Markup.button.callback('🔙 Tutup', 'cek_close')]
            ]);
            await ctx.editMessageText('🔍 Menu Pengecekan\nSilakan pilih opsi:', keyboard);
        } catch (error) {
            // Ignore if message is not modified
        }
    });

    bot.action('cek_saldo', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const { getAllUserBalances } = await import('../../services/balance');
            const { formatCurrency } = await import('../../utils/currency');

            const balances = await getAllUserBalances(ctx.from!.id);

            let msg = '';
            if (balances.length === 0) {
                msg = '📭 Belum ada metode pembayaran.\nGunakan /setting untuk menambah metode bayar.';
            } else {
                msg = '💰 Saldo Pembayaran:\n\n';
                let total = 0;

                balances.forEach(b => {
                    msg += `• ${b.method}: ${formatCurrency(b.amount || 0)}\n`;
                    total += (b.amount || 0);
                });

                msg += `\n📊 Total Aset: ${formatCurrency(total)}`;
            }

            await ctx.editMessageText(msg, Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Kembali', 'cek_menu')]
            ]));
        } catch (error) {
            logger.error('Error checking balance', { error });
            await ctx.reply('❌ Gagal memuat saldo.');
        }
    });

    bot.action('cek_hutang', async (ctx) => {
        try {
            await ctx.answerCbQuery();
            const { getUserDebts } = await import('../../services/debt');
            const { formatCurrency } = await import('../../utils/currency');

            const debts = await getUserDebts(ctx.from!.id, 'unpaid');

            let msg = '';
            if (debts.length === 0) {
                msg = '✅ Tidak ada hutang yang belum dibayar!';
            } else {
                msg = '📉 Daftar Hutang Belum Lunas:\n\n';
                let total = 0;

                debts.forEach(d => {
                    msg += `• ${d.creditorName} — ${formatCurrency(d.amount)}\n`;
                    total += d.amount;
                });

                msg += `\n💰 Total Hutang: ${formatCurrency(total)}`;
            }

            await ctx.editMessageText(msg, Markup.inlineKeyboard([
                [Markup.button.callback('🔙 Kembali', 'cek_menu')]
            ]));

        } catch (error) {
            logger.error('Error checking debts', { error });
            await ctx.reply('❌ Gagal memuat data hutang.');
        }
    });

    // /laporan - Financial Report
    bot.command('laporan', async (ctx) => {
        await ctx.scene.enter('report_wizard');
    });

    // /income - Add income
    bot.command('income', async (ctx) => {
        await ctx.scene.enter('income_wizard');
    });

    // /resetsaldo - Reset Data Application (Balances & Custom Methods)
    bot.command('resetsaldo', async (ctx) => {
        try {
            const { resetUserBalances } = await import('../../services/balance');
            const { resetUserMethods } = await import('../../services/payment');

            await Promise.all([
                resetUserBalances(ctx.from.id),
                resetUserMethods(ctx.from.id)
            ]);

            await ctx.reply('✅ Data Berhasil Direset!\n\n• Semua saldo dikembalikan ke 0.\n• Metode pembayaran dikembalikan ke standar (Cash, Bank Bawaan, E-Wallet Bawaan).\n\nSilakan gunakan /cek untuk memastikan.');
        } catch (error) {
            logger.error('Error resetting saldo', { error });
            await ctx.reply('❌ Gagal mereset data.');
        }
    });

    // Photo Handler (Receipt Scanning)
    bot.on('photo', async (ctx) => {
        logger.info('Photo received, entering transaction wizard', { userId: ctx.from.id });
        await ctx.scene.enter(SCENE_ID);
    });
}
