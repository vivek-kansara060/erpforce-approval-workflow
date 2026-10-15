import { ApprovalWorkflowError } from '../types/common';
import { GENERIC_ERROR_MESSAGE, isAbortError } from '../utils/errors';
import type {
  FetchHttpClientOptions,
  HttpClient,
  HttpRequest,
  QueryParams,
  ServiceBaseUrls,
} from '../types/http';

const stripTrailingSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);

export const resolveBaseUrl = (baseUrls: ServiceBaseUrls, service: HttpRequest['service']) =>
  stripTrailingSlash(baseUrls[service] ?? baseUrls.default);

/** Serialises query params, repeating the key for arrays (ERP gateway style). */
export const buildQueryString = (query: QueryParams | undefined): string => {
  if (!query) return '';
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry === undefined || entry === null || entry === '') continue;
        params.append(key, String(entry));
      }
    } else {
      params.append(key, String(value));
    }
  }

  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
};

/** `undefined` when the text is not JSON: an error body is often plain text. */
const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** `message`, else `error`, when the body is an object carrying one as a string. */
const readMessageField = (body: unknown): string | undefined => {
  if (!body || typeof body !== 'object') return undefined;
  const { message, error } = body as { message?: unknown; error?: unknown };
  if (typeof message === 'string') return message;
  return typeof error === 'string' ? error : undefined;
};

/**
 * Turns a failed response into an `ApprovalWorkflowError` with the most useful
 * message available. The original code base double-`JSON.parse`d error bodies
 * and fell back to a literal "Something went wrong"; this handles the same
 * shapes but keeps the server's message when there is one.
 */
export const normalizeHttpError = (
  status: number,
  rawBody: string,
): ApprovalWorkflowError => {
  const text = rawBody?.trim() ?? '';
  const parsed = text ? parseJson(text) : undefined;
  const inner = readMessageField(parsed);

  // Some services double-encode: {"message":"{\"message\":\"...\"}"}
  const message = (inner !== undefined ? (readMessageField(parseJson(inner)) ?? inner) : text)
    .replace(/^Error:\s*/i, '')
    .trim();

  return new ApprovalWorkflowError(message || GENERIC_ERROR_MESSAGE, {
    status,
    details: parsed ?? rawBody,
  });
};

/**
 * Default `HttpClient` built on `fetch`.
 *
 * Hosts that already have an instrumented client (interceptors, retries,
 * refresh tokens) should pass their own function instead — the package only
 * needs the `HttpClient` signature.
 */
export const createFetchHttpClient = (options: FetchHttpClientOptions): HttpClient => {
  const { baseUrls, getHeaders, fetchImpl } = options;
  const doFetch = fetchImpl ?? globalThis.fetch;

  if (typeof doFetch !== 'function') {
    throw new ApprovalWorkflowError(
      'No fetch implementation available. Pass `fetchImpl` to createFetchHttpClient.',
    );
  }

  return async <TResponse>(request: HttpRequest): Promise<TResponse> => {
    const base = resolveBaseUrl(baseUrls, request.service);
    const url = `${base}${request.path}${buildQueryString(request.query)}`;

    const dynamicHeaders = (await getHeaders?.()) ?? {};
    const headers: Record<string, string> = {
      ...dynamicHeaders,
      ...request.headers,
    };

    const hasBody = request.body !== undefined && request.method !== 'GET';
    if (hasBody && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await doFetch(url, {
        method: request.method,
        headers,
        body: hasBody ? JSON.stringify(request.body) : undefined,
        signal: request.signal,
      });
    } catch (cause) {
      // A cancellation is not a failure; the cache relies on seeing it as-is.
      if (isAbortError(cause)) throw cause;
      // `fetch` rejects with a bare TypeError when the network is unreachable.
      throw new ApprovalWorkflowError('Network request failed', {
        code: 'network-error',
        cause,
      });
    }

    if (!response.ok) {
      throw normalizeHttpError(response.status, await response.text().catch(() => ''));
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    const text = await response.text();
    if (!text) return undefined as TResponse;

    try {
      return JSON.parse(text) as TResponse;
    } catch {
      throw new ApprovalWorkflowError('Response was not valid JSON', {
        status: response.status,
        details: text,
      });
    }
  };
};
