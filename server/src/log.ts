/** Keys whose values never reach the logs. */
const SECRET_KEY = /pass|token|secret|authorization|cookie/i;

export type LogFields = Record<string, unknown>;

export interface Logger {
  info(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/** Copies fields with secret-looking keys replaced by "[redacted]" (nested objects too). */
export function redact(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SECRET_KEY.test(key)) out[key] = '[redacted]';
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redact(value as LogFields);
    } else out[key] = value;
  }
  return out;
}

/** JSON lines to stdout/stderr (hosting platforms collect them). */
export function createLogger(
  write: (line: string, isError: boolean) => void = defaultWrite,
): Logger {
  const emit = (level: 'info' | 'error', message: string, fields: LogFields = {}) =>
    write(
      JSON.stringify({ time: new Date().toISOString(), level, message, ...redact(fields) }),
      level === 'error',
    );
  return {
    info: (message, fields) => emit('info', message, fields),
    error: (message, fields) => emit('error', message, fields),
  };
}

function defaultWrite(line: string, isError: boolean) {
  (isError ? process.stderr : process.stdout).write(`${line}\n`);
}

/** For tests: collects lines instead of printing. */
export function memoryLogger(): Logger & { lines: LogFields[] } {
  const lines: LogFields[] = [];
  const logger = createLogger((line) => lines.push(JSON.parse(line) as LogFields));
  return Object.assign(logger, { lines });
}
