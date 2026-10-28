/**
 * Transport contract.
 *
 * The package never calls `fetch`/`axios` directly and never reads an
 * environment variable. It describes a request and hands it to the host's
 * `HttpClient`. `createFetchHttpClient` (api/http-client.ts) is a ready-made
 * implementation for hosts that have nothing better.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Logical backend services the package talks to. The host maps each name to a
 * base URL; unmapped services fall back to `default`.
 */
export type ServiceName =
  /** Workflow definitions, references and approval requests. */
  | 'workflowAutomation'
  /** Mongo schema fields and the generic filter-table lookup. */
  | 'systemFeature'
  /** User modules / entity catalogue. */
  | 'rbac'
  /** Organisation structure (hierarchy levels). */
  | 'organization'
  /** Employee directory. Only called when the user holds `employee` access. */
  | 'hrms'
  | 'default';

export type QueryPrimitive = string | number | boolean;

export type QueryParams = Record<
  string,
  QueryPrimitive | QueryPrimitive[] | null | undefined
>;

export interface HttpRequest {
  service: ServiceName;
  method: HttpMethod;
  /** Path relative to the service base URL, always starting with `/`. */
  path: string;
  query?: QueryParams;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * Resolves a request to a parsed JSON body.
 *
 * Implementations MUST reject with an `ApprovalWorkflowError` (or any `Error`;
 * the API layer normalises it) on a non-2xx response.
 */
export type HttpClient = <TResponse>(request: HttpRequest) => Promise<TResponse>;

/** Base URL per service, as configured by the host. */
export type ServiceBaseUrls = Partial<Record<ServiceName, string>> & {
  default: string;
};

export interface FetchHttpClientOptions {
  baseUrls: ServiceBaseUrls;
  /**
   * Called before every request. Return auth/tenant headers
   * (`x-token`, `x-timezone`, `x-company-id`, ...).
   */
  getHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  /** Override the global fetch (tests, SSR, instrumented clients). */
  fetchImpl?: typeof fetch;
}
