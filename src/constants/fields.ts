/**
 * Field names.
 *
 * These are the API field names, kept in one place so the form, the payload
 * mapper, the table columns and the validation schema can never drift apart.
 */

/** react-hook-form field-array namespace for the workflow form. */
export const WORKFLOW_FORM_NAME = 'approvalWorkflow' as const;

export const WORKFLOW_FIELDS = {
  ID: 'id',
  NAME: 'name',
  DESCRIPTION: 'description',
  MODULE: 'module',
  ENTITY_TYPE: 'entity_type',
  REQUEST_TYPE: 'request_type',
  IS_ACTIVE: 'is_active',
  STATUS: 'status',
  UPDATED_AT: 'updated_at',
  GRAPH: 'graph',
  COMPANY_IDS: 'company_ids',
  LOCATION_IDS: 'location_ids',
  DEPARTMENT_IDS: 'department_ids',
  GRADE_IDS: 'grade_ids',
  EMPLOYMENT_TYPE_IDS: 'employment_type_ids',
  ENTITY_TYPE_DATA: 'request_category_data',
  REQUEST_TYPE_DATA: 'request_type_data',
} as const;

export type WorkflowFieldName = (typeof WORKFLOW_FIELDS)[keyof typeof WORKFLOW_FIELDS];

/** The scope fields; at least one must be set before a workflow can be saved. */
export const WORKFLOW_SCOPE_FIELDS = [
  WORKFLOW_FIELDS.COMPANY_IDS,
  WORKFLOW_FIELDS.LOCATION_IDS,
  WORKFLOW_FIELDS.DEPARTMENT_IDS,
  WORKFLOW_FIELDS.GRADE_IDS,
  WORKFLOW_FIELDS.EMPLOYMENT_TYPE_IDS,
] as const;

export const APPROVAL_FIELDS = {
  ID: 'series_number',
  ENTITY_TYPE: 'entity_type',
  /** Virtual column: the module record's series number, opening its details. */
  RECORD_REF: 'entity_type_data',
  ENTITY_ID: 'entity_id',
  DESCRIPTION: 'comments',
  REQUESTED_BY: 'created_by_user',
  DATE: 'created_at',
  STATUS: 'status',
  ACTION: 'action',
} as const;

/**
 * Extra fields always requested from the API regardless of visible columns,
 * because the row actions need them even when the column is hidden.
 */
export const APPROVAL_REQUIRED_SELECT_FIELDS = [
  'entity_id',
  'entity_type',
  'module',
  'created_by_user',
  'request_data',
  'entity_type_data',
] as const;

export const WORKFLOW_REQUIRED_SELECT_FIELDS = [
  'request_type_data',
  'request_category_data',
  'series_number',
  // The scope columns summarise all five lists, so all five are always fetched.
  'company_ids',
  'location_ids',
  'department_ids',
  'grade_ids',
  'employment_type_ids',
] as const;
