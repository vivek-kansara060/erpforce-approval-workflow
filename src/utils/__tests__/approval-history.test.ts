import { describe, expect, it } from 'vitest';
import {
  APPROVAL_HISTORY_SELECT_FIELDS,
  belongsToEntity,
  buildApprovalHistoryQuery,
  personName,
  toApprovalHistory,
  toEntityRef,
} from '../approval-history';
import type {
  ApprovalHistoryLevelStep,
  ApprovalHistoryRound,
  ApprovalRequest,
} from '../../types/approval';

/** Shaped like a row from the workflow-automation `approvals` table. */
const row = (overrides: Partial<ApprovalRequest>): ApprovalRequest => ({
  id: 1,
  entity_type: 'purchase_orders',
  entity_id: 42,
  status: 'Pending',
  version: 1,
  approval_sequence: 1,
  ...overrides,
});

const user = (first: string, last: string) => ({ id: 1, first_name: first, last_name: last });

const levels = (round: ApprovalHistoryRound) =>
  round.steps.filter((step): step is ApprovalHistoryLevelStep => step.kind === 'level');

describe('toEntityRef', () => {
  it('normalises both identifiers to trimmed strings', () => {
    expect(toEntityRef(' purchase_orders ', 42)).toEqual({
      entityType: 'purchase_orders',
      entityId: '42',
    });
  });

  it('is undefined while either identifier is missing or blank', () => {
    expect(toEntityRef('purchase_orders', undefined)).toBeUndefined();
    expect(toEntityRef('purchase_orders', null)).toBeUndefined();
    expect(toEntityRef('purchase_orders', '  ')).toBeUndefined();
    expect(toEntityRef('', 42)).toBeUndefined();
    expect(toEntityRef(undefined, 42)).toBeUndefined();
  });
});

describe('buildApprovalHistoryQuery', () => {
  it('scopes to the record in the gateway filter syntax, oldest first', () => {
    const query = buildApprovalHistoryQuery({ entityType: 'purchase_orders', entityId: '42' });

    expect(query).toMatchObject({ skip: 0, limit: 100, order: 'created_at:1' });
    expect(query.filters).toBe('(entity_type.eq=purchase_orders&entity_id.eq=42)');
    // Every approver and every status.
    expect(query.filters).not.toMatch(/status|approver_id/);
    expect(query.select).toBe(`[${APPROVAL_HISTORY_SELECT_FIELDS.join(',')}]`);
    expect(query.select).toContain('approver_data');
    expect(query.select).toContain('approval_sequence');
    expect(query.select).toContain('version');
  });
});

describe('belongsToEntity', () => {
  it('matches on entity type and id, whatever the id type', () => {
    const ref = { entityType: 'purchase_orders', entityId: '42' };
    expect(belongsToEntity(row({}), ref)).toBe(true);
    expect(belongsToEntity(row({ entity_id: '42' }), ref)).toBe(true);
    expect(belongsToEntity(row({ entity_id: 43 }), ref)).toBe(false);
    expect(belongsToEntity(row({ entity_type: 'sales_orders' }), ref)).toBe(false);
  });
});

describe('personName', () => {
  it('reads the joined user shape the approvals service sends', () => {
    expect(personName(user('John', 'Doe'))).toBe('John Doe');
    expect(personName({ first_name: 'John', last_name: null })).toBe('John');
    expect(personName({ name: 'Display Name', first_name: 'x' })).toBe('Display Name');
    expect(personName({})).toBeUndefined();
    expect(personName(null)).toBeUndefined();
  });
});

describe('toApprovalHistory', () => {
  it('groups requests into levels with each approver, their outcome and remarks', () => {
    const { rounds, summary } = toApprovalHistory([
      row({
        id: 1,
        approval_sequence: 1,
        approver_data: user('John', 'Doe'),
        status: 'Approved',
        comments: 'Within budget',
        created_by_user: 'Vivek Kansara',
        created_at: '2026-09-23T10:20:00Z',
        updated_at: '2026-09-23T10:30:00Z',
      }),
      row({
        id: 2,
        approval_sequence: 2,
        approver_data: user('Priya', 'Shah'),
        comments: 'Finance approval required',
        // Later levels are raised by the approver of the previous one.
        created_by_user: 'John Doe',
        created_at: '2026-09-23T10:30:00Z',
      }),
      row({
        id: 3,
        approval_sequence: 2,
        approver_data: user('Sam', 'Lee'),
        comments: 'Finance approval required',
        created_by_user: 'John Doe',
        created_at: '2026-09-23T10:30:00Z',
      }),
    ]);

    expect(rounds).toHaveLength(1);
    const [round] = rounds;
    expect(round.status).toBe('Pending');
    expect(round.steps.map((step) => step.kind)).toEqual(['submitted', 'level', 'level']);
    expect(round.steps[0]).toMatchObject({
      userName: 'Vivek Kansara',
      at: '2026-09-23T10:20:00Z',
    });

    const [first, second] = levels(round);
    expect(first).toMatchObject({ level: 1, status: 'Approved' });
    expect(first.approvers[0]).toMatchObject({
      name: 'John Doe',
      status: 'Approved',
      remarks: 'Within budget',
      decidedAt: '2026-09-23T10:30:00Z',
    });
    expect(second).toMatchObject({
      level: 2,
      status: 'Pending',
      message: 'Finance approval required',
    });
    expect(second.approvers.map((approver) => approver.name)).toEqual(['Priya Shah', 'Sam Lee']);
    expect(second.approvers.every((approver) => approver.remarks === undefined)).toBe(true);

    expect(summary).toEqual({
      status: 'Pending',
      currentLevel: 2,
      pendingWith: ['Priya Shah', 'Sam Lee'],
      pendingUnnamed: 0,
      rejectedBy: undefined,
      requestedBy: 'Vivek Kansara',
      lastActivityAt: '2026-09-23T10:30:00Z',
      roundCount: 1,
    });
  });

  it('does not present the level instruction as an approver remark', () => {
    const { rounds } = toApprovalHistory([
      row({ id: 1, status: 'Approved', comments: 'Manager approval required' }),
      row({ id: 2, status: 'Pending', comments: 'Manager approval required' }),
    ]);

    const [level] = levels(rounds[0]);
    expect(level.message).toBe('Manager approval required');
    expect(level.approvers[0].remarks).toBeUndefined();
  });

  it('closes a rejected round, without crediting the requests it cancelled', () => {
    const { rounds, summary } = toApprovalHistory([
      row({
        id: 1,
        approver_data: user('Ann', 'Park'),
        status: 'Rejected',
        comments: 'Over budget',
        created_at: '2026-01-01T09:00:00Z',
        updated_at: '2026-01-01T11:00:00Z',
      }),
      row({
        id: 2,
        approver_data: user('Ben', 'Cole'),
        status: 'Cancelled',
        comments: 'Approval required',
        created_at: '2026-01-01T09:00:00Z',
        updated_at: '2026-01-01T11:00:00Z',
      }),
    ]);

    const [level] = levels(rounds[0]);
    expect(level.status).toBe('Rejected');
    expect(level.message).toBe('Approval required');
    expect(level.approvers[0].remarks).toBe('Over budget');
    expect(level.approvers[1]).toMatchObject({ status: 'Cancelled', remarks: undefined });
    expect(rounds[0].steps[rounds[0].steps.length - 1]).toMatchObject({
      kind: 'outcome',
      status: 'Rejected',
      userName: 'Ann Park',
      at: '2026-01-01T11:00:00Z',
    });
    expect(summary).toMatchObject({ status: 'Rejected', rejectedBy: 'Ann Park', pendingWith: [] });
  });

  it('closes an approved round at the last decision', () => {
    const { rounds } = toApprovalHistory([
      row({ id: 1, status: 'Approved', updated_at: '2026-01-01T10:00:00Z' }),
      row({ id: 2, approval_sequence: 2, status: 'Approved', updated_at: '2026-01-02T10:00:00Z' }),
    ]);

    expect(rounds[0].steps[rounds[0].steps.length - 1]).toEqual({
      kind: 'outcome',
      id: 'r1-outcome',
      status: 'Approved',
      userName: undefined,
      at: '2026-01-02T10:00:00Z',
    });
  });

  it('starts a new round for each resubmission, oldest first', () => {
    const { rounds, summary } = toApprovalHistory([
      row({
        id: 3,
        version: 2,
        created_by_user: 'Vivek Kansara',
        created_at: '2026-01-03T00:00:00Z',
      }),
      row({ id: 1, version: 1, status: 'Rejected', created_at: '2026-01-01T00:00:00Z' }),
    ]);

    expect(rounds.map((round) => [round.round, round.status])).toEqual([
      [1, 'Rejected'],
      [2, 'Pending'],
    ]);
    expect(summary).toMatchObject({
      status: 'Pending',
      roundCount: 2,
      requestedBy: 'Vivek Kansara',
    });
  });

  it('counts pending approvers whose name was not sent', () => {
    const { summary } = toApprovalHistory([
      row({ id: 1, approver_data: {} }),
      row({ id: 2, approver_data: user('Priya', 'Shah') }),
    ]);
    expect(summary).toMatchObject({ pendingWith: ['Priya Shah'], pendingUnnamed: 1 });
  });

  it('falls back to approved_at for the decision time', () => {
    const { rounds } = toApprovalHistory([
      row({ status: 'Approved', updated_at: undefined, approved_at: '2026-01-02' }),
    ]);
    expect(levels(rounds[0])[0].approvers[0].decidedAt).toBe('2026-01-02');
  });

  it('survives malformed and partial records without throwing', () => {
    const { rounds } = toApprovalHistory([
      null,
      'garbage',
      42,
      {},
      { id: 'dup', status: 'Pending' },
      { id: 'dup', status: 'Pending' },
      { id: 'odd', status: 'Partially Approved', version: 'x', approval_sequence: -1 },
    ] as unknown as ApprovalRequest[]);

    // Everything lands in round 1, in the one unsequenced level.
    expect(rounds).toHaveLength(1);
    const [level] = levels(rounds[0]);
    expect(level.level).toBeUndefined();
    expect(level.approvers.map((approver) => approver.id)).toEqual(['row-3', 'dup', 'odd']);
    expect(level.approvers[2]).toMatchObject({
      status: undefined,
      rawStatus: 'Partially Approved',
    });
  });

  it('is empty for anything that is not a non-empty list', () => {
    for (const input of [undefined, null, [], {} as unknown as ApprovalRequest[]]) {
      expect(toApprovalHistory(input)).toEqual({ rounds: [], summary: undefined });
    }
  });
});
