import { describe, expect, it } from 'vitest';
import {
  draftToApproverConfig,
  hasActionType,
  isStageComplete,
  stageToDraft,
} from '../approver-config';
import { createDefaultApproverStage } from '../../constants/defaults';
import type { ApproverStageDraft } from '../../types/approver';

const draft = (overrides: Partial<ApproverStageDraft> = {}): ApproverStageDraft => ({
  ...createDefaultApproverStage('hrms'),
  action_type_ref: { id: 1, value: 1, label: 'Approve' },
  ...overrides,
});

describe('draftToApproverConfig', () => {
  it('persists only the user fields for a USER stage', () => {
    const config = draftToApproverConfig(
      draft({
        approver_type: 'USER',
        approver_ids: [7, 8],
        // Left over from a previous DEPARTMENT selection in the same drawer.
        department_id: 42,
        designation_id: 9,
      }),
    );

    expect(config).toMatchObject({ approver_type: 'USER', approver_ids: [7, 8] });
    expect(config).not.toHaveProperty('department_id');
    expect(config).not.toHaveProperty('designation_id');
  });

  it('persists only the department fields for a DEPARTMENT stage', () => {
    const config = draftToApproverConfig(
      draft({ approver_type: 'DEPARTMENT', department_id: 3, designation_id: 4, approver_ids: [1] }),
    );

    expect(config).toMatchObject({ approver_type: 'DEPARTMENT', department_id: 3, designation_id: 4 });
    expect(config).not.toHaveProperty('approver_ids');
  });

  it('persists only the level for a HIERARCHY stage', () => {
    const config = draftToApproverConfig(draft({ approver_type: 'HIERARCHY', level: 'L2' }));

    expect(config).toMatchObject({ approver_type: 'HIERARCHY', level: 'L2' });
    expect(config).not.toHaveProperty('approver_ids');
  });

  it('fills a default approval message per approver type', () => {
    expect(
      draftToApproverConfig(draft({ approver_type: 'HIERARCHY', level: 'L3' })),
    ).toMatchObject({ approval_message: 'L3 Manager approval required' });

    expect(draftToApproverConfig(draft({ approver_type: 'USER', approver_ids: [1] }))).toMatchObject(
      { approval_message: 'Final approval from management' },
    );
  });

  it('keeps a user-supplied approval message', () => {
    const config = draftToApproverConfig(
      draft({ approver_type: 'USER', approver_ids: [1], approval_message: 'Please review' }),
    );

    expect(config).toMatchObject({ approval_message: 'Please review' });
  });

  it('normalises the auto-approve settings', () => {
    const config = draftToApproverConfig(
      draft({
        approver_type: 'USER',
        approver_ids: [1],
        auto_approve_enabled: true,
        auto_approve_value: '3',
        auto_approve_unit: 'week',
      }),
    );

    expect(config).toMatchObject({
      auto_approve_enabled: true,
      auto_approve_value: 3,
      auto_approve_unit: 'Week',
    });
  });

  it('emits a zeroed auto-approve block when no approver type is chosen', () => {
    expect(draftToApproverConfig(draft({ approver_type: '' }))).toEqual({
      auto_approve_enabled: false,
      auto_approve_value: 0,
      auto_approve_unit: '',
    });
  });
});

describe('stageToDraft', () => {
  it('expands a persisted stage back into the editing shape', () => {
    const restored = stageToDraft(
      {
        action_type_ref: { id: 1, value: 1, label: 'Approve' },
        module: 'hrms',
        config: {
          approver_type: 'DEPARTMENT',
          department_id: 3,
          designation_id: 4,
          approval_message: 'Head approval',
          auto_approve_enabled: true,
          auto_approve_value: 2,
          auto_approve_unit: 'Day',
        },
      },
      'hrms',
    );

    expect(restored.approver_type).toBe('DEPARTMENT');
    expect(restored.department_id).toBe(3);
    // Lower-cased so it matches the select options.
    expect(restored.auto_approve_unit).toBe('day');
    expect(restored.approver_ids).toEqual([]);
  });

  it('survives a round trip', () => {
    const original = draft({ approver_type: 'HIERARCHY', level: 'L1' });
    const roundTripped = stageToDraft(
      { action_type_ref: original.action_type_ref, config: draftToApproverConfig(original), module: 'hrms' },
      'hrms',
    );

    expect(roundTripped.approver_type).toBe('HIERARCHY');
    expect(roundTripped.level).toBe('L1');
  });
});

describe('isStageComplete', () => {
  it('requires an action type', () => {
    expect(isStageComplete(draft({ action_type_ref: '' }))).toBe(false);
  });

  it('requires at least one user for a USER stage', () => {
    expect(isStageComplete(draft({ approver_type: 'USER', approver_ids: [] }))).toBe(false);
    expect(isStageComplete(draft({ approver_type: 'USER', approver_ids: [1] }))).toBe(true);
  });

  it('requires a department for a DEPARTMENT stage', () => {
    expect(isStageComplete(draft({ approver_type: 'DEPARTMENT' }))).toBe(false);
    expect(isStageComplete(draft({ approver_type: 'DEPARTMENT', department_id: 1 }))).toBe(true);
  });

  it('requires a level for a HIERARCHY stage', () => {
    expect(isStageComplete(draft({ approver_type: 'HIERARCHY' }))).toBe(false);
    expect(isStageComplete(draft({ approver_type: 'HIERARCHY', level: 'L1' }))).toBe(true);
  });
});

describe('hasActionType', () => {
  it('is false for a row the author never filled in', () => {
    expect(hasActionType(draft({ action_type_ref: '' }))).toBe(false);
  });

  it('is true once an action is chosen, even with no approver yet', () => {
    expect(
      hasActionType(
        draft({
          action_type_ref: { id: 'act_send_email', value: 'send_email', label: 'Send Email' },
          approver_type: '',
          approver_ids: [],
        }),
      ),
    ).toBe(true);
  });

  it('is the gate `isStageComplete` applies first', () => {
    const blank = draft({ action_type_ref: '' });
    expect(hasActionType(blank)).toBe(false);
    expect(isStageComplete(blank)).toBe(false);
  });
});
