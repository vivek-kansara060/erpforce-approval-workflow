import { DecisionModalHost } from './DecisionModalHost';
import type { UseApprovalDecisionResult } from '../../hooks/useApprovalDecision';

/**
 * Every modal a `useApprovalDecision` flow can open: the adapter's decision
 * modal, and the pre-action step when one applies. Internal; used by both
 * dashboard screens so neither can forget the pre-action.
 */
export const DecisionModals = ({ decision }: { decision: UseApprovalDecisionResult }) => {
  const { decisionState, preActionState } = decision;
  const PreActionComponent = preActionState.config?.component;

  return (
    <>
      <DecisionModalHost
        open={decisionState.open}
        decision={decisionState.decision}
        request={decisionState.request}
        onConfirm={decision.confirmDecision}
        onClose={decision.closeDecision}
        loading={decision.isSubmitting}
      />

      {preActionState.open && PreActionComponent ? (
        <PreActionComponent
          open
          onClose={decision.closePreAction}
          onSave={decision.confirmPreAction}
          data={preActionState.request}
          loading={decision.isPreActionSubmitting}
        />
      ) : null}
    </>
  );
};
