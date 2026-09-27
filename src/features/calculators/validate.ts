/**
 * Guards for calculator inputs restored from localStorage: an old or hand-edited value that
 * does not match the shape falls back to the defaults instead of breaking the calculator.
 */

/** 'number' = number or null (empty field), 'boolean', or a list of allowed strings. */
export type FieldSpec = 'number' | 'boolean' | readonly string[];

export function isShape<T extends object>(spec: { [K in keyof T]: FieldSpec }): (
  value: unknown,
) => value is T {
  return (value: unknown): value is T => {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return Object.entries(spec as Record<string, FieldSpec>).every(([key, kind]) => {
      const v = record[key];
      if (kind === 'number') return v === null || (typeof v === 'number' && Number.isFinite(v));
      if (kind === 'boolean') return typeof v === 'boolean';
      return typeof v === 'string' && kind.includes(v);
    });
  };
}
