
import { z } from 'zod';

export const PaymentMethods = [
  'Cash',
  'BCA',
  'BNI',
  'BRI',
  'Blu',
  'GoPay',
  'OVO',
  'DANA',
  'ShopeePay'
] as const;

export const TransactionSchema = z.object({
  items: z.string().min(1, 'Item tidak boleh kosong'),
  harga: z.number().positive('Harga harus lebih dari 0'),
  namaToko: z.string().min(1, 'Nama toko tidak boleh kosong'),
  // Removed errorMap to fix build error. Default Zod error will be shown.
  metodePembayaran: z.enum([
    'Cash',
    'BCA',
    'BNI',
    'BRI',
    'Blu',
    'GoPay',
    'OVO',
    'DANA',
    'ShopeePay'
  ] as [string, ...string[]]),
  tanggal: z.date().optional(),
  kategori: z.string().optional()
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const PartialTransactionSchema = TransactionSchema.partial();
export type PartialTransaction = {
  [K in keyof Transaction]?: Transaction[K] | null | undefined;
};

export const ExtractionSchema = z.object({
  items: z.string().nullable(),
  harga: z.number().nullable(),
  namaToko: z.string().nullable(),
  metodePembayaran: z.string().nullable(),
  tanggal: z.string().nullable(),
  kategori: z.string().nullable()
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;
