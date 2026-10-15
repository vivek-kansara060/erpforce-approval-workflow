import type { ApprovalDecision, ApprovalStatus } from '../types/approval';

const CANONICAL: Record<string, ApprovalStatus> = {
  pending: 'Pending',
  approved: 'Approved',
  accepted: 'Approved',
  rejected: 'Rejected',
  declined: 'Rejected',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  escalated: 'Escalated',
};

/**
 * The gateway and the individual module APIs disagree on casing
 * (`Pending` vs `pending`) and on synonyms (`Accepted` for `Approved`).
 * Every status comparison in the package goes through here.
 */
export const normalizeApprovalStatus = (value: unknown): ApprovalStatus | undefined => {
  if (typeof value !== 'string') return undefined;
  return CANONICAL[value.trim().toLowerCase()];
};

export const isPending = (value: unknown): boolean =>
  normalizeApprovalStatus(value) === 'Pending';

/** Only pending requests can be acted on. */
export const canTakeDecision = (status: unknown): boolean => isPending(status);

/**
 * Legal state transitions. Exported so hosts and tests can assert the rule
 * rather than re-deriving it from the UI.
 */
export const ALLOWED_TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  Pending: ['Approved', 'Rejected', 'Cancelled', 'Escalated'],
  Escalated: ['Approved', 'Rejected', 'Cancelled'],
  Approved: [],
  Rejected: [],
  Cancelled: [],
};

export const isTransitionAllowed = (
  from: unknown,
  to: ApprovalStatus,
): boolean => {
  const current = normalizeApprovalStatus(from);
  if (!current) return false;
  return ALLOWED_TRANSITIONS[current].includes(to);
};

/** CSS modifier used by the ERP `Chip` status classes. */
export const statusModifier = (value: unknown): string => {
  const normalized = normalizeApprovalStatus(value);
  if (normalized) return normalized;
  return typeof value === 'string' ? value.replace(/\s+/g, '') : '';
};

export const decisionSuccessKey = (
  decision: ApprovalDecision,
): 'approvedMessage' | 'rejectedMessage' =>
  decision === 'Approved' ? 'approvedMessage' : 'rejectedMessage';
