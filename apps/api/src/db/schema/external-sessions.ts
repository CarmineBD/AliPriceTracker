import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const externalSessions = pgTable('external_sessions', {
  provider: varchar('provider', { length: 50 }).primaryKey(),
  encryptedCookieJar: text('encrypted_cookie_jar').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
