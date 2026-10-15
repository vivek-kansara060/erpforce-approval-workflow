import { APPROVAL_HISTORY_LIMIT } from '../constants/defaults';
import { buildListQuery } from './filters';
import { normalizeApprovalStatus } from './status';
import type { ListQuery } from '../types/common';
import type {
  ApprovalHistoryApprover,
  ApprovalHistoryData,
  ApprovalHistoryLevelStep,
  ApprovalHistoryRound,
  ApprovalHistoryStep,
  ApprovalHistorySubmittedStep,
  ApprovalHistorySummary,
  ApprovalRequest,
  ApprovalStatus,
  ApprovalUserRef,
} from '../types/approval';

export interface EntityRef {
  entityType: string;
  entityId: string;
}

/**
 * Normalises the identifiers a consumer passes for "the current record".
 *
 * Returns `undefined` when either is missing or blank: a record that has not
 * been saved yet has no history to fetch.
 */
export const toEntityRef = (
  entityType: string | null | undefined,
  entityId: string | number | null | undefined,
): EntityRef | undefined => {
  const type = typeof entityType === 'string' ? entityType.trim() : '';
  const id =
    typeof entityId === 'string' || typeof entityId === 'number' ? String(entityId).trim() : '';
  return type && id ? { entityType: type, entityId: id } : undefined;
};

/** Every field `toApprovalHistory` reads; the projection sent as `select`. */
export const APPROVAL_HISTORY_SELECT_FIELDS = [
  'id',
  'entity_type',
  'entity_id',
  'module',
  'status',
  'comments',
  'approver_id',
  'approver_data',
  'created_by_user',
  'created_by_data',
  'created_at',
  'updated_at',
  'approved_at',
  'approval_sequence',
  'version',
] as const;

/**
 * The `GET /v1/approvals/history` query for one record, in the gateway's list
 * convention: `skip`, `limit`, `order`, `select` and a `filters` group such as
 * `(entity_type.eq=purchase_orders&entity_id.eq=42)`. No status or approver
 * clause: the history covers every approver and every status. Oldest first, so
 * that if the limit ever bites it trims the end of the story, not the start.
 */
export const buildApprovalHistoryQuery = (ref: EntityRef): ListQuery =>
  buildListQuery({
    skip: 0,
    limit: APPROVAL_HISTORY_LIMIT,
    sort: { id: 'created_at', desc: false },
    requiredFields: APPROVAL_HISTORY_SELECT_FIELDS,
    viewFilter: `entity_type.eq=${ref.entityType}&entity_id.eq=${ref.entityId}`,
    includeAuditFields: false,
  });

/** True when an approval request was raised for `ref`. */
export const belongsToEntity = (record: Partial<ApprovalRequest>, ref: EntityRef): boolean =>
  String(record.entity_type ?? '') === ref.entityType &&
  String(record.entity_id ?? '') === ref.entityId;

const text = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

/** Display name from the user shapes the approvals service embeds. */
export const personName = (ref: ApprovalUserRef | null | undefined): string | undefined => {
  if (!ref || typeof ref !== 'object') return undefined;
  return text(ref.name) ?? text([text(ref.first_name), text(ref.last_name)].join(' '));
};

const positiveInt = (value: unknown): number | undefined => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Undated values sort last rather than breaking the comparator. */
const timeOf = (iso: string | undefined): number => {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(ms) ? Number.POSITIVE_INFINITY : ms;
};

const latestOf = (values: Array<string | undefined>): string | undefined => {
  let best: string | undefined;
  for (const value of values) {
    if (value && timeOf(value) !== Number.POSITIVE_INFINITY) {
      if (!best || timeOf(value) > timeOf(best)) best = value;
    }
  }
  return best;
};

/**
 * Status of a group from its members: a rejection settles it, anyone still
 * pending keeps it open, otherwise any approval carries it. A group of only
 * cancelled requests is cancelled.
 */
const STATUS_PRECEDENCE: readonly ApprovalStatus[] = [
  'Rejected',
  'Pending',
  'Escalated',
  'Approved',
  'Cancelled',
];

const combine = (statuses: Array<ApprovalStatus | undefined>): ApprovalStatus | undefined =>
  STATUS_PRECEDENCE.find((status) => statuses.includes(status));

/** An approver's own call, as opposed to a pending or system-closed request. */
const isDecision = (status: ApprovalStatus | undefined) =>
  status === undefined || status === 'Approved' || status === 'Rejected';

interface Row {
  key: string;
  request: Partial<ApprovalRequest>;
  status: ApprovalStatus | undefined;
  rawStatus: string | undefined;
  createdAt: string | undefined;
}

const toRows = (records: readonly unknown[]): Row[] => {
  const rows: Row[] = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    if (typeof record !== 'object' || record === null) return;
    const request = record as Partial<ApprovalRequest>;
    const hasId = request.id !== undefined && request.id !== null && request.id !== '';
    const key = hasId ? String(request.id) : `row-${index}`;
    if (seen.has(key)) return;
    seen.add(key);

    const rawStatus = text(request.status);
    rows.push({
      key,
      request,
      status: normalizeApprovalStatus(rawStatus),
      rawStatus,
      createdAt: text(request.created_at),
    });
  });

  // Array#sort is stable, so undated or simultaneous rows keep the server's order.
  return rows.sort((a, b) => {
    const ta = timeOf(a.createdAt);
    const tb = timeOf(b.createdAt);
    return ta === tb ? 0 : ta < tb ? -1 : 1;
  });
};

const groupBy = <K, T>(items: T[], keyOf: (item: T) => K): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return groups;
};

const buildLevel = (
  round: number,
  level: number | undefined,
  rows: Row[],
): ApprovalHistoryLevelStep => {
  /**
   * A level is raised with the workflow's instruction in `comments`, and a
   * decision without remarks leaves it there. Requests that were never decided
   * still carry it untouched, which is how the instruction is told apart from
   * what an approver actually wrote.
   */
  const message = rows
    .filter((row) => row.status === 'Pending' || row.status === 'Cancelled')
    .map((row) => text(row.request.comments))
    .find(Boolean);

  const approvers: ApprovalHistoryApprover[] = rows.map((row) => {
    const settled = row.rawStatus !== undefined && row.status !== 'Pending';
    const comments = text(row.request.comments);
    return {
      id: row.key,
      userId: row.request.approver_id ?? undefined,
      name: personName(row.request.approver_data),
      status: row.status,
      rawStatus: row.rawStatus,
      assignedAt: row.createdAt,
      // `updated_at` carries the time; `approved_at` is sometimes a bare date.
      decidedAt: settled
        ? (text(row.request.updated_at) ?? text(row.request.approved_at))
        : undefined,
      remarks:
        settled && isDecision(row.status) && comments && comments !== message
          ? comments
          : undefined,
    };
  });

  return {
    kind: 'level',
    id: `r${round}-l${level ?? 'x'}`,
    level,
    message,
    at: rows[0]?.createdAt,
    status: combine(approvers.map((approver) => approver.status)),
    approvers,
  };
};

const buildRound = (round: number, rows: Row[]): ApprovalHistoryRound => {
  const first = rows[0];
  const levels = [...groupBy(rows, (row) => positiveInt(row.request.approval_sequence))]
    .sort(([a], [b]) => (a ?? Number.POSITIVE_INFINITY) - (b ?? Number.POSITIVE_INFINITY))
    .map(([level, levelRows]) => buildLevel(round, level, levelRows));

  const status = combine(levels.map((level) => level.status));
  const approvers = levels.flatMap((level) => level.approvers);

  const steps: ApprovalHistoryStep[] = [
    {
      kind: 'submitted',
      id: `r${round}-submitted`,
      // Later levels are raised by whoever approved the previous one, so only
      // the round's first request names the requester.
      userName: text(first?.request.created_by_user) ?? personName(first?.request.created_by_data),
      at: first?.createdAt,
    },
    ...levels,
  ];

  if (status && status !== 'Pending' && status !== 'Escalated') {
    const rejecter = approvers
      .filter((approver) => approver.status === 'Rejected')
      .sort((a, b) => timeOf(b.decidedAt) - timeOf(a.decidedAt))[0];

    steps.push({
      kind: 'outcome',
      id: `r${round}-outcome`,
      status,
      userName: rejecter?.name,
      at: latestOf(approvers.map((approver) => approver.decidedAt)),
    });
  }

  return { round, status, steps };
};

const summarize = (rounds: ApprovalHistoryRound[]): ApprovalHistorySummary | undefined => {
  const latest = rounds[rounds.length - 1];
  if (!latest) return undefined;

  const pending = latest.steps
    .flatMap((step) =>
      step.kind === 'level' ? step.approvers.map((approver) => ({ step, approver })) : [],
    )
    .filter(({ approver }) => approver.status === 'Pending');
  const outcome = latest.steps.find((step) => step.kind === 'outcome');
  const submissions = rounds
    .map((round) => round.steps[0])
    .filter((step): step is ApprovalHistorySubmittedStep => step?.kind === 'submitted');

  const timestamps = rounds.flatMap((round) =>
    round.steps.flatMap((step) =>
      step.kind === 'level'
        ? step.approvers.flatMap((approver) => [approver.assignedAt, approver.decidedAt])
        : [step.at],
    ),
  );

  return {
    status: latest.status,
    currentLevel: pending[0]?.step.level,
    pendingWith: pending
      .map(({ approver }) => approver.name)
      .filter((name): name is string => Boolean(name)),
    pendingUnnamed: pending.filter(({ approver }) => !approver.name).length,
    rejectedBy: outcome?.status === 'Rejected' ? outcome.userName : undefined,
    // The latest submitter, or whoever submitted last with a known name.
    requestedBy: [...submissions].reverse().find((step) => step.userName)?.userName,
    lastActivityAt: latestOf(timestamps),
    roundCount: rounds.length,
  };
};

const EMPTY_HISTORY: ApprovalHistoryData = Object.freeze({ rounds: [], summary: undefined });

/**
 * Turns every approval request raised for one record into its history.
 *
 * Requests are grouped by submission round (`version`), then by approval level
 * (`approval_sequence`). Each round opens with the submission, lists every
 * level with each approver's outcome, and closes with the result once nothing
 * is pending. The input comes straight off the wire, so every field is treated
 * as optional and anything that is not an object is skipped.
 */
export const toApprovalHistory = (
  records: readonly ApprovalRequest[] | null | undefined,
): ApprovalHistoryData => {
  if (!Array.isArray(records)) return EMPTY_HISTORY;
  const rows = toRows(records);
  if (rows.length === 0) return EMPTY_HISTORY;

  const rounds = [...groupBy(rows, (row) => positiveInt(row.request.version) ?? 1)]
    .sort(([a], [b]) => a - b)
    .map(([round, roundRows]) => buildRound(round, roundRows));

  return { rounds, summary: summarize(rounds) };
};
