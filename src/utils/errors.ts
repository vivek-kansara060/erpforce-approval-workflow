import { ApprovalWorkflowError } from '../types/common';

/** Shown whenever there is nothing more specific that is safe to say. */
export const GENERIC_ERROR_MESSAGE = 'Something went wrong';

/**
 * Normalises anything thrown into an `ApprovalWorkflowError`.
 *
 * The one conversion used by the cache, the mutation hook and the HTTP client,
 * so every error a consumer sees has the same shape. The original value is kept
 * as `cause`, never discarded.
 */
export const toApprovalWorkflowError = (cause: unknown): ApprovalWorkflowError => {
  if (cause instanceof ApprovalWorkflowError) return cause;
  const message = cause instanceof Error && cause.message ? cause.message : GENERIC_ERROR_MESSAGE;
  return new ApprovalWorkflowError(message, { cause });
};

/** A request cancelled through its `AbortSignal`, which is not a failure. */
export const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { name?: unknown }).name === 'AbortError';

/**
 * The part of an error it is safe to put in front of a user.
 *
 * Client errors (4xx) and the package's own validation errors carry actionable
 * text — "this request has already been actioned" — so their message is shown.
 * A server fault (5xx) can carry stack traces or SQL, and a `TypeError` is a
 * transport failure or a bug, so both fall back to the generic copy; the full
 * error still reaches the host through `onError` and the returned `error`.
 */
export const getUserFacingErrorMessage = (
  error: unknown,
  fallback: string = GENERIC_ERROR_MESSAGE,
): string => {
  if (error === undefined || error === null) return fallback;

  const normalized = toApprovalWorkflowError(error);
  if (normalized.status !== undefined && normalized.status >= 500) return fallback;
  if (normalized.code === 'network-error') return fallback;
  if ((normalized as { cause?: unknown }).cause instanceof TypeError) return fallback;

  return normalized.message.trim() || fallback;
};
