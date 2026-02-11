import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../../../types';
import {
    generateYearKeyboard,
    generateMonthKeyboard,
    generateDayKeyboard,
    getWeekRange,
    getMonthRange,
    validateDateRange
} from './calendar';
import { logger } from '../../../utils/logger';
import { DateTime } from 'luxon';

export const SCENE_ID = 'report_wizard';

// Step 0: Select date range type
const step0_rangeType = async (ctx: BotContext) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📅 Hari Ini', 'report_range_today')],
        [Markup.button.callback('📆 Minggu Ini (Sen-Min)', 'report_range_week')],
        [Markup.button.callback('📊 Bulan Ini', 'report_range_month')],
        [Markup.button.callback('🗓️ Pilih Rentang', 'report_range_custom')],
        [Markup.button.callback('🔙 Batal', 'report_cancel')]
    ]);

    await ctx.reply('📊 Laporan Keuangan\n\nPilih rentang waktu:', keyboard);
    ctx.wizard.next();
};

// Step 1: Start Year Selection (Custom only)
const step1_startYear = async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }

    const action = ctx.callbackQuery.data;

    // Handle range type selection
    if (action === 'report_range_today') {
        const today = DateTime.now().setZone('Asia/Jakarta');
        (ctx.scene.state as any).startDate = today.startOf('day').toJSDate();
        (ctx.scene.state as any).endDate = today.endOf('day').toJSDate();
        ctx.wizard.selectStep(7); // Skip to confirmation
        return (ctx.wizard.steps[7] as any)(ctx);
    }

    if (action === 'report_range_week') {
        const { start, end } = getWeekRange();
        (ctx.scene.state as any).startDate = start;
        (ctx.scene.state as any).endDate = end;
        ctx.wizard.selectStep(7);
        return (ctx.wizard.steps[7] as any)(ctx);
    }

    if (action === 'report_range_month') {
        const { start, end } = getMonthRange();
        (ctx.scene.state as any).startDate = start;
        (ctx.scene.state as any).endDate = end;
        ctx.wizard.selectStep(7);
        return (ctx.wizard.steps[7] as any)(ctx);
    }

    if (action === 'report_range_custom') {
        await ctx.editMessageText('📅 Pilih Tahun Mulai:', generateYearKeyboard());
        ctx.wizard.next();
        return;
    }

    if (action === 'report_cancel') {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Laporan dibatalkan.');
        return ctx.scene.leave();
    }
};

// Step 2: Start Month Selection
const step2_startMonth = async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }

    const action = ctx.callbackQuery.data;

    if (action === 'report_cancel') {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Laporan dibatalkan.');
        return ctx.scene.leave();
    }

    if (action.startsWith('report_year_')) {
        const year = parseInt(action.split('_')[2]);
        (ctx.scene.state as any).startYear = year;

        await ctx.answerCbQuery();
        await ctx.editMessageText(`Tahun: ${year}\n\n📅 Pilih Bulan Mulai:`, generateMonthKeyboard());
        ctx.wizard.next();
    }
};

// Step 3: Start Day Selection
const step3_startDay = async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }

    const action = ctx.callbackQuery.data;

    if (action === 'report_cancel') {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Laporan dibatalkan.');
        return ctx.scene.leave();
    }

    if (action.startsWith('report_month_')) {
        const month = parseInt(action.split('_')[2]);
        const year = (ctx.scene.state as any).startYear;
        (ctx.scene.state as any).startMonth = month;

        const monthName = DateTime.local(year, month).setLocale('id').toFormat('MMMM yyyy');

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `Bulan: ${monthName}\n\n📅 Pilih Tanggal Mulai:`,
            generateDayKeyboard(year, month)
        );
        ctx.wizard.next();
    }
};

// Step 4: End Year Selection
const step4_endYear = async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }

    const action = ctx.callbackQuery.data;

    if (action === 'report_cancel') {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Laporan dibatalkan.');
        return ctx.scene.leave();
    }

    if (action.startsWith('report_day_')) {
        const day = parseInt(action.split('_')[2]);
        const year = (ctx.scene.state as any).startYear;
        const month = (ctx.scene.state as any).startMonth;

        const startDate = DateTime.local(year, month, day).setZone('Asia/Jakarta').startOf('day').toJSDate();
        (ctx.scene.state as any).startDate = startDate;

        await ctx.answerCbQuery();
        await ctx.editMessageText('📅 Pilih Tahun Akhir:', generateYearKeyboard(year));
        ctx.wizard.next();
    }
};

// Step 5: End Month Selection
const step5_endMonth = async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }

    const action = ctx.callbackQuery.data;

    if (action === 'report_cancel') {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Laporan dibatalkan.');
        return ctx.scene.leave();
    }

    if (action.startsWith('report_year_')) {
        const year = parseInt(action.split('_')[2]);
        (ctx.scene.state as any).endYear = year;

        await ctx.answerCbQuery();
        await ctx.editMessageText(`Tahun: ${year}\n\n📅 Pilih Bulan Akhir:`, generateMonthKeyboard());
        ctx.wizard.next();
    }
};

// Step 6: End Day Selection
const step6_endDay = async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
    }

    const action = ctx.callbackQuery.data;

    if (action === 'report_cancel') {
        await ctx.answerCbQuery();
        await ctx.editMessageText('❌ Laporan dibatalkan.');
        return ctx.scene.leave();
    }

    if (action.startsWith('report_month_')) {
        const month = parseInt(action.split('_')[2]);
        const year = (ctx.scene.state as any).endYear;
        (ctx.scene.state as any).endMonth = month;

        const monthName = DateTime.local(year, month).setLocale('id').toFormat('MMMM yyyy');

        await ctx.answerCbQuery();
        await ctx.editMessageText(
            `Bulan: ${monthName}\n\n📅 Pilih Tanggal Akhir:`,
            generateDayKeyboard(year, month)
        );
        ctx.wizard.next();
    }
};

// Step 7: Confirmation
const step7_confirmation = async (ctx: BotContext) => {
    // Handle day selection from previous step if coming from custom flow
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
        const action = ctx.callbackQuery.data;

        if (action === 'report_cancel') {
            await ctx.answerCbQuery();
            await ctx.editMessageText('❌ Laporan dibatalkan.');
            return ctx.scene.leave();
        }

        if (action.startsWith('report_day_')) {
            const day = parseInt(action.split('_')[2]);
            const year = (ctx.scene.state as any).endYear;
            const month = (ctx.scene.state as any).endMonth;

            const endDate = DateTime.local(year, month, day).setZone('Asia/Jakarta').endOf('day').toJSDate();
            (ctx.scene.state as any).endDate = endDate;
        }

        // Handle confirmation actions
        if (action === 'report_confirm_yes') {
            await ctx.answerCbQuery();
            ctx.wizard.next();
            return (ctx.wizard.steps[8] as any)(ctx);
        }

        if (action === 'report_confirm_no') {
            await ctx.answerCbQuery();
            await ctx.editMessageText('❌ Laporan dibatalkan.');
            return ctx.scene.leave();
        }
    }

    const startDate = (ctx.scene.state as any).startDate;
    const endDate = (ctx.scene.state as any).endDate;

    // Validate date range
    const validation = validateDateRange(startDate, endDate);
    if (!validation.valid) {
        await ctx.editMessageText(validation.message || '❌ Rentang tanggal tidak valid.');
        return ctx.scene.leave();
    }

    const startStr = DateTime.fromJSDate(startDate).setLocale('id').toFormat('d MMMM yyyy');
    const endStr = DateTime.fromJSDate(endDate).setLocale('id').toFormat('d MMMM yyyy');

    const msg = `📊 Konfirmasi Laporan\n\nPeriode: ${startStr} s/d ${endStr}\n\nApakah data sudah benar?`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Ya, Tarik Data', 'report_confirm_yes')],
        [Markup.button.callback('❌ Tidak', 'report_confirm_no')]
    ]);

    if (ctx.callbackQuery) {
        await ctx.editMessageText(msg, keyboard);
    } else {
        await ctx.reply(msg, keyboard);
    }

    ctx.wizard.next();
};

// Step 8: Generate Report
const step8_generate = async (ctx: BotContext) => {
    try {
        const startDate = (ctx.scene.state as any).startDate;
        const endDate = (ctx.scene.state as any).endDate;

        await ctx.editMessageText('⏳ Menghasilkan laporan...');

        const { getTransactionsByDateRange, getDebtsByDateRange, formatReport } = await import('../../../services/report');

        const [transactions, debts] = await Promise.all([
            getTransactionsByDateRange(ctx.from!.id, startDate, endDate),
            getDebtsByDateRange(ctx.from!.id, startDate, endDate)
        ]);

        const report = formatReport(transactions, debts, startDate, endDate);

        await ctx.editMessageText(report);
        return ctx.scene.leave();

    } catch (error) {
        logger.error('Error generating report', { error });
        await ctx.reply('❌ Gagal menghasilkan laporan.');
        return ctx.scene.leave();
    }
};

export const reportScene = new Scenes.WizardScene<BotContext>(
    SCENE_ID,
    step0_rangeType,
    step1_startYear,
    step2_startMonth,
    step3_startDay,
    step4_endYear,
    step5_endMonth,
    step6_endDay,
    step7_confirmation,
    step8_generate
);
