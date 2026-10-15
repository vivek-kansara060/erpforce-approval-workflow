import { useMemo } from 'react';
import { ApprovalCommentModal } from '../../components/modals';
import { I18N } from '../../constants/i18n-keys';
import {
  useApprovalWorkflowConfig,
  useTranslate,
} from '../../providers/useApprovalWorkflowConfig';
import type { ApprovalDecision, ApprovalRequest } from '../../types/approval';

export interface DecisionModalHostProps {
  open: boolean;
  decision: ApprovalDecision | null;
  request: ApprovalRequest | null;
  onConfirm: (formData: unknown) => void;
  onClose: () => void;
  loading?: boolean;
}

/**
 * Renders whichever modal the entity type's adapter declares, falling back to
 * `ApprovalCommentModal`.
 *
 * `getModalProps` is passed through verbatim, so a host can reuse a modal whose
 * props do not match the package's own shape — which is how every existing HRMS
 * approval modal keeps working without a wrapper.
 */
export const DecisionModalHost = ({
  open,
  decision,
  request,
  onConfirm,
  onClose,
  loading = false,
}: DecisionModalHostProps) => {
  const t = useTranslate();
  const { modules } = useApprovalWorkflowConfig();

  const adapter = useMemo(
    () => (request ? modules.get(request.entity_type) : undefined),
    [modules, request],
  );

  const props = useMemo(() => {
    if (!adapter?.getModalProps) return null;
    return adapter.getModalProps({ open, decision, request }, onConfirm, onClose);
  }, [adapter, open, decision, request, onConfirm, onClose]);

  if (!open || !decision || !request) return null;

  const Component = adapter?.modalComponent;

  if (Component) {
    // The adapter owns the prop contract; `props` may legitimately be null when
    // the component needs none.
    return <Component {...(props ?? {})} />;
  }

  const isApprove = decision === 'Approved';

  return (
    <ApprovalCommentModal
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title={`${t(isApprove ? I18N.dashboard.approve : I18N.dashboard.reject)} ${
        adapter?.title ? t([adapter.title, adapter.title] as const) : ''
      }`.trim()}
      confirmButtonText={t(isApprove ? I18N.dashboard.approve : I18N.dashboard.reject)}
      confirmButtonColor={isApprove ? 'success' : 'error'}
      commentLabel={t(I18N.dashboard.comments)}
      commentPlaceholder={t(I18N.dashboard.commentsPlaceholder)}
      cancelButtonText={t(I18N.common.cancel)}
      // A rejection without a reason is not actionable for the requester.
      requireComment={!isApprove}
    />
  );
};
