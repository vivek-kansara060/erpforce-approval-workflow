import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { ApprovalWorkflowContext } from './context';
import type { ApprovalWorkflowContextValue } from './context';
import { QueryCache, createQueryCache } from '../query/cache';
import { createWorkflowApi } from '../api/workflow.api';
import { createApprovalApi } from '../api/approval.api';
import { createReferenceApi } from '../api/reference.api';
import { createWorkflowService } from '../services/workflow.service';
import { createApprovalService } from '../services/approval.service';
import { createModuleRegistry } from '../adapters/module-registry';
import { DEFAULT_PAGE_SIZE, DEFAULT_STALE_TIME } from '../constants/defaults';
import { ApprovalWorkflowError } from '../types/common';
import type {
  ApprovalErrorContext,
  ApprovalWorkflowConfig,
  ApprovalWorkflowProviderProps,
  ResolvedApprovalWorkflowConfig,
} from '../types/config';

const defaultTranslate = (key: string, fallback?: string) => fallback ?? key;

const defaultNotify = (message: string) => {
  // A host that forgets to wire notifications should still see failures.
  console.warn(`[approval-workflow] ${message}`);
};

/**
 * Fails fast on the integration mistakes that would otherwise surface much
 * later as an unrelated `undefined is not a function` inside a hook.
 */
const assertValidConfig = (config: ApprovalWorkflowConfig): void => {
  const problems: string[] = [];
  if (typeof config.http !== 'function') problems.push('`http` must be an HttpClient function');
  if (typeof config.navigate !== 'function') problems.push('`navigate` must be a function');
  if (!config.routes || typeof config.routes !== 'object') problems.push('`routes` is required');
  if (!config.moduleContext?.module) problems.push('`moduleContext.module` is required');

  if (problems.length > 0) {
    throw new ApprovalWorkflowError(
      `Invalid <ApprovalWorkflowProvider> configuration: ${problems.join('; ')}.`,
      { code: 'invalid-config', details: problems },
    );
  }
};

/**
 * Root provider. Everything the package needs from the host arrives here.
 *
 * Mount it once, as high as the package's screens go. Nothing in the package
 * reads a global store, an environment variable or a hard-coded route.
 *
 * Permissions are not configured here: the package reads the ERP's global
 * permission state directly, so the screens must sit under the app's
 * `PermissionsProvider` from @erpsquad/common — which, in an ERPForce app,
 * they already do.
 *
 * ```tsx
 * <ApprovalWorkflowProvider
 *   http={http}
 *   moduleContext={{ module: 'hrms' }}
 *   currentUser={{ id: user.id, company_id: user.company_id }}
 *   routes={routes}
 *   navigate={navigate}
 *   modules={registry}
 * >
 *   <Outlet />
 * </ApprovalWorkflowProvider>
 * ```
 */
export const ApprovalWorkflowProvider = ({
  children,
  ...config
}: ApprovalWorkflowProviderProps): ReactElement => {
  const {
    http,
    moduleContext,
    currentUser,
    routes,
    navigate,
    modules,
    tenant,
    translate,
    notify,
    onError,
    listState,
    queryClient,
    entityCatalogue,
    defaultPageSize,
    staleTime,
  } = config;

  // Four `typeof` checks: cheaper to repeat per render than to memoise.
  assertValidConfig(config);

  // One cache per provider instance, created lazily and never re-created —
  // a new cache on re-render would drop every in-flight request. A host that
  // passes its own `QueryCache` shares it with every provider it gives it to.
  const ownCacheRef = useRef<QueryCache | null>(null);
  let cache: QueryCache;
  if (queryClient instanceof QueryCache) {
    cache = queryClient;
  } else {
    ownCacheRef.current ??= createQueryCache();
    cache = ownCacheRef.current;
  }

  // `onError` is usually an inline arrow; reading it through a ref keeps
  // `reportError` — and so the whole context value — stable across renders.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const reportError = useCallback((error: ApprovalWorkflowError, context: ApprovalErrorContext) => {
    try {
      onErrorRef.current?.(error, context);
    } catch (reporterError) {
      console.error('[approval-workflow] onError threw', reporterError);
    }
  }, []);

  useEffect(
    () => cache.onError((error, key) => reportError(error, { source: 'query', key })),
    [cache, reportError],
  );

  const resolvedConfig = useMemo<ResolvedApprovalWorkflowConfig>(
    () => ({
      http,
      moduleContext,
      currentUser,
      routes,
      navigate,
      modules: modules ?? createModuleRegistry(),
      tenant,
      translate: translate ?? defaultTranslate,
      notify: notify ?? defaultNotify,
      onError,
      listState,
      entityCatalogue,
      defaultPageSize: defaultPageSize ?? DEFAULT_PAGE_SIZE,
      staleTime: staleTime ?? DEFAULT_STALE_TIME,
      queryClient: queryClient ?? cache,
    }),
    [
      http,
      moduleContext,
      currentUser,
      routes,
      navigate,
      modules,
      tenant,
      translate,
      notify,
      onError,
      listState,
      entityCatalogue,
      defaultPageSize,
      staleTime,
      queryClient,
      cache,
    ],
  );

  // The API clients depend only on the transport, so they are not rebuilt when
  // an unrelated prop (an inline `currentUser`, say) changes identity.
  const api = useMemo(
    () => ({
      workflow: createWorkflowApi(http),
      approval: createApprovalApi(http),
      reference: createReferenceApi(http),
    }),
    [http],
  );

  const resolvedModules = resolvedConfig.modules;
  const services = useMemo(
    () => ({
      workflow: createWorkflowService({ api: api.workflow, cache, module: moduleContext.module }),
      approval: createApprovalService({ api: api.approval, cache, modules: resolvedModules }),
    }),
    [api, cache, moduleContext.module, resolvedModules],
  );

  const value = useMemo<ApprovalWorkflowContextValue>(
    () => ({ config: resolvedConfig, cache, api, services, reportError }),
    [resolvedConfig, cache, api, services, reportError],
  );

  return (
    <ApprovalWorkflowContext.Provider value={value}>{children}</ApprovalWorkflowContext.Provider>
  );
};
