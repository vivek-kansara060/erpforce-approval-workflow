/* eslint-disable @typescript-eslint/no-explicit-any --
 * MaterialTable cell render props are typed by @erpsquad/common. */

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Button } from '../../ui';
import { RefreshIcon } from '../../ui/icons';
import { ACCENT, SURFACE } from '../../ui/tokens';
import { AsyncBoundary } from '../../components/feedback';
import { DataTable, ListToolbar, RowLink } from '../../components/list';
import { ApprovalStatusChip } from '../../components/workflow';
import { RecordDetailsModal } from '../../components/modals';
import { DecisionModals } from './DecisionModals';
import { useApprovalRecordLinks } from './useApprovalRecordLinks';
import { PermissionGate } from '../../permissions/PermissionGate';
import { useApprovalPermissions } from '../../permissions/usePermission';
import { I18N } from '../../constants/i18n-keys';
import { APPROVAL_DASHBOARD_COLUMNS } from '../../constants/columns';
import { APPROVAL_FIELDS } from '../../constants/fields';
import { isPending } from '../../utils/status';
import { getSeriesNumber } from '../../utils/entity-data';
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
  renderToolbar?: (context: {
    search: string;
    setSearch: (search: string) => void;
    /** Reloads the queue from the server, bypassing the cache. */
    refresh: () => void;
    isRefreshing: boolean;
  }) => ReactNode;
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
  const [detailsRequest, setDetailsRequest] = useState<ApprovalRequest | null>(null);

  const {
    rows,
    totalCount,
    isLoading,
    isRefetching,
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

          // Opens the record's details in a modal instead of navigating, so it
          // is a button rather than a RowLink.
          if (column.accessorKey === APPROVAL_FIELDS.RECORD_REF) {
            const series = getSeriesNumber(request.entity_type_data);
            if (!series) return '-';
            return (
              <Box
                component="button"
                type="button"
                onClick={() => setDetailsRequest(request)}
                sx={{
                  // Same look as the ID column's RowLink (emphasis): accent,
                  // medium weight, underline on hover only.
                  '&&': {
                    all: 'unset',
                    display: 'block',
                    cursor: 'pointer',
                    color: ACCENT,
                    fontWeight: 500,
                    textDecoration: 'none',
                  },
                  '&&:hover': { textDecoration: 'underline' },
                  '&&:focus-visible': { outline: '2px solid', outlineColor: ACCENT },
                }}
              >
                {series}
              </Box>
            );
          }

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
          renderToolbar({
            search: listState.search,
            setSearch,
            refresh: () => void refetch(),
            isRefreshing: isRefetching,
          })
        ) : (
          <ListToolbar
            title={title ?? t(I18N.dashboard.title)}
            search={listState.search}
            onSearchChange={setSearch}
            searchPlaceholder={t(I18N.common.search)}
            totalCount={totalCount}
            showAdd={false}
            actions={
              <Button
                variant="outlined"
                startIcon={
                  isRefetching ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <RefreshIcon fontSize="small" />
                  )
                }
                onClick={() => void refetch()}
                disabled={isRefetching}
              >
                {t(I18N.dashboard.refresh)}
              </Button>
            }
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

        <RecordDetailsModal
          open={Boolean(detailsRequest)}
          onClose={() => setDetailsRequest(null)}
          title={
            getSeriesNumber(detailsRequest?.entity_type_data) ?? t(I18N.dashboard.recordDetails)
          }
          subtitle={detailsRequest ? entityTitle(detailsRequest) : undefined}
          data={detailsRequest?.entity_type_data}
          labels={{
            none: t(I18N.dashboard.recordNone),
            yes: t(I18N.dashboard.recordYes),
            no: t(I18N.dashboard.recordNo),
            empty: t(I18N.dashboard.recordDetailsEmpty),
            close: t(I18N.dashboard.recordDetailsClose),
          }}
        />
      </Box>
    </PermissionGate>
  );
};
