import { DEFAULT_APPROVAL_MESSAGES, createDefaultApproverStage } from '../constants/defaults';
import type {
  ApproverConfig,
  ApproverStage,
  ApproverStageDraft,
  ApproverType,
  AutoApproveConfig,
  AutoApproveUnit,
} from '../types/approver';

const capitalise = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';

const buildAutoApprove = (draft: ApproverStageDraft): AutoApproveConfig => ({
  auto_approve_enabled: draft.auto_approve_enabled || false,
  auto_approve_value: Number(draft.auto_approve_value) || 0,
  auto_approve_unit: (capitalise(String(draft.auto_approve_unit ?? '')) || '') as
    | AutoApproveUnit
    | '',
});

/**
 * Folds the flat editing draft into the discriminated `config` the API stores.
 *
 * Each approver type persists only its own fields, so switching type in the UI
 * cannot leak a stale `department_id` into a `USER` stage — a real defect in
 * the original object-literal builder, which kept whatever the previous branch
 * had written onto the same draft object.
 */
export const draftToApproverConfig = (draft: ApproverStageDraft): ApproverConfig => {
  const autoApprove = buildAutoApprove(draft);

  switch (draft.approver_type as ApproverType | '') {
    case 'HIERARCHY':
      return {
        approver_type: 'HIERARCHY',
        level: draft.level,
        approval_message:
          draft.approval_message || DEFAULT_APPROVAL_MESSAGES.HIERARCHY(draft.level),
        ...autoApprove,
      };
    case 'DEPARTMENT':
      return {
        approver_type: 'DEPARTMENT',
        department_id: draft.department_id,
        designation_id: draft.designation_id,
        approval_message: draft.approval_message || DEFAULT_APPROVAL_MESSAGES.DEPARTMENT(),
        ...autoApprove,
      };
    case 'USER':
      return {
        approver_type: 'USER',
        approver_ids: draft.approver_ids ?? [],
        approval_message: draft.approval_message || DEFAULT_APPROVAL_MESSAGES.USER(),
        ...autoApprove,
      };
    default:
      return autoApprove;
  }
};

export const draftToStage = (draft: ApproverStageDraft, module: string): ApproverStage => ({
  action_type_ref: draft.action_type_ref,
  config: draftToApproverConfig(draft),
  module,
});

/** Expands a persisted stage back into the flat editing draft. */
export const stageToDraft = (stage: ApproverStage, module: string): ApproverStageDraft => {
  const base = createDefaultApproverStage(stage.module ?? module);
  const config = (stage.config ?? {}) as Record<string, unknown>;

  const draft: ApproverStageDraft = { ...base, action_type_ref: stage.action_type_ref ?? '' };

  for (const key of Object.keys(base) as Array<keyof ApproverStageDraft>) {
    if (key === 'action_type_ref') continue;
    const value = config[key];
    if (value === undefined || value === null || value === '') continue;
    // Widening is safe: keys and value types are paired by construction above.
    (draft as unknown as Record<string, unknown>)[key] = value;
  }

  // `auto_approve_unit` is persisted capitalised but the select options are lower-case.
  if (typeof draft.auto_approve_unit === 'string') {
    draft.auto_approve_unit = draft.auto_approve_unit.toLowerCase();
  }

  return draft;
};

/**
 * Whether a stage names an action at all.
 *
 * The action key is what the engine dispatches on, so a stage without one is an
 * empty row the author never filled in — persisting it makes the backend
 * synthesise a `custom` action that does nothing. The approver fields may still
 * be blank: that is a real action, just partly configured, and it is kept.
 */
export const hasActionType = (draft: ApproverStageDraft): boolean =>
  Boolean(draft.action_type_ref);

/** A stage can be saved once it has an action type. */
export const isStageComplete = (draft: ApproverStageDraft): boolean => {
  if (!hasActionType(draft)) return false;

  switch (draft.approver_type) {
    case 'USER':
      return draft.approver_ids.length > 0;
    case 'DEPARTMENT':
      return Boolean(draft.department_id);
    case 'HIERARCHY':
      return Boolean(draft.level);
    default:
      // No approver strategy chosen yet: the action alone is enough, matching
      // the original save-button rule.
      return true;
  }
};
