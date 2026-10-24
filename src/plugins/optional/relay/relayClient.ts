import type { z } from 'zod';
import { AppError } from '@/core/errors/AppError';
import { relayErrorSchema } from '@/core/relay/relayContract';

/** Longer than the relay's own query limit (30 s by default), so its own message arrives first. */
const TIMEOUT_MS = 60_000;

/**
 * POSTs `body` to one of the relay's routes and reads the answer with `schema`. Rejects with an
 * `AppError`: the relay's own when it sends one. Honours `signal`.
 */
export async function relayRequest<T>({
  relayUrl,
  token,
  route,
  body,
  schema,
  signal,
}: {
  relayUrl: string;
  token?: string;
  route: string;
  body: unknown;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${relayUrl.replace(/\/+$/, '')}${route}`, {
      method: 'POST',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted)
      throw new AppError('timeout', 'The relay didn’t answer within a minute.', { cause: error });
    throw new AppError(
      'network',
      `Could not reach the relay at ${relayUrl}. Is it running (vp run relay), and does it allow this page’s origin?`,
      { cause: error },
    );
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const failure = relayErrorSchema.safeParse(json);
    if (failure.success) {
      const { code, message, isRetryable } = failure.data.error;
      throw new AppError(code, message, { isRetryable });
    }
    throw new AppError(
      res.status === 401 || res.status === 403 ? 'forbidden' : 'datasource',
      `The relay answered ${res.status}.`,
    );
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success)
    throw new AppError(
      'datasource',
      'The relay’s answer doesn’t fit this app: update the relay to match it.',
      {
        isRetryable: false,
      },
    );
  return parsed.data;
}
