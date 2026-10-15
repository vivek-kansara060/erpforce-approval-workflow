/* eslint-disable @typescript-eslint/no-explicit-any --
 * Documented integration boundary: a module adapter hands props straight to a
 * host-owned modal component whose prop shape the package cannot know. See
 * docs/TYPES.md. */

import type { ComponentType } from 'react';
import type { ApprovalDecision, ApprovalRequest } from './approval';

/**
 * Everything an adapter is told about the decision the user is taking.
 */
export interface DecisionContext {
  request: ApprovalRequest;
  decision: ApprovalDecision;
  /** Whatever the adapter's modal produced (a string, a form payload, ...). */
  formData: unknown;
  /** Convenience: `request.entity_id ?? request.id`, stringified. */
  entityId: string;
}

/** Props the package passes to an adapter's decision modal. */
export interface DecisionModalState {
  open: boolean;
  decision: ApprovalDecision | null;
  request: ApprovalRequest | null;
}

/**
 * A step a pending request must pass through before it can be decided (for
 * example "Add budget" on a hire request).
 *
 * While `shouldShow` returns true the row's **Approve** action opens this
 * modal rather than the approval one, and **Reject** is unavailable.
 */
export interface PreActionConfig {
  shouldShow: (request: ApprovalRequest) => boolean;
  /** Translation key or literal label. */
  label: string;
  className?: string;
  component: ComponentType<any>;
  submit: (formData: unknown, request: ApprovalRequest) => Promise<unknown> | unknown;
  /** Translation key or literal message shown on success. */
  successMessage: string;
}

/**
 * Contract a consuming ERP module implements to plug one entity type into the
 * approval dashboard.
 *
 * Only `entityType` is required. Everything else falls back to the generic
 * approval behaviour (`ApprovalCommentModal` + the workflow-automation
 * approve/reject endpoint), so a new module can be onboarded with one line.
 */
export interface ApprovalModuleAdapter {
  /** Matches `ApprovalRequest.entity_type`. */
  entityType: string;

  /** Display title. A translation key is resolved through `config.translate`. */
  title?: string;

  /** Route to the underlying record. Return `undefined` to disable navigation. */
  getRecordRoute?: (request: ApprovalRequest) => string | undefined;

  /**
   * Modal rendered when the user clicks Approve/Reject.
   * Defaults to the package's `ApprovalCommentModal`.
   */
  modalComponent?: ComponentType<any>;

  /**
   * Build the props for `modalComponent`. Mirrors the host's existing modal
   * signatures exactly, so current modals can be reused without a wrapper.
   */
  getModalProps?: (
    state: DecisionModalState,
    onConfirm: (formData: unknown) => void,
    onClose: () => void,
  ) => Record<string, unknown>;

  /**
   * Perform the decision. Return value is ignored; throw to signal failure.
   * Defaults to the generic approval endpoint.
   */
  submitDecision?: (context: DecisionContext) => Promise<unknown> | unknown;

  /**
   * Whether the package's own approve/reject endpoint is called.
   *
   * Left unset, it is called only when no `submitDecision` is supplied — so
   * defining `submitDecision` replaces the built-in call, which is the
   * behaviour every existing adapter already relies on. Set it explicitly to
   * decouple the two:
   *
   * - `false` — never call the package endpoint. Use with `submitDecision` when
   *   your API is the only writer, or on its own to make the dashboard's
   *   buttons purely local.
   * - `true` — always call it. Use with `submitDecision` when your API is a
   *   side effect (raise a PO, notify a queue) and the package still owns the
   *   status transition. `submitDecision` runs first, so a failure there aborts
   *   before the request is marked decided.
   *
   * Setting it on the `'*'` fallback adapter switches the default for every
   * entity type at once.
   *
   * Ignored when `handlesOwnSubmission` is set — that already skips everything.
   */
  callDecisionApi?: boolean;

  /**
   * Set when `modalComponent` performs its own API call (file uploads, multi
   * step flows). The package then only refreshes the list.
   */
  handlesOwnSubmission?: boolean;

  preAction?: PreActionConfig;
}

/** Immutable lookup built by `createModuleRegistry`. */
export interface ModuleRegistry {
  get(entityType: string): ApprovalModuleAdapter;
  has(entityType: string): boolean;
  list(): ApprovalModuleAdapter[];
  /** Returns a new registry with the given adapters added or replaced. */
  extend(adapters: ApprovalModuleAdapter[]): ModuleRegistry;
}
