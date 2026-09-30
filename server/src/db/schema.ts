import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/*
 * Query-side view of the tables. The source of truth for the structure is the SQL in
 * server/migrations (applied by migrate.ts); keep both in sync — db.test.ts writes and reads
 * every column through this schema, so a mismatch fails the tests.
 */

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  emailVerifiedAt: ts('email_verified_at'),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  refreshHash: text('refresh_hash').notNull().unique(),
  familyId: uuid('family_id').notNull(),
  userAgent: text('user_agent'),
  createdAt: ts('created_at').notNull().defaultNow(),
  expiresAt: ts('expires_at').notNull(),
  revokedAt: ts('revoked_at'),
});

export const emailTokens = pgTable('email_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['verify', 'reset'] }).notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  expiresAt: ts('expires_at').notNull(),
  usedAt: ts('used_at'),
});

export const schema = { users, sessions, emailTokens };

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type EmailToken = typeof emailTokens.$inferSelect;
