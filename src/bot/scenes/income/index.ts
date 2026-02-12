
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';
import { getUserPaymentMethods } from '../../../services/payment';
import { addBalance } from '../../../services/balance';
import { parseCurrency, formatCurrency } from '../../../utils/currency';
import { getPaymentMenu } from '../../../utils/keyboard';

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

        if (action.startsWith('pay_')) {
            const method = action.replace('pay_', '');
            (ctx.wizard.state as any).method = method;
            await ctx.answerCbQuery();

            await ctx.editMessageText(
                `✅ Metode: ${method}\n\n📝 Masukkan nominal income.\n\nContoh: 500k, 5jt, 1500000`
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

const step2_processAmount = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
        await ctx.reply('⚠️ Format salah. Kirim nominal (contoh: 500k)');
        return;
    }

    try {
        const amount = parseCurrency(text);

        if (!amount || amount <= 0) {
            await ctx.reply('⚠️ Nominal tidak valid atau harus lebih dari 0.');
            return;
        }

        (ctx.wizard.state as any).amount = amount;

        await ctx.reply(
            `✅ Nominal: ${formatCurrency(amount)}\n\n📝 Masukkan keterangan income.\n\nContoh: Gaji, Bonus, Freelance`
        );
        return ctx.wizard.next();

    } catch (error) {
        await ctx.reply('⚠️ Format nominal tidak valid. Coba lagi (contoh: 500k, 5jt)');
        return;
    }
};

const step3_processDescription = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text || text.trim().length === 0) {
        await ctx.reply('⚠️ Keterangan tidak boleh kosong.');
        return;
    }

    (ctx.wizard.state as any).description = text.trim();

    await ctx.reply(
        `✅ Keterangan: ${text.trim()}\n\n📅 Kapan income ini diterima?\n\nKirim tanggal (contoh: "2 februari 2026", "kemarin") atau ketik "today" untuk hari ini.`
    );
    return ctx.wizard.next();
};

const step4_processDate = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text?.trim().toLowerCase() : '';

    if (!text) {
        await ctx.reply('⚠️ Format salah. Kirim tanggal atau "today".');
        return;
    }

    let tanggal: Date;

    if (text === 'today' || text === 'hari ini') {
        tanggal = new Date();
    } else {
        // Parse dengan AI untuk tanggal natural
        try {
            const { parseIncomeMessage } = await import('../../../services/income-parser');
            const parsed = await parseIncomeMessage(text);

            if (parsed.tanggal) {
                tanggal = new Date(parsed.tanggal);
            } else {
                tanggal = new Date(); // Fallback ke today
            }
        } catch (error) {
            logger.warn('Failed to parse date with AI, using today', { error });
            tanggal = new Date();
        }
    }

    (ctx.wizard.state as any).tanggal = tanggal;

    return step5_finalize(ctx);
};

const step5_finalize = async (ctx: BotContext) => {
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

        const transactionDate = tanggal || new Date();

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

        // 3. Sync to Google Sheets (tanggal as YYYY-MM-DD only, no time)
        const dateOnly = transactionDate.toISOString().split('T')[0]; // YYYY-MM-DD

        await syncSingleToSheets(ctx.from!.id, {
            transactionId: txId,
            items: description,
            harga: amount,
            namaToko: 'Income',
            metodePembayaran: method,
            tanggal: dateOnly,
            type: 'income'
        });

        const dateDisplay = transactionDate.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        await ctx.reply(
            `✅ Income Tercatat:\n\n` +
            `📝 Keterangan: ${description}\n` +
            `💰 Nominal: ${formatCurrency(amount)}\n` +
            `📅 Tanggal: ${dateDisplay}\n` +
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
    step2_processAmount,
    step3_processDescription,
    step4_processDate,
    step5_finalize
);
