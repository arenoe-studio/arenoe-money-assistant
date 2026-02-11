
import { pgTable, serial, integer, text, timestamp, boolean, bigint, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  telegramId: bigint('telegram_id', { mode: 'number' }).notNull().unique(),
  spreadsheetId: text('spreadsheet_id'),
  refreshToken: text('refresh_token'), // Encrypted OAuth2 refresh token
  webhookSecret: text('webhook_secret'), // Secret for Verifying Google Apps Script Webhook
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  transactionId: text('transaction_id').notNull(), // UUID for grouping multiple items
  items: text('items').notNull(),
  harga: integer('harga').notNull(), // Store as cents/full number
  namaToko: text('nama_toko').notNull(),
  metodePembayaran: text('metode_pembayaran').notNull(),
  tanggal: timestamp('tanggal').defaultNow(),
  type: text('type').notNull().default('expense'), // 'expense' | 'income' | 'transfer' | 'debt'
  syncedToSheets: boolean('synced_to_sheets').default(false),
  sheetRowId: text('sheet_row_id'), // ID of the row in Google Sheets
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => {
  return {
    sheetRowIdIdx: uniqueIndex('sheet_row_id_idx').on(table.sheetRowId)
  }
});

export const conversationState = pgTable('conversation_state', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  sceneId: text('scene_id'),
  state: text('state'), // JSON serialized state
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow()
});

export const paymentMethods = pgTable('payment_methods', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  name: text('name').notNull(),
  category: text('category').notNull().default('Other'), // 'Bank', 'E-Wallet', 'Other'
  createdAt: timestamp('created_at').defaultNow()
});

export const paymentBalances = pgTable('payment_balances', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  method: text('method').notNull(),
  // Use bigint for IDR amounts to be safe (though number mode is JS safe up to 9 quadrillion)
  amount: bigint('amount', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => {
  return {
    userMethodIdx: uniqueIndex('user_method_idx').on(table.userId, table.method)
  }
});

export const debts = pgTable('debts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  creditorName: text('creditor_name').notNull(),
  description: text('description').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  merchant: text('merchant').notNull(),
  status: text('status').notNull().default('unpaid'), // 'unpaid' | 'paid'
  transactionId: text('transaction_id').notNull(),
  paidAt: timestamp('paid_at'),
  paidWith: text('paid_with'),
  createdAt: timestamp('created_at').defaultNow()
});
