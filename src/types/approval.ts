/** Approval requests: the runtime side of a workflow. */

/**
 * Status of an individual approval request.
 *
 * The gateway returns title-case values (`Pending`), while some module APIs
 * accept lower-case. Comparisons in this package always go through
 * `normalizeApprovalStatus` in utils/status.ts.
 */
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Escalated';

/** The two decisions a user can take from the dashboard. */
export type ApprovalDecision = 'Approved' | 'Rejected';

/** A user as the approvals service embeds one. */
export interface ApprovalUserRef {
  id?: string | number;
  first_name?: string | null;
  last_name?: string | null;
  /** Some services send a single display name instead. */
  name?: string | null;
}

export interface ApprovalRequest {
  id: string | number;
  series_number?: string;

  /** Entity under approval, e.g. `leave_requests`. Drives adapter lookup. */
  entity_type: string;
  /** Primary key of the record under approval in its own module. */
  entity_id: string | number;
  module?: string;

  status: ApprovalStatus;
  comments?: string | null;

  approver_id?: string | number;
  /** The approver, joined from the user table. `{}` when the user is gone. */
  approver_data?: ApprovalUserRef | null;
  created_by_user?: string;
  created_by_data?: ApprovalUserRef | null;
  created_at?: string;
  updated_at?: string;
  /** Set when the request is decided. Some writers store a date without a time. */
  approved_at?: string | null;

  /** 1-based approval level within the workflow. */
  approval_sequence?: number | null;
  /** Submission round: a resubmission raises a new version of every level. */
  version?: number | null;

  /** Denormalised snapshot of the underlying record, when the API includes it. */
  request_data?: Record<string, unknown> | null;

  /** Which workflow and stage produced this request. */
  workflow_id?: string;
  stage_index?: number;
  level?: string;
}

export interface ApprovalHistoryEntry {
  id: string | number;
  approval_request_id: string | number;
  status: ApprovalStatus;
  comments?: string | null;
  actor_id?: string | number;
  actor_name?: string;
  acted_at: string;
  stage_index?: number;
}

/** One approver at one level, with what they did. */
export interface ApprovalHistoryApprover {
  /** Id of the approval request; stable across refetches. */
  id: string;
  userId?: string | number;
  name?: string;
  /** Normalised status; `undefined` when the server sent something unrecognised. */
  status: ApprovalStatus | undefined;
  rawStatus?: string;
  assignedAt?: string;
  /** When the approver acted, or when the request was closed on their behalf. */
  decidedAt?: string;
  /** What the approver wrote when deciding. */
  remarks?: string;
}

/** The record was put up for approval: first submission or a resubmission. */
export interface ApprovalHistorySubmittedStep {
  kind: 'submitted';
  id: string;
  /** Requester's display name. */
  userName?: string;
  at?: string;
}

/** One approval level and everyone it was sent to. */
export interface ApprovalHistoryLevelStep {
  kind: 'level';
  id: string;
  /** 1-based; `undefined` for requests raised outside a sequenced workflow. */
  level?: number;
  /** The instruction the workflow attached to this level, when known. */
  message?: string;
  /** When the level was raised. */
  at?: string;
  /** Rejected if anyone rejected, pending while anyone is pending, else approved. */
  status: ApprovalStatus | undefined;
  approvers: ApprovalHistoryApprover[];
}

/** The round finished. */
export interface ApprovalHistoryOutcomeStep {
  kind: 'outcome';
  id: string;
  status: ApprovalStatus;
  /** Who settled it, when one person did (the rejecting approver). */
  userName?: string;
  at?: string;
}

export type ApprovalHistoryStep =
  | ApprovalHistorySubmittedStep
  | ApprovalHistoryLevelStep
  | ApprovalHistoryOutcomeStep;

/** One submission of the record and everything that happened to it. */
export interface ApprovalHistoryRound {
  /** 1-based submission number (the approval `version`). */
  round: number;
  status: ApprovalStatus | undefined;
  steps: ApprovalHistoryStep[];
}

/** Where the record stands now, taken from its latest round. */
export interface ApprovalHistorySummary {
  status: ApprovalStatus | undefined;
  /** Level currently waiting, when one is. */
  currentLevel?: number;
  /** Names of the approvers the record is waiting on. */
  pendingWith: string[];
  /** Pending approvers whose name the server did not send. */
  pendingUnnamed: number;
  /** Rejecting approver, when the latest round was rejected. */
  rejectedBy?: string;
  requestedBy?: string;
  lastActivityAt?: string;
  roundCount: number;
}

/** A record's approval history, oldest round first. */
export interface ApprovalHistoryData {
  rounds: ApprovalHistoryRound[];
  /** `undefined` when the record has no approvals at all. */
  summary: ApprovalHistorySummary | undefined;
}

/** Filters the dashboard exposes. All optional — the view composes them. */
export interface ApprovalDashboardFilters {
  status?: ApprovalStatus | ApprovalStatus[];
  entityType?: string;
  /** Restrict to requests assigned to a specific approver. */
  approverId?: string | number;
  module?: string;
  search?: string;
  /** Raw ERP filter fragment merged with the generated one. */
  raw?: string;
}

/** Payload for the generic approve/reject endpoint. */
export interface ApprovalActionPayload {
  id: string | number;
  status: ApprovalDecision;
  comments?: string;
}
