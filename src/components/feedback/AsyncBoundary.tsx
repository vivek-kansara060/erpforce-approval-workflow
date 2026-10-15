import type { ReactNode } from 'react';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import type { ApprovalWorkflowError } from '../../types/common';

export interface AsyncBoundaryProps {
  isLoading: boolean;
  error: ApprovalWorkflowError | undefined;
  /** When true and not loading/errored, the empty state is rendered. */
  isEmpty?: boolean;
  onRetry?: () => void;
  /** Heading above the error message, e.g. "Failed to load approval history". */
  errorTitle?: string;
  retryLabel?: string;
  loading?: ReactNode;
  empty?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Call to action on the default empty state, e.g. the list's add button. */
  emptyAction?: ReactNode;
  variant?: 'page' | 'inline';
  children: ReactNode;
}

/**
 * Loading -> error -> empty -> content, in one place.
 *
 * Every screen in the package routes through this, so the four states are
 * always handled and always look the same. The original handled them ad hoc:
 * the dashboard had no error state at all, and the workflow list rendered an
 * empty table with no message.
 */
export const AsyncBoundary = ({
  isLoading,
  error,
  isEmpty = false,
  onRetry,
  errorTitle,
  retryLabel,
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  variant = 'inline',
  children,
}: AsyncBoundaryProps) => {
  if (isLoading) return <>{loading ?? <LoadingState variant={variant} />}</>;
  if (error) {
    return (
      <ErrorState error={error} title={errorTitle} onRetry={onRetry} retryLabel={retryLabel} />
    );
  }

  if (isEmpty) {
    if (empty !== undefined) return <>{empty}</>;
    if (emptyTitle) {
      return (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      );
    }
  }

  return <>{children}</>;
};
