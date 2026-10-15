import { WORKFLOW_SCOPE_FIELDS } from '../constants/fields';
import { createDefaultWorkflowFormValues } from '../constants/defaults';
import { transformGraphForApi, transformGraphFromApi } from './graph-transform';
import type {
  Workflow,
  WorkflowFormValues,
  WorkflowScope,
  WorkflowWritePayload,
} from '../types/workflow';

/** The five scope lists of any workflow-shaped value, each defaulted to `[]`. */
export const toWorkflowScope = (
  source: Partial<WorkflowScope> | null | undefined,
): WorkflowScope => ({
  company_ids: source?.company_ids ?? [],
  location_ids: source?.location_ids ?? [],
  department_ids: source?.department_ids ?? [],
  grade_ids: source?.grade_ids ?? [],
  employment_type_ids: source?.employment_type_ids ?? [],
});

/**
 * At least one scope list must be populated before a workflow can be saved.
 * The original enforced this with an inline `Object.entries().filter().length`
 * duplicated in both the add and edit screens.
 */
export const hasScopeSelection = (values: Partial<WorkflowFormValues>): boolean =>
  WORKFLOW_SCOPE_FIELDS.some((field) => {
    const value = values[field];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null;
  });

/** Form values -> API payload. */
export const toWorkflowPayload = (
  values: WorkflowFormValues,
  options: { module: string; status?: 'draft' | 'published' },
): WorkflowWritePayload => {
  const graph = transformGraphForApi(values.graph);

  return {
    ...(values.id ? { id: values.id } : {}),
    name: values.name,
    description: values.description ?? null,
    module: values.module || options.module,
    entity_type: values.entity_type,
    request_type: values.request_type ?? null,
    is_active: values.is_active,
    status: options.status ?? values.status ?? 'published',
    graph: graph.nodes.length > 0 ? graph : { nodes: [], edges: [] },
    ...toWorkflowScope(values),
    request_category_data: values.request_category_data ?? null,
    request_type_data: values.request_type_data ?? null,
  };
};

/** API record -> form values. */
export const toWorkflowFormValues = (
  workflow: Workflow | undefined,
  module: string,
): WorkflowFormValues => {
  const defaults = createDefaultWorkflowFormValues(module);
  if (!workflow) return defaults;

  return {
    ...defaults,
    id: workflow.id ?? workflow._id ?? null,
    name: workflow.name ?? '',
    description: workflow.description ?? '',
    module: workflow.module ?? module,
    entity_type: workflow.entity_type ?? '',
    request_type: workflow.request_type ?? null,
    is_active: workflow.is_active ?? true,
    status: workflow.status,
    graph: transformGraphFromApi(workflow.graph),
    ...toWorkflowScope(workflow),
    request_category_data: workflow.request_category_data ?? null,
    request_type_data: workflow.request_type_data ?? null,
  };
};

/**
 * Form values for duplicating an existing workflow: everything is copied except
 * the identity, so saving creates a new record.
 */
export const toDuplicateFormValues = (
  workflow: Workflow | undefined,
  module: string,
): WorkflowFormValues => ({
  ...toWorkflowFormValues(workflow, module),
  id: null,
  status: 'draft',
});
