import { AppError } from '@/core/errors/AppError';

/** Google's error body: `{ error: { code, message, status } }`. */
interface GoogleErrorBody {
  error?: { code?: number; message?: string; status?: string };
}

/** A Google API error as an AppError: what the service said, with a code the UI understands. */
export function googleError(status: number, body: unknown, service: string): AppError {
  const message = (body as GoogleErrorBody | null)?.error?.message ?? `${service} answered ${status}.`;
  if (status === 401)
    return new AppError('forbidden', `${service} refused the credentials: ${message}`, {
      isRetryable: false,
    });
  if (status === 403)
    return new AppError('forbidden', `${service} denied access: ${message}`, { isRetryable: false });
  if (status === 404) return new AppError('datasource', `${service}: ${message}`, { isRetryable: false });
  if (status === 400) return new AppError('validation', `${service}: ${message}`, { isRetryable: false });
  if (status === 429) return new AppError('datasource', `${service} is rate-limiting: ${message}`);
  return new AppError('datasource', `${service}: ${message}`);
}

/** A JSON request to a Google API with a bearer token. Rejects with an AppError; honours `signal`. */
export async function googleFetch<T>(
  url: string,
  {
    token,
    body,
    method = body === undefined ? 'GET' : 'POST',
    signal,
    service,
  }: {
    token: string;
    body?: unknown;
    method?: string;
    signal?: AbortSignal;
    service: string;
  },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      signal,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new AppError('network', `Could not reach ${service}. Check your connection.`, { cause: error });
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) throw googleError(res.status, json, service);
  return json as T;
}
