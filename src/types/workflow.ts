/** The approval workflow aggregate. */

import type { WorkflowGraph } from './graph';

/** Lifecycle of the workflow definition itself (not of an approval request). */
export type WorkflowStatus = 'draft' | 'published';

/**
 * Scope filters that restrict which records a workflow applies to. Every list
 * is generic: the host decides what a "grade" or "employment type" means for
 * its module by wiring the corresponding `SearchableSelect` api type.
 */
export interface WorkflowScope {
  company_ids: Array<string | number>;
  location_ids: Array<string | number>;
  department_ids: Array<string | number>;
  grade_ids: Array<string | number>;
  employment_type_ids: Array<string | number>;
}

export interface Workflow extends WorkflowScope {
  /** Mongo `_id`, mirrored onto `id` by the API layer. */
  _id?: string;
  id?: string;
  /** Human-readable sequence shown in the UI. */
  series_number?: string;

  name: string;
  description?: string | null;

  /** Owning ERP module, e.g. `hrms`, `procurement`. */
  module: string;
  /** Entity the workflow is attached to, e.g. `leave_requests`. */
  entity_type: string;
  /** Action type reference id, e.g. the approve/review action. */
  request_type?: string | number | null;

  is_active: boolean;
  status?: WorkflowStatus;

  graph: WorkflowGraph;

  /** Denormalised label payloads the API echoes back for display. */
  request_category_data?: { label: string; value: string } | null;
  request_type_data?: { id: number | string; label: string; value: string | number } | null;

  created_at?: string;
  updated_at?: string;
}

/** Shape the workflow form binds to; the graph may be absent while drafting. */
export interface WorkflowFormValues extends WorkflowScope {
  id: string | null;
  name: string;
  description: string;
  module: string;
  entity_type: string;
  request_type: string | number | null;
  is_active: boolean;
  status?: WorkflowStatus;
  graph: WorkflowGraph | null;
  request_category_data?: { label: string; value: string } | null;
  request_type_data?: { id: number | string; label: string; value: string | number } | null;
}

/** Payload accepted by create/update. */
export type WorkflowWritePayload = Omit<Workflow, '_id' | 'series_number' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export interface WorkflowListFilters {
  /** Restrict the list to one module. Omit to list every module the user can see. */
  module?: string;
  entityType?: string;
  isActive?: boolean;
}
