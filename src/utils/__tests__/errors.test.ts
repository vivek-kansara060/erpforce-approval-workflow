import { describe, expect, it } from 'vitest';
import {
  GENERIC_ERROR_MESSAGE,
  getUserFacingErrorMessage,
  isAbortError,
  toApprovalWorkflowError,
} from '../errors';
import { formatTimestamp } from '../format';
import { ApprovalWorkflowError } from '../../types/common';

describe('toApprovalWorkflowError', () => {
  it('returns an ApprovalWorkflowError unchanged', () => {
    const error = new ApprovalWorkflowError('Conflict', { status: 409 });
    expect(toApprovalWorkflowError(error)).toBe(error);
  });

  it('wraps a plain Error, keeping its message and the original as cause', () => {
    const cause = new Error('Budget missing');
    const error = toApprovalWorkflowError(cause);

    expect(error).toBeInstanceOf(ApprovalWorkflowError);
    expect(error.message).toBe('Budget missing');
    expect((error as { cause?: unknown }).cause).toBe(cause);
  });

  it('falls back to the generic message for a non-Error throw', () => {
    expect(toApprovalWorkflowError('nope').message).toBe(GENERIC_ERROR_MESSAGE);
    expect(toApprovalWorkflowError(undefined).message).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe('getUserFacingErrorMessage', () => {
  it('shows the message of a client error', () => {
    const error = new ApprovalWorkflowError('Request already actioned', { status: 409 });
    expect(getUserFacingErrorMessage(error)).toBe('Request already actioned');
  });

  it('shows the package’s own validation messages', () => {
    const error = new ApprovalWorkflowError('Select a scope', { code: 'scope-required' });
    expect(getUserFacingErrorMessage(error)).toBe('Select a scope');
  });

  it('hides a server fault behind the fallback', () => {
    const error = new ApprovalWorkflowError('ER_DUP_ENTRY at pool.query (db.js:42)', {
      status: 500,
    });
    expect(getUserFacingErrorMessage(error, 'Try again')).toBe('Try again');
  });

  it('hides a network failure behind the fallback', () => {
    const network = new ApprovalWorkflowError('Network request failed', {
      code: 'network-error',
    });
    expect(getUserFacingErrorMessage(network)).toBe(GENERIC_ERROR_MESSAGE);
    expect(getUserFacingErrorMessage(new TypeError('Failed to fetch'))).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('shows a host adapter’s own error text', () => {
    expect(getUserFacingErrorMessage(new Error('Budget exceeded'))).toBe('Budget exceeded');
  });

  it('returns the fallback when there is no error', () => {
    expect(getUserFacingErrorMessage(undefined, 'Fallback')).toBe('Fallback');
  });
});

describe('isAbortError', () => {
  it('recognises an AbortError by name', () => {
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
    expect(isAbortError(new Error('boom'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('formatTimestamp', () => {
  it('prefers the host formatter', () => {
    expect(formatTimestamp('2026-09-23T10:00:00Z', { formatDate: () => '23/09/2026' })).toBe(
      '23/09/2026',
    );
  });

  it('returns undefined for a missing value and the raw text for an invalid one', () => {
    expect(formatTimestamp(undefined)).toBeUndefined();
    expect(formatTimestamp('')).toBeUndefined();
    expect(formatTimestamp('not a date')).toBe('not a date');
  });

  it('formats a valid date in the browser locale', () => {
    const value = '2026-09-23T10:00:00Z';
    expect(formatTimestamp(value)).toBe(new Date(value).toLocaleDateString());
    expect(formatTimestamp(value, { withTime: true })).toBe(new Date(value).toLocaleString());
  });
});
