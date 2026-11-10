import type { Context } from 'hono';
import type { z } from 'zod';
import { fieldErrors } from '@bulleak/shared';
import { validation } from './errors';

/** Context of a route behind `requireAuth`. */
export type AuthedEnv = { Variables: { userId: string } };

/** JSON body checked by a shared schema; any problem is a 400 with per-field messages. */
export async function parseBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  const raw: unknown = await c.req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) throw validation(fieldErrors(result.error));
  return result.data;
}
