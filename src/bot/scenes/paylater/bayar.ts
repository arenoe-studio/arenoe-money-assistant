import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import { logger } from '../../../utils/logger';
import { getUserDebts, payDebt, DebtInfo } from '../../../services/debt';
import { formatCurrency } from '../../../utils/currency';
import { getPaymentMenu } from '../../../utils/keyboard';
import { getUserPaymentMethods } from '../../../services/payment';

export const BAYAR_SCENE_ID = 'bayar_wizard';

/**
 * Step 0: Show list of unpaid debts
 */
const step0_showDebtList = async (ctx: BotContext) => {
    try {
        const debts = await getUserDebts(ctx.from!.id, 'unpaid');

        if (debts.length === 0) {
            await ctx.reply('✅ Tidak ada hutang yang belum dibayar!');
            return ctx.scene.leave();
        }

        // Create buttons for each debt
        const buttons = debts.map(debt => {
            const date = debt.createdAt ? new Date(debt.createdAt).toLocaleDateString('id-ID') : 'N/A';
            const label = `${debt.creditorName} - ${formatCurrency(debt.amount)} (${date})`;
            return [Markup.button.callback(label, `debt_${debt.id}`)];
        });

        buttons.push([Markup.button.callback('❌ Batalkan', 'bayar_cancel')]);

        const keyboard = Markup.inlineKeyboard(buttons);

        await ctx.reply(
            '💰 Daftar Hutang yang Belum Dibayar:\n\n' +
            'Pilih hutang yang ingin dilunasi:',
            keyboard
        );

        return ctx.wizard.next();
    } catch (error) {
        logger.error('Show Debt List Error', { error });
        await ctx.reply('❌ Gagal memuat daftar hutang.');
        return ctx.scene.leave();
    }
};

/**
 * Step 1: Process debt selection and show payment method menu
 */
const step1_processDebtSelection = async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        if (action === 'bayar_cancel') {
            await ctx.answerCbQuery();
            await ctx.editMessageText('❌ Pembayaran hutang dibatalkan.');
            return ctx.scene.leave();
        }

        if (action.startsWith('debt_')) {
            const debtId = parseInt(action.replace('debt_', ''));
            (ctx.wizard.state as any).debtId = debtId;

            await ctx.answerCbQuery();

            // Get debt details to show
            const debts = await getUserDebts(ctx.from!.id, 'unpaid');
            const debt = debts.find(d => d.id === debtId);

            if (!debt) {
                await ctx.editMessageText('❌ Hutang tidak ditemukan.');
                return ctx.scene.leave();
            }

            (ctx.wizard.state as any).debt = debt;

            // Show payment method selection
            const methods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu('main', methods);

            await ctx.editMessageText(
                `💳 Hutang yang Dipilih:\n\n` +
                `Hutang ke: ${debt.creditorName}\n` +
                `Keterangan: ${debt.description}\n` +
                `Nominal: ${formatCurrency(debt.amount)}\n` +
                `Toko: ${debt.merchant}\n\n` +
                `💰 Pilih metode pembayaran:`,
                keyboard
            );

            return ctx.wizard.next();
        }
    }
};

/**
 * Helper to handle category navigation for payment method
 */
const handlePaymentCategoryNav = async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        if (action.startsWith('cat_')) {
            const category = action.replace('cat_', '');
            const type = category === 'main' ? 'main' : category;

            const methods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu(type as any, methods);

            let message = '💰 Pilih metode pembayaran:';
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

/**
 * Step 2: Process payment method selection and show confirmation
 */
const step2_processPaymentMethod = async (ctx: BotContext) => {
    // Check for category navigation
    const navResult = await handlePaymentCategoryNav(ctx);
    if (navResult === 'NAVIGATING') return;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        if (action.startsWith('pay_')) {
            const method = action.replace('pay_', '');
            (ctx.wizard.state as any).paymentMethod = method;

            await ctx.answerCbQuery();

            const debt = (ctx.wizard.state as any).debt as DebtInfo;

            const keyboard = Markup.inlineKeyboard([
                [Markup.button.callback('✅ Bayar Sekarang', 'bayar_confirm')],
                [Markup.button.callback('❌ Batalkan', 'bayar_cancel')]
            ]);

            await ctx.editMessageText(
                `📋 Konfirmasi Pembayaran Hutang\n\n` +
                `💳 Hutang ke: ${debt.creditorName}\n` +
                `📝 Keterangan: ${debt.description}\n` +
                `💰 Nominal: ${formatCurrency(debt.amount)}\n` +
                `🏪 Toko: ${debt.merchant}\n` +
                `💳 Metode Bayar: ${method}\n\n` +
                `Lanjutkan pembayaran?`,
                keyboard
            );

            return ctx.wizard.next();
        }
    }

    if (ctx.message) {
        await ctx.reply('⚠️ Mohon pilih metode menggunakan tombol.');
        return;
    }
};

/**
 * Step 3: Process payment confirmation
 */
const step3_processConfirmation = async (ctx: BotContext) => {
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        if (action === 'bayar_cancel') {
            await ctx.answerCbQuery();
            await ctx.editMessageText('❌ Pembayaran hutang dibatalkan.');
            return ctx.scene.leave();
        }

        if (action === 'bayar_confirm') {
            await ctx.answerCbQuery();

            const state = ctx.wizard.state as any;
            const debtId = state.debtId;
            const paymentMethod = state.paymentMethod;
            const debt = state.debt as DebtInfo;

            try {
                await ctx.editMessageText('⏳ Memproses pembayaran...');

                const result = await payDebt(ctx.from!.id, debtId, paymentMethod);

                await ctx.reply(
                    `✅ Hutang Berhasil Dilunasi!\n\n` +
                    `💳 Hutang ke: ${debt.creditorName}\n` +
                    `📝 Keterangan: ${debt.description}\n` +
                    `💰 Nominal: ${formatCurrency(debt.amount)}\n` +
                    `💳 Dibayar dengan: ${paymentMethod}\n` +
                    `📈 Sisa Saldo ${paymentMethod}: ${formatCurrency(result.newBalance)}\n\n` +
                    `🎉 Selamat! Hutang telah lunas.`
                );

                return ctx.scene.leave();
            } catch (error: any) {
                logger.error('Pay Debt Error', { error });
                const errorMsg = error.message || 'Gagal membayar hutang';
                await ctx.reply(`❌ ${errorMsg}`);
                return ctx.scene.leave();
            }
        }
    }
};

export const bayarScene = new Scenes.WizardScene<BotContext>(
    BAYAR_SCENE_ID,
    step0_showDebtList,
    step1_processDebtSelection,
    step2_processPaymentMethod,
    step3_processConfirmation
);
