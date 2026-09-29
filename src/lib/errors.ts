/** Error reporting helpers for the app-wide error screen (RouteError). */
import { isRouteErrorResponse } from 'react-router';

/** Text of the error for the «copy details» report (never sent anywhere). */
export function errorDetails(error: unknown, url: string, userAgent: string): string {
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  const stack = error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 8) : [];
  return [message, ...stack, '', `URL: ${url}`, `Браузер: ${userAgent}`].join('\n');
}

/** A chunk of an older version is gone after an update: a reload fetches the new one. */
export const isStaleChunkError = (error: unknown) =>
  error instanceof Error &&
  /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
    error.message,
  );
