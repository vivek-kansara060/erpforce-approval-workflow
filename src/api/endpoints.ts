/**
 * Every path the package requests, in one place.
 *
 * Paths are relative to the service base URL the host configures — the package
 * never contains an absolute URL or an environment variable.
 */
export const ENDPOINTS = {
  workflows: '/v1/workflows',
  workflowById: (id: string) => `/v1/workflows/${encodeURIComponent(id)}`,

  workflowReferences: '/v1/workflow-references/',
  workflowReferencesByType: (type: string) =>
    `/v1/workflow-references/${encodeURIComponent(type)}`,
  entityFieldOptions: (entityType: string) =>
    `/v1/workflow-references/entity-field-options/${encodeURIComponent(entityType)}`,
  entityFields: (entityType: string) =>
    `/v1/workflow-references/fields/${encodeURIComponent(entityType)}`,

  approvals: '/v1/approvals',
  approvalById: (id: string) => `/v1/approvals/${encodeURIComponent(id)}`,
  /** Audit trail of a single approval request. */
  approvalDetails: (id: string) => `/v1/approvals/${encodeURIComponent(id)}/details`,
  /** Every approval raised for one record (`entity_type` + `entity_id`), any approver. */
  approvalHistory: () => '/v1/approvals/history',

  schemaFields: (name: string) =>
    `/v1/form-builder/mongo-schema-fields/${encodeURIComponent(name)}`,
  filterTable: '/v1/filter/filter-table',

  userModules: '/v1/user/modules',
  hierarchyLevels: '/v1/organisation-structure/hierarchy-levels',
} as const;
