import { Markup } from 'telegraf';
import { BotContext } from '../../../../types';
import { logger } from '../../../../utils/logger';
import { saveAndFormatTransaction } from './save';

export const step5_action = async (ctx: BotContext) => {
    // Clear auto-confirm timer on ANY interaction
    if ((ctx.scene.state as any).confirmTimer) {
        clearTimeout((ctx.scene.state as any).confirmTimer);
        (ctx.scene.state as any).confirmTimer = undefined;
    }

    // Check if already auto-confirmed (race condition safety)
    if ((ctx.scene.state as any).autoConfirmed) {
        return ctx.scene.leave();
    }

    if (!ctx.callbackQuery) {
        await ctx.reply('⚠️ Harap gunakan tombol yang tersedia.');
        // If they send text, we stay in this step (which is index 4).
        // The timer is cancelled, so they must now click manually.
        return;
    }

    const action = (ctx.callbackQuery as any).data;

    // Handle Confirmation
    if (action === 'confirm_yes') {
        const state = ctx.scene.state as any;
        if (state.processing) return; // Prevent double clicks
        state.processing = true;

        try {
            await ctx.answerCbQuery('Menyimpan...');

            // Use shared save logic
            const successMessage = await saveAndFormatTransaction(ctx);

            try {
                // Explicitly edit the message attached to the callback query
                await ctx.editMessageText(successMessage, { reply_markup: undefined });
            } catch (error) {
                logger.warn('Failed to edit message in success step, falling back to reply', { error });
                // If edit fails, we try to delete previous and send new to mimic update
                try {
                    await ctx.deleteMessage();
                } catch { }
                await ctx.reply(successMessage);
            }

            return ctx.scene.leave();

        } catch (error) {
            state.processing = false;
            await ctx.reply('❌ Gagal menyimpan transaksi.');
            logger.error('Save failed', { error });
            return ctx.scene.leave();
        }

        // Handle Edit / Cancel
    } else if (action === 'confirm_no') {
        await ctx.answerCbQuery();
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🏪 Ubah Toko', 'edit_merchant'), Markup.button.callback('💳 Ubah Metode', 'edit_payment')],
            [Markup.button.callback('📝 Ubah Item', 'edit_items')],
            [Markup.button.callback('🔙 Batal', 'cancel_edit')]
        ]);
        await ctx.editMessageText('Bagian mana yang ingin diubah?', keyboard);
        return;

    } else if (action === 'edit_merchant') {
        await ctx.answerCbQuery();
        const msg = 'Silakan ketik nama toko baru:';
        try {
            await ctx.editMessageText(msg, Markup.inlineKeyboard([
                Markup.button.callback('🔙 Kembali', 'back_to_edit_menu')
            ]));
        } catch {
            await ctx.reply(msg, Markup.inlineKeyboard([
                Markup.button.callback('🔙 Kembali', 'back_to_edit_menu')
            ]));
        }
        ctx.wizard.selectStep(1);
        return;

    } else if (action === 'edit_payment') {
        await ctx.answerCbQuery();
        const { getUserPaymentMethods } = await import('../../../../services/payment');
        const userMethods = await getUserPaymentMethods(ctx.from!.id);
        const buttons = userMethods.map(m => Markup.button.callback(m.name, `pay_${m.name}`));
        const msg = 'Pilih metode pembayaran baru:';

        // Add Back button as a separate row
        const keyboard = Markup.inlineKeyboard([
            ...buttons.reduce((result: any[], btn, index) => {
                const chunkIndex = Math.floor(index / 2);
                if (!result[chunkIndex]) result[chunkIndex] = [];
                result[chunkIndex].push(btn);
                return result;
            }, []),
            [Markup.button.callback('🔙 Kembali', 'back_to_edit_menu')]
        ]);

        try {
            await ctx.editMessageText(msg, keyboard);
        } catch {
            await ctx.reply(msg, keyboard);
        }
        ctx.wizard.selectStep(2);
        return;

    } else if (action === 'edit_items') {
        await ctx.answerCbQuery();
        const msg = 'Silakan kirim ulang detail transaksi (misal: "Ayam 15k"):';
        try {
            await ctx.editMessageText(msg, Markup.inlineKeyboard([
                Markup.button.callback('🔙 Kembali', 'back_to_edit_menu')
            ]));
        } catch {
            await ctx.reply(msg, Markup.inlineKeyboard([
                Markup.button.callback('🔙 Kembali', 'back_to_edit_menu')
            ]));
        }
        ctx.wizard.selectStep(0);
        return;

    } else if (action === 'back_to_edit_menu') {
        await ctx.answerCbQuery();
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🏪 Ubah Toko', 'edit_merchant'), Markup.button.callback('💳 Ubah Metode', 'edit_payment')],
            [Markup.button.callback('📝 Ubah Item', 'edit_items')],
            [Markup.button.callback('🔙 Batal', 'cancel_edit')]
        ]);
        await ctx.editMessageText('Bagian mana yang ingin diubah?', keyboard);
        return;

    } else if (action === 'cancel_edit') {
        // Return to confirmation step (Step 3)
        // This re-triggers step4_confirm, which means TIMER WILL RESTART
        // This is correct behavior.
        await ctx.answerCbQuery();
        ctx.wizard.selectStep(3);
        return (ctx.wizard.steps[3] as any)(ctx);

    } else if (action === 'cancel_transaction') {
        await ctx.answerCbQuery();
        const cancelMsg = '❌ Transaksi Dibatalkan.';
        try {
            await ctx.editMessageText(cancelMsg);
        } catch {
            await ctx.reply(cancelMsg);
        }
        return ctx.scene.leave();
    }

    // Default fallback
    return ctx.scene.leave();
};
