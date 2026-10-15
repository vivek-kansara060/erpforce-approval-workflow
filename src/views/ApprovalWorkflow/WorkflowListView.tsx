/* eslint-disable @typescript-eslint/no-explicit-any --
 * MaterialTable cell render props are typed by @erpsquad/common. */

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { AddIcon } from '../../ui/icons';
import { Button, ConfirmModal } from '../../ui';
import { SURFACE } from '../../ui/tokens';
import { AsyncBoundary } from '../../components/feedback';
import { DataTable, ListToolbar, RowLink } from '../../components/list';
import { WorkflowStatusChip } from '../../components/workflow';
import { PermissionGate } from '../../permissions/PermissionGate';
import { useApprovalPermissions } from '../../permissions/usePermission';
import { I18N } from '../../constants/i18n-keys';
import { WORKFLOW_LIST_COLUMNS } from '../../constants/columns';
import {
  NON_DELETABLE_WORKFLOW_STATUSES,
  NON_EDITABLE_WORKFLOW_STATUSES,
} from '../../constants/defaults';
import { withId } from '../../utils/route';
import { useWorkflowList } from '../../hooks/useWorkflowList';
import { useEntityCatalogue, useReferenceOptions } from '../../hooks/useWorkflowReferences';
import {
  useApprovalWorkflowConfig,
  useNotifyError,
  useTranslate,
} from '../../providers/useApprovalWorkflowConfig';
import type { Workflow, WorkflowListFilters } from '../../types/workflow';

export interface WorkflowListViewProps {
  /** Extra server-side filters, e.g. pin the list to one entity type. */
  filters?: WorkflowListFilters;
  /** Set false to list workflows from every module. @default true */
  scopeToModule?: boolean;
  title?: string;
  /** Replace the default toolbar, e.g. with the host's full ActionBar. */
  renderToolbar?: (context: {
    search: string;
    setSearch: (search: string) => void;
    onAdd: () => void;
    canAdd: boolean;
  }) => ReactNode;
}

/**
 * Lists approval workflows with server-side search, sort, filter and paging.
 */
export const WorkflowListView = ({
  filters,
  scopeToModule = true,
  title,
  renderToolbar,
}: WorkflowListViewProps) => {
  const t = useTranslate();
  const { routes, navigate, notify } = useApprovalWorkflowConfig();
  const notifyError = useNotifyError();
  const permissions = useApprovalPermissions();

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
    deleteWorkflow,
    isDeleting,
  } = useWorkflowList({ filters, scopeToModule, onDeleteError: notifyError });

  const { labelOf } = useEntityCatalogue();
  const { options: actionTypes } = useReferenceOptions('action_type');

  const [pendingDelete, setPendingDelete] = useState<Workflow | null>(null);

  const canAdd = permissions['workflow.create'];

  const goToCreate = useCallback(
    () => navigate(routes.workflowCreate),
    [navigate, routes.workflowCreate],
  );

  const requestTypeLabel = useCallback(
    (value: unknown) => actionTypes.find((option) => option.value === value)?.label ?? '-',
    [actionTypes],
  );

  const columns = useMemo(
    () =>
      WORKFLOW_LIST_COLUMNS.map((column) => ({
        ...column,
        header: t([column.header, column.label] as const),
        Cell: ({ row, renderedCellValue }: any) => {
          const workflow = row.original as Workflow;
          const href = withId(routes.workflowView, workflow.id);
          const isNameColumn = column.accessorKey === WORKFLOW_LIST_COLUMNS[0].accessorKey;

          const content =
            column.accessorKey === 'entity_type' ? (
              labelOf(workflow.entity_type)
            ) : column.accessorKey === 'request_type' ? (
              requestTypeLabel(workflow.request_type)
            ) : column.accessorKey === 'is_active' ? (
              <WorkflowStatusChip isActive={workflow.is_active} />
            ) : (
              (renderedCellValue ?? '-')
            );

          return (
            <RowLink
              href={permissions['workflow.viewById'] ? href : undefined}
              onNavigate={() => navigate(href)}
              emphasis={isNameColumn}
            >
              {content}
            </RowLink>
          );
        },
      })),
    [t, routes.workflowView, labelOf, requestTypeLabel, permissions, navigate],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t(I18N.common.edit),
        handleAction: (workflow: Workflow) =>
          navigate(withId(routes.workflowEdit, workflow.id)),
        disabled: (workflow: Workflow) =>
          !permissions['workflow.edit'] ||
          NON_EDITABLE_WORKFLOW_STATUSES.includes(
            workflow.status as (typeof NON_EDITABLE_WORKFLOW_STATUSES)[number],
          ),
      },
      {
        label: t(I18N.common.duplicate),
        handleAction: (workflow: Workflow) =>
          navigate(`${routes.workflowCreate}?duplicateOf=${encodeURIComponent(String(workflow.id))}`),
        disabled: () => !canAdd,
      },
    ],
    [t, navigate, routes.workflowEdit, routes.workflowCreate, permissions, canAdd],
  );

  const destructiveActions = useMemo(
    () => [
      {
        label: t(I18N.common.delete),
        handleAction: (workflow: Workflow) => setPendingDelete(workflow),
        disabled: (workflow: Workflow) =>
          !permissions['workflow.delete'] ||
          NON_DELETABLE_WORKFLOW_STATUSES.includes(
            workflow.status as (typeof NON_DELETABLE_WORKFLOW_STATUSES)[number],
          ),
      },
    ],
    [t, permissions],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete?.id) return;
    // A failed delete keeps the dialog open; `onDeleteError` has told the user.
    if (!(await deleteWorkflow(String(pendingDelete.id)))) return;
    notify(t(I18N.workflow.deletedMessage), 'success');
    setPendingDelete(null);
  }, [pendingDelete, deleteWorkflow, notify, t]);

  return (
    <PermissionGate capability="workflow.view">
      <Box sx={{ bgcolor: SURFACE, minHeight: '100%' }}>
        {renderToolbar ? (
          renderToolbar({
            search: listState.search,
            setSearch,
            onAdd: goToCreate,
            canAdd,
          })
        ) : (
          <ListToolbar
            title={title ?? t(I18N.workflow.title)}
            search={listState.search}
            onSearchChange={setSearch}
            searchPlaceholder={t(I18N.common.search)}
            totalCount={totalCount}
            onAdd={goToCreate}
            addLabel={t(I18N.workflow.add)}
            showAdd={canAdd}
          />
        )}

        <AsyncBoundary
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          isEmpty={rows.length === 0 && !listState.search}
          emptyTitle={t(I18N.workflow.emptyListTitle)}
          emptyDescription={t(I18N.workflow.emptyListBody)}
          emptyAction={
            canAdd ? (
              <Button variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={goToCreate}>
                {t(I18N.workflow.add)}
              </Button>
            ) : undefined
          }
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
            destructiveActions={destructiveActions}
            paginationResource="approval-workflow"
          />
        </AsyncBoundary>

        <ConfirmModal
          open={Boolean(pendingDelete)}
          onClose={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
          loading={isDeleting}
          title={`${t(I18N.common.delete)} ${t(I18N.workflow.title)}`}
          description={`${t(I18N.common.deleteMessage)} ${pendingDelete?.name ?? ''}?`}
        />
      </Box>
    </PermissionGate>
  );
};
