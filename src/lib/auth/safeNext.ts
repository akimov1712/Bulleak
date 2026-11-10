/**
 * Where to go after signing in: only a path inside the site (`?next=/lesson/m01-l02`), never
 * another origin («//evil.test», «https://…»), so the link cannot send the user away.
 */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
  return next;
}
