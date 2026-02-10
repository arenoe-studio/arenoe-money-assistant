import { pgTable, serial, integer, text, timestamp, boolean } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    telegramId: integer('telegram_id').notNull().unique(),
    spreadsheetId: text('spreadsheet_id'),
    refreshToken: text('refresh_token'), // Encrypted OAuth2 refresh token
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
    syncedToSheets: boolean('synced_to_sheets').default(false),
    createdAt: timestamp('created_at').defaultNow()
});
export const conversationState = pgTable('conversation_state', {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    sceneId: text('scene_id'),
    state: text('state'), // JSON serialized state
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow()
});
