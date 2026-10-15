/**
 * Approval history for any record.
 *
 * Also reachable as its own entry point, which pulls in only this component
 * and what it renders:
 *
 *   import { ApprovalHistory } from '@erpsquad/approval-workflow/components/approval-history'
 *
 * The data hook is `useApprovalHistory` from `…/hooks`; the history types are in
 * `…/types`.
 */

export { ApprovalHistory } from './ApprovalHistory';
export type { ApprovalHistoryProps } from './ApprovalHistory';
