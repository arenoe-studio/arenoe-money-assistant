import { z } from 'zod';
export const PaymentMethods = [
    'Cash',
    'OVO',
    'GoPay',
    'DANA',
    'ShopeePay',
    'BCA',
    'Mandiri'
];
export const TransactionSchema = z.object({
    items: z.string().min(1, 'Item tidak boleh kosong'),
    harga: z.number().positive('Harga harus lebih dari 0'),
    namaToko: z.string().min(1, 'Nama toko tidak boleh kosong'),
    // Removed errorMap to fix build error. Default Zod error will be shown.
    metodePembayaran: z.enum([
        'Cash',
        'OVO',
        'GoPay',
        'DANA',
        'ShopeePay',
        'BCA',
        'Mandiri'
    ]),
    tanggal: z.date().optional()
});
export const PartialTransactionSchema = TransactionSchema.partial();
export const ExtractionSchema = z.object({
    items: z.string().nullable(),
    harga: z.number().nullable(),
    namaToko: z.string().nullable(),
    metodePembayaran: z.string().nullable()
});
