import { describe, expect, it, vi } from 'vitest';
import { buildQueryString, createFetchHttpClient, normalizeHttpError } from '../http-client';
import { createWorkflowApi } from '../workflow.api';
import { createApprovalApi } from '../approval.api';
import { ApprovalWorkflowError } from '../../types/common';
import type { HttpClient } from '../../types/http';

describe('buildQueryString', () => {
  it('drops empty values', () => {
    expect(buildQueryString({ a: 1, b: undefined, c: null, d: '' })).toBe('?a=1');
  });

  it('repeats the key for arrays', () => {
    expect(buildQueryString({ id: [1, 2] })).toBe('?id=1&id=2');
  });

  it('returns an empty string when there is nothing to send', () => {
    expect(buildQueryString(undefined)).toBe('');
    expect(buildQueryString({})).toBe('');
  });
});

describe('normalizeHttpError', () => {
  it('extracts the server message from a JSON body', () => {
    const error = normalizeHttpError(400, JSON.stringify({ message: 'Already approved' }));
    expect(error.message).toBe('Already approved');
    expect(error.status).toBe(400);
  });

  it('unwraps a double-encoded message', () => {
    const error = normalizeHttpError(
      422,
      JSON.stringify({ message: JSON.stringify({ message: 'Error: Invalid level' }) }),
    );

    expect(error.message).toBe('Invalid level');
  });

  it('keeps a plain-text body', () => {
    expect(normalizeHttpError(500, 'upstream timeout').message).toBe('upstream timeout');
  });

  it('falls back to a generic message for an empty body', () => {
    expect(normalizeHttpError(500, '').message).toBe('Something went wrong');
  });
});

describe('createFetchHttpClient', () => {
  const baseUrls = { default: 'https://api.test', workflowAutomation: 'https://api.test/wf/' };

  it('resolves the service base URL and strips the trailing slash', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const http = createFetchHttpClient({ baseUrls, fetchImpl });

    await http({ service: 'workflowAutomation', method: 'GET', path: '/v1/workflows' });

    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/wf/v1/workflows');
  });

  it('falls back to the default base URL for an unmapped service', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const http = createFetchHttpClient({ baseUrls, fetchImpl });

    await http({ service: 'rbac', method: 'GET', path: '/v1/user/modules' });

    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/v1/user/modules');
  });

  it('merges the host headers into every request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const http = createFetchHttpClient({
      baseUrls,
      fetchImpl,
      getHeaders: () => ({ 'x-token': 'abc' }),
    });

    await http({ service: 'default', method: 'GET', path: '/ping' });

    expect(fetchImpl.mock.calls[0][1].headers).toMatchObject({ 'x-token': 'abc' });
  });

  it('sets a JSON content type only when there is a body', async () => {
    // A fresh Response per call: a body can only be read once.
    const fetchImpl = vi.fn().mockImplementation(async () => new Response('{}', { status: 200 }));
    const http = createFetchHttpClient({ baseUrls, fetchImpl });

    await http({ service: 'default', method: 'GET', path: '/ping' });
    expect(fetchImpl.mock.calls[0][1].headers['Content-Type']).toBeUndefined();

    await http({ service: 'default', method: 'POST', path: '/ping', body: { a: 1 } });
    expect(fetchImpl.mock.calls[1][1].headers['Content-Type']).toBe('application/json');
    expect(fetchImpl.mock.calls[1][1].body).toBe('{"a":1}');
  });

  it('throws a normalised error on a non-2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }),
    );
    const http = createFetchHttpClient({ baseUrls, fetchImpl });

    await expect(http({ service: 'default', method: 'GET', path: '/x' })).rejects.toBeInstanceOf(
      ApprovalWorkflowError,
    );
  });

  it('returns undefined for 204', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const http = createFetchHttpClient({ baseUrls, fetchImpl });

    await expect(http({ service: 'default', method: 'DELETE', path: '/x' })).resolves.toBeUndefined();
  });

  it('normalises an unreachable network into a network-error', async () => {
    const cause = new TypeError('Failed to fetch');
    const fetchImpl = vi.fn().mockRejectedValue(cause);
    const http = createFetchHttpClient({ baseUrls, fetchImpl });

    const error = await http({ service: 'default', method: 'GET', path: '/x' }).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(ApprovalWorkflowError);
    expect(error).toMatchObject({ code: 'network-error', cause });
  });

  it('lets a cancellation through untouched', async () => {
    const abort = new DOMException('aborted', 'AbortError');
    const fetchImpl = vi.fn().mockRejectedValue(abort);
    const http = createFetchHttpClient({ baseUrls, fetchImpl });

    await expect(http({ service: 'default', method: 'GET', path: '/x' })).rejects.toBe(abort);
  });
});

describe('normalizeHttpError — body shapes', () => {
  it('reads an `error` field when there is no `message`', () => {
    expect(normalizeHttpError(400, JSON.stringify({ error: 'Bad input' })).message).toBe(
      'Bad input',
    );
  });

  it('keeps the parsed body as details', () => {
    const error = normalizeHttpError(422, JSON.stringify({ message: 'Invalid', field: 'name' }));
    expect(error.details).toEqual({ message: 'Invalid', field: 'name' });
    expect(error.status).toBe(422);
  });
});

describe('workflow API normalisation', () => {
  it('mirrors Mongo _id onto id and defaults the graph', async () => {
    const http: HttpClient = vi.fn().mockResolvedValue({
      data: { workflows: [{ _id: 'abc', name: 'Leave' }] },
      pagination: { totalCount: 1 },
    }) as unknown as HttpClient;

    const result = await createWorkflowApi(http).list({ skip: 0, limit: 10 });

    expect(result.items[0].id).toBe('abc');
    expect(result.items[0].graph).toEqual({ nodes: [], edges: [] });
    expect(result.totalCount).toBe(1);
  });

  it('returns an empty page when the envelope is empty', async () => {
    const http: HttpClient = vi.fn().mockResolvedValue({}) as unknown as HttpClient;
    const result = await createWorkflowApi(http).list({ skip: 0, limit: 10 });

    expect(result).toEqual({ items: [], totalCount: 0 });
  });
});

describe('approval API envelope handling', () => {
  const rows = [{ id: 1, entity_type: 'x', entity_id: 1, status: 'Pending' }];

  it.each([
    ['data.approval_requests', { data: { approval_requests: rows, count: 1 } }],
    ['data.approvals', { data: { approvals: rows }, pagination: { totalCount: 1 } }],
    ['data array', { data: rows, pagination: { totalCount: 1 } }],
    ['top-level approvals', { approvals: rows, count: 1 }],
  ])('reads the %s shape', async (_name, envelope) => {
    const http: HttpClient = vi.fn().mockResolvedValue(envelope) as unknown as HttpClient;
    const result = await createApprovalApi(http).list({ skip: 0, limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.totalCount).toBe(1);
  });

  it('PATCHes the decision to the approval endpoint', async () => {
    const http = vi.fn().mockResolvedValue({});
    await createApprovalApi(http as unknown as HttpClient).act({
      id: 42,
      status: 'Approved',
      comments: 'ok',
    });

    expect(http).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/approvals/42',
        body: { status: 'Approved', comments: 'ok' },
      }),
    );
  });
});
