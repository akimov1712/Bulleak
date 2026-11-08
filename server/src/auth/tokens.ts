import { createHash, randomBytes } from 'node:crypto';
import { sign, verify } from 'hono/jwt';

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const ALGORITHM = 'HS256';

/** Short-lived JWT carrying the user id; `now` is injectable so tests can make expired tokens. */
export function signAccessToken(userId: string, secret: string, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  return sign({ sub: userId, iat, exp: iat + ACCESS_TTL_SEC }, secret, ALGORITHM);
}

/** The user id, or null when the token is malformed, forged or expired. */
export async function verifyAccessToken(token: string, secret: string): Promise<string | null> {
  try {
    const payload = await verify(token, secret, ALGORITHM);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** 256 random bits; only `hashToken` of it is stored. */
export const newOpaqueToken = () => randomBytes(32).toString('base64url');

/** SHA-256 is enough here: the input is random, unlike a password. */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
