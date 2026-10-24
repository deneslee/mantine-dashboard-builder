import { AppError, isAppError } from '@/core/errors/AppError';
import type { AwsSecrets } from './awsPlugin';

/** The SDK's credentials from the connection's secrets. */
export const awsCredentials = ({ accessKeyId, secretAccessKey, sessionToken }: AwsSecrets) => ({
  accessKeyId,
  secretAccessKey,
  sessionToken,
});

const DENIED = new Set([
  'AccessDeniedException',
  'AccessDenied',
  'UnrecognizedClientException',
  'InvalidSignatureException',
  'ExpiredTokenException',
  'InvalidClientTokenId',
  'SignatureDoesNotMatch',
  'ForbiddenException',
]);
const INVALID = new Set([
  'ValidationException',
  'InvalidRequestException',
  'BadRequestException',
  'StatementTimeoutException',
]);

/**
 * An AWS SDK error as an AppError, with AWS's own message. Aborts pass through unchanged, so the
 * query layer can tell them apart.
 */
export function awsError(error: unknown, service: string): unknown {
  if (isAppError(error)) return error;
  if (error instanceof DOMException && error.name === 'AbortError') return error;
  const { name = '', message = '' } = (error ?? {}) as { name?: string; message?: string };
  if (name === 'AbortError') return error;
  if (DENIED.has(name))
    return new AppError('forbidden', `${service} refused the credentials: ${message}`, {
      cause: error,
      isRetryable: false,
    });
  if (INVALID.has(name))
    return new AppError('validation', `${service}: ${message}`, { cause: error, isRetryable: false });
  if (name === 'ResourceNotFoundException')
    return new AppError('datasource', `${service}: ${message}`, { cause: error, isRetryable: false });
  if (error instanceof TypeError)
    return new AppError('network', `Could not reach ${service}. Check your connection.`, { cause: error });
  return new AppError('datasource', `${service}: ${message || name || 'the request failed.'}`, {
    cause: error,
  });
}
