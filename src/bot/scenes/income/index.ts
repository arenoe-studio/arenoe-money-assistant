
import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';
import { getUserPaymentMethods } from '../../../services/payment';
import { addBalance } from '../../../services/balance';
import { parseCurrency, formatCurrency } from '../../../utils/currency';
import { getPaymentMenu } from '../../../utils/keyboard';
import { parseIncomeMessage } from '../../../services/income-parser';
import { parseDateAsWIB } from '../../../utils/format';

export const INCOME_SCENE_ID = 'income_wizard';

/**
 * INCOME WIZARD — Smart AI-Powered Flow
 * 
 * Flow:
 * Step 0: Ask user to describe their income (free text)
 * Step 1: AI parses the message → extract amount, description, date
 *         Then ask for payment method (only thing we need interactively)
 * Step 2: Process payment method selection → finalize
 * 
 * If AI can't extract amount/description, falls back to asking step by step.
 */

const step0_askInput = async (ctx: BotContext) => {
    try {
        await ctx.reply(
            '💰 Catat Income Baru\n\n' +
            'Tulis detail pemasukan kamu dalam satu pesan.\n\n' +
            'Contoh:\n' +
            '👉 "Gaji 5jt"\n' +
            '👉 "Freelance 500k 6 februari 2026"\n' +
            '👉 "Bonus proyek 2.5jt kemarin"\n\n' +
            'Saya akan otomatis mendeteksi nominal, keterangan, dan tanggal.'
        );
        return ctx.wizard.next();
    } catch (error) {
        logger.error('Income Scene Step 0 Error', { error });
        await ctx.reply('Terjadi kesalahan.');
        return ctx.scene.leave();
    }
};

const step1_parseAndAskMethod = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text || text.trim().length === 0) {
        await ctx.reply('⚠️ Mohon kirim pesan teks tentang income kamu.');
        return;
    }

    let processingMsg;
    try {
        processingMsg = await ctx.reply('⏳ Memproses...');

        // Parse with AI
        const parsed = await parseIncomeMessage(text);

        // Clean up processing message
        if (processingMsg) {
            try { await ctx.deleteMessage(processingMsg.message_id); } catch (e) { /* ignore */ }
        }

        const state = ctx.wizard.state as any;

        // Store parsed data
        state.description = parsed.description || null;
        state.amount = parsed.amount || null;
        state.tanggalStr = parsed.tanggal || null;

        logger.info('Income AI Parse Result', {
            input: text,
            description: state.description,
            amount: state.amount,
            tanggal: state.tanggalStr
        });

        // Validate: We need at least amount
        if (!state.amount) {
            // Try local regex parsing as fallback
            const localAmount = parseCurrency(text);
            if (localAmount && localAmount > 0) {
                state.amount = localAmount;
                // If only amount found, use original text as description hint
                if (!state.description) {
                    state.description = null; // Will ask later
                }
            }
        }

        // If still no amount, ask manually
        if (!state.amount) {
            await ctx.reply(
                '⚠️ Saya tidak bisa mendeteksi nominal dari pesan kamu.\n\n' +
                '💰 Masukkan nominal income:\n' +
                'Contoh: 500k, 5jt, 1500000'
            );
            // Go to manual amount step
            ctx.wizard.selectStep(3); // step4_manualAmount
            return;
        }

        // If no description, ask manually
        if (!state.description) {
            await ctx.reply(
                `✅ Nominal: ${formatCurrency(state.amount)}\n\n` +
                '📝 Masukkan keterangan income:\n' +
                'Contoh: Gaji, Bonus, Freelance'
            );
            ctx.wizard.selectStep(4); // step5_manualDescription
            return;
        }

        // Build confirmation summary
        let summary = '🔍 Data terdeteksi:\n\n';
        summary += `📝 Keterangan: ${state.description}\n`;
        summary += `💰 Nominal: ${formatCurrency(state.amount)}\n`;

        if (state.tanggalStr) {
            const parsedDate = parseDateAsWIB(state.tanggalStr);
            state.tanggal = parsedDate;
            const dateDisplay = parsedDate.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
            summary += `📅 Tanggal: ${dateDisplay}\n`;
        } else {
            state.tanggal = new Date();
            summary += `📅 Tanggal: Hari ini\n`;
        }

        summary += '\n💳 Pilih metode pembayaran:';

        await ctx.reply(summary);

        // Show payment method selection
        const methods = await getUserPaymentMethods(ctx.from!.id);
        const keyboard = getPaymentMenu('main', methods);
        await ctx.reply('💳 Metode pembayaran:', keyboard);

        return ctx.wizard.next(); // Go to step2_processMethod

    } catch (error: any) {
        if (processingMsg) {
            try { await ctx.deleteMessage(processingMsg.message_id); } catch (e) { /* ignore */ }
        }
        logger.error('Income Parse Error', { error: error.message });

        // Fallback: try simple currency parsing
        const localAmount = parseCurrency(text);
        if (localAmount && localAmount > 0) {
            const state = ctx.wizard.state as any;
            state.amount = localAmount;
            state.description = null;

            await ctx.reply(
                `✅ Nominal: ${formatCurrency(localAmount)}\n\n` +
                '📝 Masukkan keterangan income:\n' +
                'Contoh: Gaji, Bonus, Freelance'
            );
            ctx.wizard.selectStep(4); // step5_manualDescription
            return;
        }

        await ctx.reply('❌ Gagal memproses pesan. Coba lagi dengan format:\n"Gaji 5jt" atau "Freelance 500k"');
        return;
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

            let message = '💳 Metode pembayaran:';
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

const step2_processMethod = async (ctx: BotContext) => {
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

            try {
                await ctx.editMessageText(`✅ Metode: ${method}`);
            } catch (e) { /* ignore */ }

            // Finalize
            return finalizeIncome(ctx);
        }
    }

    // Ignore text input
    if (ctx.message) {
        await ctx.reply('⚠️ Mohon pilih metode menggunakan tombol di atas.');
        return;
    }
};

/**
 * Manual amount entry (fallback when AI can't detect amount)
 */
const step4_manualAmount = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
        await ctx.reply('⚠️ Kirim nominal (contoh: 500k, 5jt)');
        return;
    }

    const amount = parseCurrency(text);
    if (!amount || amount <= 0) {
        await ctx.reply('⚠️ Nominal tidak valid. Coba lagi (contoh: 500k, 5jt, 1500000)');
        return;
    }

    const state = ctx.wizard.state as any;
    state.amount = amount;

    if (!state.description) {
        await ctx.reply(
            `✅ Nominal: ${formatCurrency(amount)}\n\n` +
            '📝 Masukkan keterangan income:\n' +
            'Contoh: Gaji, Bonus, Freelance'
        );
        return ctx.wizard.next(); // Go to step5_manualDescription
    }

    // Have both amount and description, ask for date
    await ctx.reply(
        `✅ Nominal: ${formatCurrency(amount)}\n\n` +
        '📅 Kapan income ini diterima?\n\n' +
        'Kirim tanggal (contoh: "2 februari 2026", "kemarin") atau ketik "today" untuk hari ini.'
    );
    ctx.wizard.selectStep(5); // step6_manualDate
    return;
};

/**
 * Manual description entry  
 */
const step5_manualDescription = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    if (!text || text.trim().length === 0) {
        await ctx.reply('⚠️ Keterangan tidak boleh kosong.');
        return;
    }

    const state = ctx.wizard.state as any;
    state.description = text.trim();

    if (!state.tanggalStr && !state.tanggal) {
        await ctx.reply(
            `✅ Keterangan: ${text.trim()}\n\n` +
            '📅 Kapan income ini diterima?\n\n' +
            'Kirim tanggal (contoh: "2 februari 2026", "kemarin") atau ketik "today" untuk hari ini.'
        );
        return ctx.wizard.next(); // Go to step6_manualDate
    }

    // Have everything except method, ask method
    const methods = await getUserPaymentMethods(ctx.from!.id);
    const keyboard = getPaymentMenu('main', methods);
    await ctx.reply(`✅ Keterangan: ${text.trim()}\n\n💳 Pilih metode pembayaran:`, keyboard);
    // Jump to method step
    ctx.wizard.selectStep(2); // step2_processMethod (index 2 in wizard)
    return;
};

/**
 * Manual date entry
 */
const step6_manualDate = async (ctx: BotContext) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text?.trim().toLowerCase() : '';

    if (!text) {
        await ctx.reply('⚠️ Kirim tanggal atau ketik "today".');
        return;
    }

    const state = ctx.wizard.state as any;

    if (text === 'today' || text === 'hari ini') {
        state.tanggal = new Date();
    } else {
        // Parse date with AI
        try {
            const parsed = await parseIncomeMessage(text);
            if (parsed.tanggal) {
                state.tanggal = parseDateAsWIB(parsed.tanggal);
            } else {
                state.tanggal = new Date();
            }
        } catch (error) {
            logger.warn('Failed to parse date, using today', { error });
            state.tanggal = new Date();
        }
    }

    const dateDisplay = state.tanggal.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    // Ask for payment method
    const methods = await getUserPaymentMethods(ctx.from!.id);
    const keyboard = getPaymentMenu('main', methods);
    await ctx.reply(`✅ Tanggal: ${dateDisplay}\n\n💳 Pilih metode pembayaran:`, keyboard);

    // Jump to method step
    ctx.wizard.selectStep(2);
    return;
};

/**
 * Finalize and save income
 */
const finalizeIncome = async (ctx: BotContext) => {
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

        // 3. Sync to Google Sheets
        const dateOnly = transactionDate.toISOString().split('T')[0];

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
    step0_askInput,           // Step 0: Ask user to describe income
    step1_parseAndAskMethod,  // Step 1: AI parse → show results → ask method
    step2_processMethod,      // Step 2: Process method selection → finalize
    step4_manualAmount,       // Step 3: Fallback: manual amount
    step5_manualDescription,  // Step 4: Fallback: manual description
    step6_manualDate          // Step 5: Fallback: manual date
);
