import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Db } from '../db';
import { emailTokens, users } from '../db/schema';
import { hashToken, newOpaqueToken } from './tokens';

export type EmailTokenKind = 'verify' | 'reset';

const TTL_MS: Record<EmailTokenKind, number> = {
  verify: 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

/** Issues a one-time token; earlier unused tokens of this kind stop working. */
export async function issueEmailToken(db: Db, userId: string, kind: EmailTokenKind) {
  const token = newOpaqueToken();
  const now = new Date();
  await db
    .update(emailTokens)
    .set({ usedAt: now })
    .where(
      and(eq(emailTokens.userId, userId), eq(emailTokens.kind, kind), isNull(emailTokens.usedAt)),
    );
  await db.insert(emailTokens).values({
    tokenHash: hashToken(token),
    userId,
    kind,
    expiresAt: new Date(now.getTime() + TTL_MS[kind]),
  });
  return token;
}

const usable = (token: string, kind: EmailTokenKind) =>
  and(
    eq(emailTokens.tokenHash, hashToken(token)),
    eq(emailTokens.kind, kind),
    isNull(emailTokens.usedAt),
    gt(emailTokens.expiresAt, new Date()),
  );

/** The account of a usable token, without spending it. */
export async function peekEmailToken(db: Db, token: string, kind: EmailTokenKind) {
  const [row] = await db
    .select({ user: users })
    .from(emailTokens)
    .innerJoin(users, eq(emailTokens.userId, users.id))
    .where(usable(token, kind))
    .limit(1);
  return row?.user ?? null;
}

/** Spends the token atomically: of two requests only one gets the user id. */
export async function consumeEmailToken(db: Db, token: string, kind: EmailTokenKind) {
  const [row] = await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(usable(token, kind))
    .returning({ userId: emailTokens.userId });
  return row?.userId ?? null;
}
