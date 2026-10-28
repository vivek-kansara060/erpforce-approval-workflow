import { describe, expect, it } from 'vitest';
import { getNodeIssues } from '../node-validation';
import type { ApproverStage } from '../../types/approver';
import type { WorkflowNode } from '../../types/graph';

const node = (type: WorkflowNode['type'], data: Record<string, unknown>) =>
  ({ id: 'n', type, position: { x: 0, y: 0 }, data }) as unknown as WorkflowNode;

const approval = (config: Record<string, unknown> | undefined): ApproverStage => ({
  action_type_ref: { id: 1, value: 'request_approval', label: 'Request Approval' },
  config: config as ApproverStage['config'],
});

describe('getNodeIssues', () => {
  it('flags a criteria with no conditions', () => {
    expect(getNodeIssues(node('criteria', { label: 'c', conditions: [] }))).toEqual([
      { code: 'no-conditions' },
    ]);
  });

  it('numbers each incomplete condition', () => {
    const complete = { condition_type: 'operator', field: 'total', operator: 'gt', value: 5 };
    const blank = { condition_type: 'operator', field: '', operator: '', value: '' };

    expect(
      getNodeIssues(node('criteria', { label: 'c', conditions: [complete, blank, complete] })),
    ).toEqual([{ code: 'condition-incomplete', index: 2 }]);
    expect(getNodeIssues(node('criteria', { label: 'c', conditions: [complete] }))).toEqual([]);
  });

  it('flags an action with no stages, and stages with no approver', () => {
    expect(getNodeIssues(node('action', { label: 'a', action: [] }))).toEqual([
      { code: 'no-stages' },
    ]);

    const noApprovers = approval({ approver_type: 'USER', approver_ids: [] });
    const withApprover = approval({ approver_type: 'USER', approver_ids: [4] });
    expect(getNodeIssues(node('action', { label: 'a', action: [withApprover, noApprovers] }))).toEqual([
      { code: 'stage-incomplete', index: 2 },
    ]);
  });

  it('lets a Pass/Fail branch be empty, but not half-configured', () => {
    expect(getNodeIssues(node('criteriaResult', { label: 'Pass', action: [] }))).toEqual([]);
    expect(
      getNodeIssues(
        node('actionResult', {
          label: 'Fail',
          action: [approval({ approver_type: 'HIERARCHY', level: '' })],
        }),
      ),
    ).toEqual([{ code: 'stage-incomplete', index: 1 }]);
  });

  it('never flags the trigger', () => {
    expect(getNodeIssues(node('trigger', { label: 't', trigger: 'x' }))).toEqual([]);
  });
});
