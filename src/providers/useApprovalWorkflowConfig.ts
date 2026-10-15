import { useCallback, useContext, useMemo } from 'react';
import { ApprovalWorkflowContext } from './context';
import type { ApprovalWorkflowContextValue } from './context';
import { I18N } from '../constants/i18n-keys';
import { ApprovalWorkflowError } from '../types/common';
import { getUserFacingErrorMessage } from '../utils/errors';
import type { ResolvedApprovalWorkflowConfig, TranslateFn } from '../types/config';
import type { I18nEntry } from '../constants/i18n-keys';

const MISSING_PROVIDER =
  'No <ApprovalWorkflowProvider> found. Wrap the approval workflow screens in it.';

/** Resolves an `I18N` entry through the host translator, falling back to its English. */
export type TranslateEntryFn = (entry: I18nEntry, fallbackOverride?: string) => string;

/** Full context: config, cache, API clients and services. */
export const useApprovalWorkflowContext = (): ApprovalWorkflowContextValue => {
  const context = useContext(ApprovalWorkflowContext);
  if (!context) {
    throw new ApprovalWorkflowError(MISSING_PROVIDER, { code: 'missing-provider' });
  }
  return context;
};

/** Just the resolved config — the common case. */
export const useApprovalWorkflowConfig = (): ResolvedApprovalWorkflowConfig =>
  useApprovalWorkflowContext().config;

export const useApprovalWorkflowServices = () => useApprovalWorkflowContext().services;

export const useApprovalWorkflowApi = () => useApprovalWorkflowContext().api;

export const useQueryCache = () => useApprovalWorkflowContext().cache;

const bindTranslate =
  (translate: TranslateFn): TranslateEntryFn =>
  (entry, fallbackOverride) =>
    translate(entry[0], fallbackOverride ?? entry[1]);

/**
 * Translation helper bound to the package's key table.
 *
 * `t(I18N.common.save)` resolves the host translation and falls back to the
 * bundled English string, so a consumer without translations never sees a
 * raw key on screen.
 */
export const useTranslate = (): TranslateEntryFn => {
  const { translate } = useApprovalWorkflowConfig();
  return useMemo(() => bindTranslate(translate), [translate]);
};

const englishOnly: TranslateEntryFn = (entry, fallbackOverride) => fallbackOverride ?? entry[1];

/**
 * `useTranslate` for components that are public and may be rendered outside
 * the provider (`AsyncBoundary`, `PermissionGate`): translated inside it,
 * bundled English outside it, never a throw.
 */
export const useOptionalTranslate = (): TranslateEntryFn => {
  const translate = useContext(ApprovalWorkflowContext)?.config.translate;
  return useMemo(() => (translate ? bindTranslate(translate) : englishOnly), [translate]);
};

/**
 * Shows a failure to the user through `config.notify`.
 *
 * Only the safe part of the error is shown — see `getUserFacingErrorMessage`;
 * the full error is what `config.onError` receives.
 */
export const useNotifyError = () => {
  const { notify } = useApprovalWorkflowConfig();
  const t = useTranslate();
  return useCallback(
    (error: unknown) =>
      notify(getUserFacingErrorMessage(error, t(I18N.common.somethingWentWrong)), 'error'),
    [notify, t],
  );
};
