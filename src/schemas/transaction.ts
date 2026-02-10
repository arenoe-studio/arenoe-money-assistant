
import { z } from 'zod';

export const PaymentMethods = [
  'Cash', 
  'OVO', 
  'GoPay', 
  'DANA', 
  'ShopeePay', 
  'BCA', 
  'Mandiri'
] as const;

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
  ] as [string, ...string[]]),
  tanggal: z.date().optional()
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
  metodePembayaran: z.string().nullable()
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;
