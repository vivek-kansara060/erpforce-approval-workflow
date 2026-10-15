/** Approver configuration for a single approval stage inside an action node. */

export type ApproverType = 'USER' | 'DEPARTMENT' | 'HIERARCHY';

export type AutoApproveUnit = 'Day' | 'Week' | 'Month';

/** Reference to the action type (`/v1/workflow-references/action_type`). */
export interface ActionTypeRef {
  id: number | string;
  value: number | string;
  label: string;
}

/** Common auto-approve/escalation settings applied to every approver type. */
export interface AutoApproveConfig {
  auto_approve_enabled: boolean;
  auto_approve_value: number;
  auto_approve_unit: AutoApproveUnit | '';
}

export interface UserApproverConfig extends AutoApproveConfig {
  approver_type: 'USER';
  approver_ids: number[];
  approval_message: string;
}

export interface DepartmentApproverConfig extends AutoApproveConfig {
  approver_type: 'DEPARTMENT';
  department_id: string | number;
  designation_id: string | number;
  approval_message: string;
}

export interface HierarchyApproverConfig extends AutoApproveConfig {
  approver_type: 'HIERARCHY';
  level: string;
  approval_message: string;
}

export type ApproverConfig =
  | UserApproverConfig
  | DepartmentApproverConfig
  | HierarchyApproverConfig
  | AutoApproveConfig;

/** One persisted approval stage: what happens, and who approves it. */
export interface ApproverStage {
  action_type_ref: ActionTypeRef | '' | null;
  config?: ApproverConfig;
  module?: string;
}

/**
 * Flattened editing shape used by the action sidebar. It is denormalised on
 * purpose so every approver-type branch can bind to the same object, and is
 * folded back into `ApproverStage.config` on save.
 */
export interface ApproverStageDraft {
  action_type_ref: ActionTypeRef | '' | null;
  approver_type: ApproverType | '';
  department_id: string | number;
  designation_id: string | number;
  approver_ids: number[];
  level: string;
  approval_message: string;
  auto_approve_enabled: boolean;
  auto_approve_value: string | number;
  auto_approve_unit: string;
  module: string;
}
