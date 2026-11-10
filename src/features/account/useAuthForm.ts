import { useState } from 'react';
import type { z } from 'zod';
import { fieldErrors } from '@bulleak/shared';
import { ApiError } from '@/api/client';

export interface AuthFormState {
  fields: Record<string, string>;
  /** Message for the whole form (wrong password, no connection, too many attempts). */
  message: string | null;
  pending: boolean;
}

/**
 * Validates with the same schema as the API, then runs the request; maps API errors to field
 * messages or a form message.
 */
export function useAuthForm<S extends z.ZodType>(
  schema: S,
  action: (values: z.output<S>) => Promise<void>,
  extraCheck?: (values: z.output<S>) => Record<string, string> | null,
) {
  const [state, setState] = useState<AuthFormState>({ fields: {}, message: null, pending: false });

  async function submit(raw: unknown) {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setState({ fields: fieldErrors(parsed.error), message: null, pending: false });
      return;
    }
    const extra = extraCheck?.(parsed.data);
    if (extra) {
      setState({ fields: extra, message: null, pending: false });
      return;
    }
    setState({ fields: {}, message: null, pending: true });
    try {
      await action(parsed.data);
      setState({ fields: {}, message: null, pending: false });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      const hasFields = Object.keys(error.fields).length > 0;
      setState({
        fields: error.fields,
        message: hasFields ? null : error.message,
        pending: false,
      });
    }
  }

  return { ...state, submit };
}
