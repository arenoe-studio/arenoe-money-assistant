import { Markup } from 'telegraf';
import { BotContext } from '../../../../types';
import { PaymentMethods } from '../../../../schemas/transaction';
import { logger } from '../../../../utils/logger';

export const step3_payment = async (ctx: BotContext) => {
    // Handle Callback Query (Button Click)
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = (ctx.callbackQuery as any).data;

        if (action === 'back_to_edit_menu') {
            await ctx.answerCbQuery();
            ctx.wizard.selectStep(4); // Go back to Action Handler (Edit Menu)
            return (ctx.wizard.steps[4] as any)(ctx);
        }

        // Handle Category Navigation
        if (action.startsWith('cat_')) {
            const category = action.replace('cat_', '');

            const { getPaymentMenu } = await import('../../../../utils/keyboard');
            const { getUserPaymentMethods } = await import('../../../../services/payment');

            const userMethods = await getUserPaymentMethods(ctx.from!.id);
            const keyboard = getPaymentMenu(category as any, userMethods);

            let message = 'Pilih Kategori Pembayaran';
            if (category === 'bank') message = '🏦 Pilih Bank:';
            if (category === 'ewallet') message = '📱 Pilih E-Wallet:';
            if (category === 'others') message = '🔹 Metode Lainnya:';

            try {
                await ctx.editMessageText(message, keyboard);
            } catch (e) {
                // Ignore if message content is same
            }
            await ctx.answerCbQuery();
            return;
        }

        if (action.startsWith('pay_')) {
            const method = action.replace('pay_', '');
            logger.info('Wizard Step 3: Payment selected via button', { method });

            if (ctx.session.transaction) {
                ctx.session.transaction.metodePembayaran = method as any;
            }
            if (ctx.session.transactions) {
                ctx.session.transactions.forEach(t => t.metodePembayaran = method as any);
            }

            await ctx.answerCbQuery();
            ctx.wizard.selectStep(3);
            return (ctx.wizard.steps[3] as any)(ctx);
        }
    }

    // Handle Text Input (Fallback)
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    logger.info('Wizard Step 3: Payment input via text', { text });

    // Use the values from schema/constant to be single source of truth
    const { getUserPaymentMethods } = await import('../../../../services/payment');
    const validMethods = await getUserPaymentMethods(ctx.from!.id);

    // Find matching method by name
    const matched = validMethods.find(m => m.name.toLowerCase() === text.toLowerCase());

    if (!matched) {
        ctx.session.retryCount!.payment++;
        logger.warn('Wizard Step 3: Invalid payment method', { text, retry: ctx.session.retryCount!.payment });

        if (ctx.session.retryCount!.payment >= 2) {
            await ctx.reply('Skip pembayaran (Default: Cash).');
            if (ctx.session.transaction) ctx.session.transaction.metodePembayaran = 'Cash';
            if (ctx.session.transactions) ctx.session.transactions.forEach((t: any) => t.metodePembayaran = 'Cash');

            ctx.wizard.selectStep(3);
            return (ctx.wizard.steps[3] as any)(ctx);
        }
        // Show sorted list of buttons? Or just say invalid?
        // Let's show categories again? Or flat list of names?
        // Showing flat list might be huge.
        // Let's show main menu again.
        const { getPaymentMenu } = await import('../../../../utils/keyboard');
        const keyboard = getPaymentMenu('main', validMethods);

        await ctx.reply(`Metode tidak valid. Pilih dari menu:`, keyboard);
        return;
    }

    if (ctx.session.transaction) {
        ctx.session.transaction.metodePembayaran = matched.name as any;
    }
    if (ctx.session.transactions) {
        ctx.session.transactions.forEach((t: any) => t.metodePembayaran = matched.name as any);
    }

    ctx.wizard.selectStep(3);
    return (ctx.wizard.steps[3] as any)(ctx);
};
