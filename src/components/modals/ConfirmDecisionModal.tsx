import { ConfirmModal } from '../../ui';
import type { ApprovalDecision } from '../../types/approval';

export interface ConfirmDecisionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (formData: unknown) => void;
  decision: ApprovalDecision | null;
  loading?: boolean;

  /** Copy, already translated by the caller. */
  approveTitle?: string;
  rejectTitle?: string;
  approveDescription?: string;
  rejectDescription?: string;
  title?: string;
  description?: string;
  approveLabel?: string;
  rejectLabel?: string;
  cancelLabel?: string;
}

/**
 * Comment-free confirmation, for entity types where approving is a yes/no step
 * (payroll runs, resource allocations).
 *
 * Exported so adapters can reference it by name instead of re-implementing the
 * approve/reject wording switch, which the original did inline in the mapper.
 */
export const ConfirmDecisionModal = ({
  open,
  onClose,
  onConfirm,
  decision,
  loading = false,
  approveTitle,
  rejectTitle,
  approveDescription,
  rejectDescription,
  title,
  description,
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  cancelLabel = 'Cancel',
}: ConfirmDecisionModalProps) => {
  const isApprove = decision === 'Approved';

  return (
    <ConfirmModal
      open={open}
      onClose={onClose}
      loading={loading}
      title={(isApprove ? approveTitle : rejectTitle) ?? title ?? ''}
      description={(isApprove ? approveDescription : rejectDescription) ?? description ?? ''}
      buttonColors={{ confirm: isApprove ? 'info' : 'error' }}
      buttonTexts={{
        confirm: isApprove ? approveLabel : rejectLabel,
        cancel: cancelLabel,
      }}
      onConfirm={() => onConfirm({})}
    />
  );
};
