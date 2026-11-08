import { hash, verify } from '@node-rs/argon2';

/** argon2id parameters from the spec (the library's default algorithm is argon2id). */
const ARGON2 = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (password: string) => hash(password, ARGON2);

let dummyHash: Promise<string> | undefined;

/**
 * Checks a password. Without a stored hash (unknown e-mail) it still does the same work,
 * so response time does not reveal whether the account exists.
 */
export async function verifyPassword(stored: string | undefined, password: string) {
  if (stored !== undefined) return verify(stored, password);
  dummyHash ??= hashPassword('no-such-account-placeholder');
  await verify(await dummyHash, password);
  return false;
}
