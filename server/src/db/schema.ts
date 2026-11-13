import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

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
  /** Counter of record changes (sync cursor). */
  recordRev: bigint('record_rev', { mode: 'number' }).notNull().default(0),
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

type Json = Record<string, unknown>;
const rev = (name: string) => bigint(name, { mode: 'number' });
const owner = () =>
  uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' });

export const progress = pgTable('progress', {
  userId: owner().primaryKey(),
  state: jsonb('state').$type<Json>().notNull(),
  schemaVersion: integer('schema_version').notNull(),
  rev: rev('rev').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const settings = pgTable('settings', {
  userId: owner().primaryKey(),
  state: jsonb('state').$type<Json>().notNull(),
  rev: rev('rev').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

export const syncRecords = pgTable(
  'sync_records',
  {
    userId: owner(),
    kind: text('kind', { enum: ['sim', 'journal'] }).notNull(),
    uid: uuid('uid').notNull(),
    data: jsonb('data').$type<Json>(),
    changedAt: rev('changed_at').notNull(),
    rev: rev('rev').notNull(),
    deleted: boolean('deleted').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.uid] })],
);

export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: owner(),
    /** UTC day, 'YYYY-MM-DD'. */
    day: date('day', { mode: 'string' }).notNull(),
    requests: integer('requests').notNull().default(0),
    inputTokens: bigint('input_tokens', { mode: 'number' }).notNull().default(0),
    outputTokens: bigint('output_tokens', { mode: 'number' }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

export const schema = { users, sessions, emailTokens, progress, settings, syncRecords, aiUsage };

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type EmailToken = typeof emailTokens.$inferSelect;
