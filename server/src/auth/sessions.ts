import { randomUUID } from 'node:crypto';
import { and, eq, isNull, type SQL } from 'drizzle-orm';
import type { Db } from '../db';
import { sessions, users, type User } from '../db/schema';
import { hashToken, newOpaqueToken, REFRESH_TTL_MS } from './tokens';

const USER_AGENT_MAX = 200;

/** Stores a new session and returns its refresh token (only the hash is kept). */
export async function createSession(
  db: Db,
  userId: string,
  userAgent: string | undefined,
  familyId: string = randomUUID(),
) {
  const refreshToken = newOpaqueToken();
  await db.insert(sessions).values({
    userId,
    refreshHash: hashToken(refreshToken),
    familyId,
    userAgent: userAgent?.slice(0, USER_AGENT_MAX),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return refreshToken;
}

const revokeWhere = (db: Db, condition: SQL) =>
  db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(condition, isNull(sessions.revokedAt)));

const revokeFamily = (db: Db, familyId: string) => revokeWhere(db, eq(sessions.familyId, familyId));

export const revokeAllSessions = (db: Db, userId: string) =>
  revokeWhere(db, eq(sessions.userId, userId));

export const revokeSessionByToken = (db: Db, refreshToken: string) =>
  revokeWhere(db, eq(sessions.refreshHash, hashToken(refreshToken)));

/**
 * Replaces a refresh token with a new one in the same family. Null means the token cannot be
 * used. Presenting an already rotated token means it leaked, so the whole family is revoked.
 */
export async function rotateSession(
  db: Db,
  refreshToken: string,
  userAgent: string | undefined,
): Promise<{ user: User; refreshToken: string } | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.refreshHash, hashToken(refreshToken)))
      .limit(1);
    if (!row) return null;
    const { session, user } = row;
    if (session.expiresAt.getTime() <= Date.now() && session.revokedAt === null) return null;
    // Conditional update: of two requests with one token only the first can win.
    const claimed =
      session.revokedAt === null
        ? await tx
            .update(sessions)
            .set({ revokedAt: new Date() })
            .where(and(eq(sessions.id, session.id), isNull(sessions.revokedAt)))
            .returning({ id: sessions.id })
        : [];
    if (claimed.length === 0) {
      await revokeFamily(tx, session.familyId);
      return null;
    }
    return { user, refreshToken: await createSession(tx, user.id, userAgent, session.familyId) };
  });
}
