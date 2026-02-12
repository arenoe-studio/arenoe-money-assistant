
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';
import { getUserPaymentMethods } from '../../../services/payment';
import { addBalance } from '../../../services/balance';
import { parseCurrency, formatCurrency } from '../../../utils/currency';
import { titleCase } from '../../../utils/format';
import { getPaymentMenu } from '../../../utils/keyboard';
import { parseIncomeMessage } from '../../../services/income-parser';

export const INCOME_SCENE_ID = 'income_wizard';

const step0_askMethod = async (ctx: BotContext) => {
    try {
        const methods = await getUserPaymentMethods(ctx.from!.id);
        const keyboard = getPaymentMenu('main', methods);

        await ctx.reply('💰 Untuk metode apa income ini?', keyboard);
        return ctx.wizard.next();
    } catch (error) {
        logger.error('Income Scene Step 0 Error', { error });
        await ctx.reply('Terjadi kesalahan memuat data.');
        return ctx.scene.leave();
    }
};

/**
 * Helper to handle category navigation in income scene
 */
const handleIncomeCategoryNav = async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        // Category Navigation
        if (action.startsWith('cat_')) {
            const category = action.replace('cat_', '');
            const type = category === 'main' ? 'main' : category;


            const methods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu(type as any, methods);

            let message = '💰 Untuk metode apa income ini?';
            if (type === 'bank') message = '🏦 Pilih Bank:';
            if (type === 'ewallet') message = '📱 Pilih E-Wallet:';

            try {
                await ctx.editMessageText(message, keyboard);
            } catch (e) {
                // Ignore if message is same
            }
            await ctx.answerCbQuery();
            return 'NAVIGATING';
        }
    }
    return 'NONE';
};

const step1_processMethod = async (ctx: BotContext) => {
    // First, check if it's category navigation
    const navResult = await handleIncomeCategoryNav(ctx);
    if (navResult === 'NAVIGATING') return; // Stay in step

    // Handle payment selection
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        // Use 'pay_' prefix to match other scenes
        if (action.startsWith('pay_')) {
            const method = action.replace('pay_', '');
            (ctx.wizard.state as any).method = method;
            await ctx.answerCbQuery();

            await ctx.editMessageText(
                `✅ Metode: ${method}\n\n📝 Masukkan keterangan dan nominal income.\n\nContoh:\n• "Gaji 5jt"\n• "Bonus 500rb"\n• "2 februari 2026 dapat uang freelance 2jt"`
            );
            return ctx.wizard.next();
        }
    }

    // Ignore text input
    if (ctx.message) {
        await ctx.reply('⚠️ Mohon pilih metode menggunakan tombol.');
        return;
    }
};

const step2_processInput = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
        await ctx.reply('⚠️ Format salah. Kirim teks deskripsi dan nominal.');
        return;
    }

    try {
        // Use AI parser for better extraction
        const parsed = await parseIncomeMessage(text);

        if (!parsed.amount || parsed.amount <= 0) {
            await ctx.reply('⚠️ Nominal tidak ditemukan atau tidak valid. Pastikan menulis angka (contoh: 5jt, 50000).');
            return;
        }

        (ctx.wizard.state as any).amount = parsed.amount;
        (ctx.wizard.state as any).description = parsed.description || 'Income';
        (ctx.wizard.state as any).tanggal = parsed.tanggal; // ISO string or null

        return step3_finalize(ctx);

    } catch (error) {
        logger.error('Income Process Error', { error });
        await ctx.reply('❌ Gagal memproses input. Coba lagi dengan format: "Gaji 5jt" atau "Bonus 500rb"');
        return;
    }
};

const step3_finalize = async (ctx: BotContext) => {
    const state = ctx.wizard.state as any;
    const { amount, description, method, tanggal } = state;

    try {
        // 1. Add Balance
        const result = await addBalance(ctx.from!.id, method, amount);

        // 2. Save Transaction Record
        const { db } = await import('../../../db/client');
        const { transactions: transactionTable } = await import('../../../db/schema');
        const { getOrCreateUser } = await import('../../../services/user');
        const { syncSingleToSheets } = await import('../../../services/sheets');

        const user = await getOrCreateUser(ctx.from!.id);
        const txId = crypto.randomUUID();

        // Parse tanggal if provided
        const transactionDate = tanggal ? new Date(tanggal) : new Date();

        await db.insert(transactionTable).values({
            userId: user.id,
            transactionId: txId,
            items: description,
            harga: amount,
            namaToko: 'Income',
            metodePembayaran: method,
            type: 'income',
            tanggal: transactionDate,
            syncedToSheets: false
        });

        // 3. Sync to Google Sheets
        await syncSingleToSheets(ctx.from!.id, {
            transactionId: txId,
            items: description,
            harga: amount,
            namaToko: 'Income',
            metodePembayaran: method,
            tanggal: transactionDate.toISOString(),
            type: 'income'
        });

        // Format tanggal untuk display
        const dateDisplay = tanggal
            ? `\n📅 Tanggal: ${new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
            : '';

        await ctx.reply(
            `✅ Income Tercatat:\n\n` +
            `📝 Keterangan: ${description}\n` +
            `💰 Nominal: ${formatCurrency(amount)}${dateDisplay}\n` +
            `💳 Metode: ${method}\n` +
            `📈 Saldo Baru: ${formatCurrency(result.newBalance)}`
        );

        return ctx.scene.leave();
    } catch (error) {
        logger.error('Income Finalize Error', { error });
        await ctx.reply('❌ Gagal mencatat income.');
        return ctx.scene.leave();
    }
};

export const incomeScene = new Scenes.WizardScene<BotContext>(
    INCOME_SCENE_ID,
    step0_askMethod,
    step1_processMethod,
    step2_processInput,
    step3_finalize
);
