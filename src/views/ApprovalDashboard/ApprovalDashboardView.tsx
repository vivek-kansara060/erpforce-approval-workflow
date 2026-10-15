/* eslint-disable @typescript-eslint/no-explicit-any --
 * MaterialTable cell render props are typed by @erpsquad/common. */

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { SURFACE } from '../../ui/tokens';
import { AsyncBoundary } from '../../components/feedback';
import { DataTable, ListToolbar, RowLink } from '../../components/list';
import { ApprovalStatusChip } from '../../components/workflow';
import { DecisionModals } from './DecisionModals';
import { useApprovalRecordLinks } from './useApprovalRecordLinks';
import { PermissionGate } from '../../permissions/PermissionGate';
import { useApprovalPermissions } from '../../permissions/usePermission';
import { I18N } from '../../constants/i18n-keys';
import { APPROVAL_DASHBOARD_COLUMNS } from '../../constants/columns';
import { APPROVAL_FIELDS } from '../../constants/fields';
import { isPending } from '../../utils/status';
import { useApprovalRequests } from '../../hooks/useApprovalRequests';
import { useApprovalDecision } from '../../hooks/useApprovalDecision';
import { useTranslate } from '../../providers/useApprovalWorkflowConfig';
import type { ApprovalDashboardFilters, ApprovalRequest } from '../../types/approval';

export interface ApprovalDashboardViewProps {
  filters?: ApprovalDashboardFilters;
  /** Set false for an admin view of every approver's queue. @default true */
  scopeToCurrentUser?: boolean;
  /** Set false to include already-decided requests. @default true */
  pendingOnly?: boolean;
  title?: string;
  renderToolbar?: (context: { search: string; setSearch: (search: string) => void }) => ReactNode;
}

/**
 * The approval queue: pending requests, with view/approve/reject taken from the
 * row's action menu and the row itself linking to the underlying record.
 *
 * Entity-specific behaviour — the record's title, its route, which modal opens,
 * which API the decision hits — comes entirely from the module registry, so
 * this component has no import edge to any ERP module.
 */
export const ApprovalDashboardView = ({
  filters,
  scopeToCurrentUser = true,
  pendingOnly = true,
  title,
  renderToolbar,
}: ApprovalDashboardViewProps) => {
  const t = useTranslate();
  const permissions = useApprovalPermissions();
  const { entityTitle, recordRoute, openRecord } = useApprovalRecordLinks();

  const {
    rows,
    totalCount,
    isLoading,
    error,
    refetch,
    listState,
    setPage,
    setPageSize,
    setSearch,
  } = useApprovalRequests({ filters, scopeToCurrentUser, pendingOnly });

  const decision = useApprovalDecision({ onCompleted: refetch });
  const { startApproval, openDecision, getPendingPreAction } = decision;

  const columns = useMemo(
    () =>
      APPROVAL_DASHBOARD_COLUMNS.map((column) => ({
        ...column,
        header: t([column.header, column.label] as const),
        Cell: ({ row, renderedCellValue }: any) => {
          const request = row.original as ApprovalRequest;

          const content =
            column.accessorKey === APPROVAL_FIELDS.STATUS ? (
              <ApprovalStatusChip status={request.status} />
            ) : column.accessorKey === APPROVAL_FIELDS.ENTITY_TYPE ? (
              entityTitle(request)
            ) : (
              (renderedCellValue ?? '-')
            );

          return (
            <RowLink
              href={recordRoute(request)}
              onNavigate={() => openRecord(request)}
              emphasis={column.accessorKey === APPROVAL_FIELDS.ID}
            >
              {content}
            </RowLink>
          );
        },
      })),
    [t, entityTitle, recordRoute, openRecord],
  );

  /**
   * A module can gate approval behind its own step — "Add budget" on a hire
   * request, say. While that step applies the request is not yet decidable, so
   * Approve opens it and Reject stays unavailable.
   *
   * Depends on the decision hook's stable functions, not the hook's result, so
   * opening a modal does not rebuild every row's action menu.
   */
  const rowActions = useMemo(
    () => [
      {
        label: t(I18N.common.view),
        handleAction: openRecord,
        disabled: (request: ApprovalRequest) => !recordRoute(request),
      },
      {
        label: t(I18N.dashboard.approve),
        handleAction: startApproval,
        disabled: (request: ApprovalRequest) =>
          !isPending(request.status) || !permissions['approval.approve'],
      },
      {
        label: t(I18N.dashboard.reject),
        handleAction: (request: ApprovalRequest) => openDecision(request, 'Rejected'),
        disabled: (request: ApprovalRequest) =>
          !isPending(request.status) ||
          !permissions['approval.reject'] ||
          Boolean(getPendingPreAction(request)),
      },
    ],
    [t, openRecord, recordRoute, startApproval, openDecision, getPendingPreAction, permissions],
  );

  return (
    <PermissionGate capability="approval.view">
      <Box sx={{ bgcolor: SURFACE, minHeight: '100%' }}>
        {renderToolbar ? (
          renderToolbar({ search: listState.search, setSearch })
        ) : (
          <ListToolbar
            title={title ?? t(I18N.dashboard.title)}
            search={listState.search}
            onSearchChange={setSearch}
            searchPlaceholder={t(I18N.common.search)}
            totalCount={totalCount}
            showAdd={false}
          />
        )}

        <AsyncBoundary
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          isEmpty={rows.length === 0 && !listState.search}
          emptyTitle={t(I18N.dashboard.emptyTitle)}
          emptyDescription={t(I18N.dashboard.emptyBody)}
          variant="page"
        >
          <DataTable
            rows={rows}
            columns={columns}
            pagination={{ ...listState.pagination, totalCount }}
            isLoading={isLoading}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={(sort) => listState.update({ sort })}
            rowActions={rowActions}
            paginationResource="approval-dashboard"
          />
        </AsyncBoundary>

        <DecisionModals decision={decision} />
      </Box>
    </PermissionGate>
  );
};
