/**
 * AI quotas and usage log (T-2103): a daily request limit per learner and a monthly token
 * ceiling for the whole site. Checked before the model is called.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { aiUsage } from '../db/schema';

export interface QuotaLimits {
  dailyRequests: number;
  monthlyTokens: number;
}

export interface QuotaState {
  /** This learner's requests today. */
  requestsToday: number;
  /** Input + output tokens of the whole site this month. */
  tokensThisMonth: number;
}

export type QuotaDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'daily' | 'monthly'; remaining: number };

/** Pure: may one more request go to the model? `remaining` counts the request being made. */
export function decideQuota(state: QuotaState, limits: QuotaLimits): QuotaDecision {
  const left = Math.max(0, limits.dailyRequests - state.requestsToday);
  if (state.tokensThisMonth >= limits.monthlyTokens)
    return { allowed: false, reason: 'monthly', remaining: left };
  if (left === 0) return { allowed: false, reason: 'daily', remaining: 0 };
  return { allowed: true, remaining: left - 1 };
}

/** 'YYYY-MM-DD' of a UTC day and the first day of its month. */
export const utcDay = (now: Date) => now.toISOString().slice(0, 10);
export const utcMonthStart = (now: Date) => `${now.toISOString().slice(0, 7)}-01`;

export async function readQuotaState(db: Db, userId: string, now: Date): Promise<QuotaState> {
  const [mine] = await db
    .select({ requests: aiUsage.requests })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.day, utcDay(now))));
  const [month] = await db
    .select({
      tokens: sql<string>`coalesce(sum(${aiUsage.inputTokens} + ${aiUsage.outputTokens}), 0)`,
    })
    .from(aiUsage)
    .where(gte(aiUsage.day, utcMonthStart(now)));
  return { requestsToday: mine?.requests ?? 0, tokensThisMonth: Number(month?.tokens ?? 0) };
}

/** Adds one request and its tokens to today's row of this learner. */
export async function recordUsage(
  db: Db,
  userId: string,
  now: Date,
  usage: { inputTokens: number; outputTokens: number },
): Promise<void> {
  await db
    .insert(aiUsage)
    .values({
      userId,
      day: utcDay(now),
      requests: 1,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })
    .onConflictDoUpdate({
      target: [aiUsage.userId, aiUsage.day],
      set: {
        requests: sql`${aiUsage.requests} + 1`,
        inputTokens: sql`${aiUsage.inputTokens} + ${usage.inputTokens}`,
        outputTokens: sql`${aiUsage.outputTokens} + ${usage.outputTokens}`,
      },
    });
}
