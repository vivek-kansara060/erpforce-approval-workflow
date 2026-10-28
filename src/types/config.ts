/**
 * Integration contracts.
 *
 * Everything module-specific the package needs from its host arrives through
 * `ApprovalWorkflowConfig`: transport, routes, navigation, entity adapters.
 *
 * Permissions are deliberately absent. They are ERP-wide rather than
 * module-specific, and the package reads them itself from the global
 * `usePermissions()` hook in @erpsquad/common. See `permissions/`.
 */

import type { ReactNode } from 'react';
import type { HttpClient } from './http';
import type { ModuleRegistry } from './module';
import type {
  ApprovalWorkflowError,
  EntityCatalogueEntry,
  PaginationModel,
  SortModel,
} from './common';

/** Signed-in user, as far as the package cares. */
export interface CurrentUser {
  id: string | number;
  name?: string;
  email?: string;
  /** Default company scope applied to new workflows. */
  company_id?: string | number;
}

/** Multi-tenant scope. Never inferred; always supplied by the host. */
export interface TenantContext {
  companyId?: string | number;
  locationId?: string | number;
  /** Free-form extra scope merged into outbound filters by the host's http client. */
  extra?: Record<string, string | number>;
}

/** Owning module, e.g. `{ module: 'hrms' }` or `{ module: 'procurement' }`. */
export interface ModuleContext {
  module: string;
  /** Optional display name for breadcrumbs. */
  label?: string;
}

export type TranslateFn = (key: string, fallback?: string) => string;

export type NavigateFn = (
  to: string,
  options?: { state?: unknown; replace?: boolean },
) => void;

export type NotifyVariant = 'success' | 'error' | 'warning' | 'info';

export type Notifier = (message: string, variant?: NotifyVariant) => void;

/** Where a reported error came from. */
export type ApprovalErrorContext =
  /** A server read failed; `key` is the cache key, e.g. `['workflow', 'detail', '42']`. */
  | { source: 'query'; key: readonly unknown[] }
  /** A write failed. */
  | {
      source: 'mutation';
      operation:
        | 'workflow.save'
        | 'workflow.remove'
        | 'workflow.toggle'
        | 'workflow.simulate'
        | 'approval.decision'
        | 'approval.preAction';
    };

/**
 * Receives every failure inside the package, with the full error (status,
 * code, server `details`, original `cause`) — for logging and telemetry.
 *
 * It observes; it does not replace the package's own handling. Users still see
 * the error state or notification, which only ever shows a safe message.
 */
export type ErrorReporter = (error: ApprovalWorkflowError, context: ApprovalErrorContext) => void;

/**
 * Route paths the package links to. Values are host router paths and may
 * contain `:id`, which the package substitutes.
 */
export interface RouteConfig {
  workflowList: string;
  workflowCreate: string;
  workflowEdit: string;
  workflowView: string;
  approvalDashboard: string;
  approvalView: string;
}

/**
 * List/table state (search, sort, pagination, visible columns, saved views).
 *
 * When omitted the package keeps this state locally. Hosts that already have a
 * page-preferences service (`usePages()` in @erpsquad/common) pass a binding so
 * saved views and column preferences keep working.
 */
export interface ListStateAdapter {
  useListState: (resource: string) => ListState;
}

export interface ListState {
  search: string;
  sort: SortModel | null;
  pagination: PaginationModel;
  /** ERP filter fragment produced by the host's filter builder. */
  filterQueryString: string;
  visibleColumns: Array<{ accessorKey: string; visible: boolean }> | undefined;
  activeView: string | undefined;
  pageSize: number;
  isLoading: boolean;
  update: (updates: Partial<Omit<ListState, 'update'>>) => void;
}

/** Server-state cache. Supplied so several mounted views share one cache. */
export interface QueryClientLike {
  invalidate: (keyPrefix: readonly unknown[]) => void;
  clear: () => void;
}

export interface ApprovalWorkflowConfig {
  /** Required: how HTTP requests reach the backend. */
  http: HttpClient;

  /** Required: which ERP module is hosting the package. */
  moduleContext: ModuleContext;

  /** Required: who is signed in. Used for "my approvals" and default scope. */
  currentUser: CurrentUser;

  /** Required: where the package's own screens live in the host router. */
  routes: RouteConfig;

  /** Required: navigation. Usually `useNavigate()` from react-router. */
  navigate: NavigateFn;

  /** Entity-type adapters. Defaults to a registry with only the generic adapter. */
  modules?: ModuleRegistry;

  /** Tenant scope. */
  tenant?: TenantContext;

  /** Translation function. Defaults to returning the fallback, then the key. */
  translate?: TranslateFn;

  /** User-facing notifications. Defaults to a no-op with a console warning. */
  notify?: Notifier;

  /** Observes every failed read and write, e.g. to forward it to Sentry. */
  onError?: ErrorReporter;

  /** Binding to the host's page-preference service. */
  listState?: ListStateAdapter;

  /**
   * Shared server-state cache; one is created per provider when omitted.
   *
   * Pass the same `createQueryCache()` instance to several providers to share
   * responses between them. Any other `QueryClientLike` is exposed as
   * `config.queryClient` but the package keeps its own cache.
   */
  queryClient?: QueryClientLike;

  /**
   * Catalogue of entities a workflow can be attached to
   * (`{ label, value, is_workflow_enabled? }[]`). Supplying it skips the
   * `/v1/user/modules` call. Entries with `is_workflow_enabled: false` are
   * hidden from the request-category pickers.
   */
  entityCatalogue?: EntityCatalogueEntry[];

  /**
   * Default number of rows per page when the host provides no list state.
   * @default 10
   */
  defaultPageSize?: number;

  /**
   * Time in ms a cached server response is considered fresh.
   * @default 30_000
   */
  staleTime?: number;
}

export interface ApprovalWorkflowProviderProps extends ApprovalWorkflowConfig {
  children: ReactNode;
}

/** Config after defaults have been applied; what hooks actually consume. */
export interface ResolvedApprovalWorkflowConfig
  extends Required<
      Pick<
        ApprovalWorkflowConfig,
        | 'http'
        | 'moduleContext'
        | 'currentUser'
        | 'routes'
        | 'navigate'
        | 'modules'
        | 'translate'
        | 'notify'
        | 'defaultPageSize'
        | 'staleTime'
      >
    >,
    Pick<ApprovalWorkflowConfig, 'tenant' | 'listState' | 'entityCatalogue' | 'onError'> {
  queryClient: QueryClientLike;
}
