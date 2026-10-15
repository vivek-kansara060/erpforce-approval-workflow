import { useCallback, useMemo, useState } from 'react';
import { useReportedMutation } from './internal/useReportedMutation';
import { I18N } from '../constants/i18n-keys';
import { decisionSuccessKey } from '../utils/status';
import {
  useApprovalWorkflowConfig,
  useApprovalWorkflowServices,
  useNotifyError,
  useTranslate,
} from '../providers/useApprovalWorkflowConfig';
import type { ApprovalDecision, ApprovalRequest } from '../types/approval';
import type { PreActionConfig } from '../types/module';
import type { SubmitDecisionInput } from '../services/approval.service';

interface DecisionState {
  open: boolean;
  decision: ApprovalDecision | null;
  request: ApprovalRequest | null;
}

interface PreActionState {
  open: boolean;
  request: ApprovalRequest | null;
  config: PreActionConfig | null;
}

const CLOSED_DECISION: DecisionState = { open: false, decision: null, request: null };
const CLOSED_PRE_ACTION: PreActionState = { open: false, request: null, config: null };

export interface UseApprovalDecisionOptions {
  /** Called after a successful decision or pre-action; usually a list refetch. */
  onCompleted?: () => void;
}

/**
 * Drives the approve/reject and pre-action flows, for the dashboard and the
 * request detail screen alike.
 *
 * All the module-specific branching the original kept in one 320-line
 * `approvalMapper` now lives in the host's adapters; this hook only sequences
 * modal state -> service call -> notification -> refresh.
 *
 * Every function it returns is stable, and the returned object only changes
 * when modal or submission state does, so it is safe in a dependency array.
 */
export const useApprovalDecision = (options: UseApprovalDecisionOptions = {}) => {
  const { onCompleted } = options;
  const { approval } = useApprovalWorkflowServices();
  const { modules, notify } = useApprovalWorkflowConfig();
  const notifyError = useNotifyError();
  const t = useTranslate();

  const [decisionState, setDecisionState] = useState<DecisionState>(CLOSED_DECISION);
  const [preActionState, setPreActionState] = useState<PreActionState>(CLOSED_PRE_ACTION);

  const decisionMutation = useReportedMutation<SubmitDecisionInput, void>(
    'approval.decision',
    (input) => approval.submitDecision(input),
    {
      onSuccess: (_result, input) => {
        notify(t(I18N.dashboard[decisionSuccessKey(input.decision)]), 'success');
        setDecisionState(CLOSED_DECISION);
        onCompleted?.();
      },
      onError: notifyError,
    },
  );

  const preActionMutation = useReportedMutation<
    { request: ApprovalRequest; formData: unknown; successMessage: string },
    void
  >('approval.preAction', ({ request, formData }) => approval.runPreAction({ request, formData }), {
    onSuccess: (_result, input) => {
      notify(t([input.successMessage, input.successMessage] as const), 'success');
      setPreActionState(CLOSED_PRE_ACTION);
      onCompleted?.();
    },
    onError: notifyError,
  });

  const openDecision = useCallback((request: ApprovalRequest, decision: ApprovalDecision) => {
    setDecisionState({ open: true, decision, request });
  }, []);

  const closeDecision = useCallback(() => setDecisionState(CLOSED_DECISION), []);

  const submitDecision = decisionMutation.mutate;
  const confirmDecision = useCallback(
    (formData: unknown) => {
      const { request, decision } = decisionState;
      if (!request || !decision) return;
      void submitDecision({ request, decision, formData });
    },
    [decisionState, submitDecision],
  );

  /**
   * The step a request must pass before it can be decided ("Add budget" on a
   * hire request), when its adapter declares one that currently applies.
   */
  const getPendingPreAction = useCallback(
    (request: ApprovalRequest): PreActionConfig | undefined => {
      const config = modules.get(request.entity_type).preAction;
      return config?.shouldShow(request) ? config : undefined;
    },
    [modules],
  );

  const openPreAction = useCallback(
    (request: ApprovalRequest) => {
      const config = modules.get(request.entity_type).preAction;
      if (!config) return;
      setPreActionState({ open: true, request, config });
    },
    [modules],
  );

  /**
   * Approve: opens the pending pre-action when there is one, otherwise the
   * decision modal. While a pre-action applies, Reject is not available either.
   */
  const startApproval = useCallback(
    (request: ApprovalRequest) => {
      if (getPendingPreAction(request)) openPreAction(request);
      else openDecision(request, 'Approved');
    },
    [getPendingPreAction, openPreAction, openDecision],
  );

  const closePreAction = useCallback(() => setPreActionState(CLOSED_PRE_ACTION), []);

  const submitPreAction = preActionMutation.mutate;
  const confirmPreAction = useCallback(
    (formData: unknown) => {
      const { request, config } = preActionState;
      if (!request || !config) return;
      void submitPreAction({ request, formData, successMessage: config.successMessage });
    },
    [preActionState, submitPreAction],
  );

  const isSubmitting = decisionMutation.isLoading;
  const isPreActionSubmitting = preActionMutation.isLoading;

  return useMemo(
    () => ({
      decisionState,
      openDecision,
      closeDecision,
      confirmDecision,
      isSubmitting,

      getPendingPreAction,
      startApproval,

      preActionState,
      openPreAction,
      closePreAction,
      confirmPreAction,
      isPreActionSubmitting,
    }),
    [
      decisionState,
      openDecision,
      closeDecision,
      confirmDecision,
      isSubmitting,
      getPendingPreAction,
      startApproval,
      preActionState,
      openPreAction,
      closePreAction,
      confirmPreAction,
      isPreActionSubmitting,
    ],
  );
};

export type UseApprovalDecisionResult = ReturnType<typeof useApprovalDecision>;
