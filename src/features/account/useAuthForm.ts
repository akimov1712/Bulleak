import { useState } from 'react';
import type { z } from 'zod';
import { fieldErrors } from '@bulleak/shared';
import { ApiError, type ClientErrorCode } from '@/api/client';

export interface AuthFormState {
  fields: Record<string, string>;
  /** Message for the whole form (wrong password, no connection, too many attempts). */
  message: string | null;
  /** Code of the last API error, for UI that depends on the kind of failure. */
  code: ClientErrorCode | null;
  pending: boolean;
}

const IDLE: AuthFormState = { fields: {}, message: null, code: null, pending: false };
const UNEXPECTED = 'Что-то пошло не так. Обнови страницу и попробуй ещё раз.';

/**
 * Validates with the same schema as the API, then runs the request; maps API errors to field
 * messages or a form message.
 */
export function useAuthForm<S extends z.ZodType>(
  schema: S,
  action: (values: z.output<S>) => Promise<void>,
  extraCheck?: (values: z.output<S>) => Record<string, string> | null,
) {
  const [state, setState] = useState<AuthFormState>(IDLE);

  async function submit(raw: unknown) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setState({ ...IDLE, fields: fieldErrors(parsed.error) });
      return;
    }
    const extra = extraCheck?.(parsed.data);
    if (extra) {
      setState({ ...IDLE, fields: extra });
      return;
    }
    setState({ ...IDLE, pending: true });
    try {
      await action(parsed.data);
      setState(IDLE);
    } catch (error) {
      // Callers do `void form.submit(…)`: never leave the button spinning or the error unhandled.
      if (!(error instanceof ApiError)) {
        setState({ ...IDLE, message: UNEXPECTED });
        return;
      }
      const hasFields = Object.keys(error.fields).length > 0;
      setState({
        fields: error.fields,
        message: hasFields ? null : error.message,
        code: error.code,
        pending: false,
      });
    }
  }

  return { ...state, submit };
}
