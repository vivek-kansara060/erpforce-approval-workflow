/**
 * Primitive shapes shared by every layer of the package.
 *
 * Nothing in this file may reference React, MUI or any host module.
 */

/** A selectable option as rendered by the ERP `SearchableSelect`. */
export interface SelectOption<TValue = string | number> {
  label: string;
  value: TValue;
  /** Some ERP selects key off `id` rather than `value`. */
  id?: string | number;
  disabled?: boolean;
}

/** An entity (sub-module) a workflow may be attached to. */
export interface EntityCatalogueEntry {
  label: string;
  value: string;
  /**
   * Whether the entity is offered as a request category. Entries from
   * `/v1/user/modules` always carry it; host-supplied entries without it are
   * treated as enabled.
   */
  is_workflow_enabled?: boolean;
}

/** A group of options, used by the entity-field picker. */
export interface SelectOptionGroup<TValue = string | number> {
  label: string;
  value: string;
  isGroup: true;
  options: Array<SelectOption<TValue> & Record<string, unknown>>;
}

export type SelectOptionOrGroup<TValue = string | number> =
  | SelectOption<TValue>
  | SelectOptionGroup<TValue>;

/** Zero-based offset pagination, matching the ERP gateway contract. */
export interface PaginationModel {
  /** 1-based page number as used by the ERP `Footer` component. */
  pageNo: number;
  limit: number;
  totalCount: number;
}

export interface SortModel {
  id: string;
  desc: boolean;
}

/**
 * The query the package sends to the API layer. `filters` and `select` use the
 * ERP gateway's string syntax (`(status.eq='Pending')`, `[id,name,status]`).
 */
export interface ListQuery {
  skip: number;
  limit: number;
  search?: string;
  select?: string;
  order?: string;
  filters?: string;
}

export interface ListResult<T> {
  items: T[];
  totalCount: number;
}

/** Discriminated async state used by every server-state hook. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | undefined;
  status: AsyncStatus;
  error: ApprovalWorkflowError | undefined;
  /** True while a background refetch of already-present data is running. */
  isRefetching: boolean;
}

/** Normalised error raised by the API layer; never a raw `Response`. */
export class ApprovalWorkflowError extends Error {
  readonly status: number | undefined;
  readonly code: string | undefined;
  readonly details: unknown;

  constructor(
    message: string,
    options?: { status?: number; code?: string; details?: unknown; cause?: unknown },
  ) {
    super(message);
    this.name = 'ApprovalWorkflowError';
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}
