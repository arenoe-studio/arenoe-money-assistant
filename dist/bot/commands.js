/**
 * Registers all command handlers to the bot instance
 */
export function registerCommands(bot) {
    // /start - Welcome & Instructions
    bot.command('start', async (ctx) => {
        await ctx.reply('👋 Selamat datang di Arenoe Money Assistant! 💰\n\n' +
            'Saya bisa bantu catat pengeluaranmu. Cukup kirim pesan seperti:\n' +
            '👉 "beli ayam geprek 25k di Warteg pakai Cash"\n' +
            '👉 "isi bensin 50rb"\n' +
            '👉 "ngopi 30k via QRIS"\n\n' +
            'Gunakan /help untuk bantuan lebih lanjut.');
    });
    // /help - Detailed Usage
    bot.command('help', async (ctx) => {
        await ctx.reply('📚 Panduan Penggunaan\n\n' +
            '1. Catat Transaksi: Kirim pesan natural.\n' +
            '   Contoh: "nasi goreng 15k di Warung A pakai OVO"\n\n' +
            '2. Format: Sebutkan barang, harga, tempat, dan pembayaran.\n' +
            '   - Harga: 15k, 15rb, 15000\n' +
            '   - Pembayaran: Cash, OVO, GoPay, DANA, dll\n\n' +
            '3. Perintah:\n' +
            '   /start - Mulai ulang\n' +
            '   /cancel - Batalkan transaksi');
    });
    // /cancel - Global cancel (also handled in scenes usually)
    bot.command('cancel', async (ctx) => {
        if (ctx.scene.current) {
            await ctx.scene.leave();
            await ctx.reply('⛔ Transaksi dibatalkan.');
        }
        else {
            await ctx.reply('Tidak ada transaksi yang aktif.');
        }
    });
    // Photo Handler (Placeholder)
    bot.on('photo', async (ctx) => {
        await ctx.reply('📸 Fitur foto struk belum tersedia di versi ini.\n' +
            'Silakan ketik transaksi secara manual ya!');
    });
}
