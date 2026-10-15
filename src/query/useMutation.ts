import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toApprovalWorkflowError } from '../utils/errors';
import type { ApprovalWorkflowError, AsyncStatus } from '../types/common';

export interface UseMutationOptions<TInput, TResult> {
  onSuccess?: (result: TResult, input: TInput) => void | Promise<void>;
  onError?: (error: ApprovalWorkflowError, input: TInput) => void;
  onSettled?: () => void;
}

export interface UseMutationResult<TInput, TResult> {
  mutate: (input: TInput) => Promise<TResult | undefined>;
  status: AsyncStatus;
  isLoading: boolean;
  error: ApprovalWorkflowError | undefined;
  reset: () => void;
}

/**
 * Write-side counterpart to `useQuery`.
 *
 * `mutate` resolves with the result and never rejects, so callers can branch on
 * the value without a try/catch around every save handler. Failures reach the
 * caller through `onError` and the returned `error`.
 *
 * Concurrent calls are ignored while one is in flight, which is what stops the
 * double-submit the original save buttons allowed.
 *
 * The returned object keeps its identity until `status` or `error` changes, so
 * it is safe in a dependency array.
 */
export const useMutation = <TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  options: UseMutationOptions<TInput, TResult> = {},
): UseMutationResult<TInput, TResult> => {
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<ApprovalWorkflowError | undefined>(undefined);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const mutationFnRef = useRef(mutationFn);
  mutationFnRef.current = mutationFn;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(async (input: TInput): Promise<TResult | undefined> => {
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;

    setStatus('loading');
    setError(undefined);

    try {
      const result = await mutationFnRef.current(input);
      await optionsRef.current.onSuccess?.(result, input);
      if (mountedRef.current) setStatus('success');
      return result;
    } catch (cause) {
      const normalized = toApprovalWorkflowError(cause);
      optionsRef.current.onError?.(normalized, input);
      if (mountedRef.current) {
        setError(normalized);
        setStatus('error');
      }
      return undefined;
    } finally {
      inFlightRef.current = false;
      optionsRef.current.onSettled?.();
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(undefined);
  }, []);

  return useMemo(
    () => ({ mutate, status, isLoading: status === 'loading', error, reset }),
    [mutate, status, error, reset],
  );
};
