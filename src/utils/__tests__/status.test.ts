import { describe, expect, it } from 'vitest';
import {
  canTakeDecision,
  isPending,
  isTransitionAllowed,
  normalizeApprovalStatus,
  statusModifier,
} from '../status';

describe('normalizeApprovalStatus', () => {
  it('is case insensitive', () => {
    expect(normalizeApprovalStatus('pending')).toBe('Pending');
    expect(normalizeApprovalStatus('PENDING')).toBe('Pending');
    expect(normalizeApprovalStatus(' Pending ')).toBe('Pending');
  });

  it('maps the module synonyms onto the canonical statuses', () => {
    expect(normalizeApprovalStatus('Accepted')).toBe('Approved');
    expect(normalizeApprovalStatus('declined')).toBe('Rejected');
    expect(normalizeApprovalStatus('canceled')).toBe('Cancelled');
  });

  it('returns undefined for anything unrecognised', () => {
    expect(normalizeApprovalStatus('whatever')).toBeUndefined();
    expect(normalizeApprovalStatus(undefined)).toBeUndefined();
    expect(normalizeApprovalStatus(42)).toBeUndefined();
  });
});

describe('isPending / canTakeDecision', () => {
  it('only a pending request is actionable', () => {
    expect(isPending('Pending')).toBe(true);
    expect(isPending('pending')).toBe(true);
    expect(isPending('Approved')).toBe(false);
    expect(canTakeDecision('Rejected')).toBe(false);
    expect(canTakeDecision(undefined)).toBe(false);
  });
});

describe('isTransitionAllowed', () => {
  it('allows a decision on a pending request', () => {
    expect(isTransitionAllowed('Pending', 'Approved')).toBe(true);
    expect(isTransitionAllowed('Pending', 'Rejected')).toBe(true);
  });

  it('allows a decision on an escalated request', () => {
    expect(isTransitionAllowed('Escalated', 'Approved')).toBe(true);
  });

  it('refuses to re-decide a settled request', () => {
    expect(isTransitionAllowed('Approved', 'Rejected')).toBe(false);
    expect(isTransitionAllowed('Rejected', 'Approved')).toBe(false);
    expect(isTransitionAllowed('Cancelled', 'Approved')).toBe(false);
  });

  it('refuses an unknown source status', () => {
    expect(isTransitionAllowed('nonsense', 'Approved')).toBe(false);
  });
});

describe('statusModifier', () => {
  it('produces a stable CSS modifier', () => {
    expect(statusModifier('pending')).toBe('Pending');
    expect(statusModifier('In Progress')).toBe('InProgress');
    expect(statusModifier(undefined)).toBe('');
  });
});
