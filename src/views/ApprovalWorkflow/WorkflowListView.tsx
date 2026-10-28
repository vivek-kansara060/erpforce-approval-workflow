/* eslint-disable @typescript-eslint/no-explicit-any --
 * MaterialTable cell render props are typed by @erpsquad/common. */

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Box, MenuItem, TextField as MuiTextField } from '@mui/material';
import { AddIcon } from '../../ui/icons';
import { Button, ConfirmModal } from '../../ui';
import { SURFACE, searchFieldSx } from '../../ui/tokens';
import { AsyncBoundary, EmptyState } from '../../components/feedback';
import { DataTable, ListToolbar, RowLink } from '../../components/list';
import { WorkflowLifecycleChip, WorkflowStatusChip } from '../../components/workflow';
import { PermissionGate } from '../../permissions/PermissionGate';
import { useApprovalPermissions } from '../../permissions/usePermission';
import { I18N } from '../../constants/i18n-keys';
import { WORKFLOW_LIST_COLUMNS } from '../../constants/columns';
import {
  NON_DELETABLE_WORKFLOW_STATUSES,
  NON_EDITABLE_WORKFLOW_STATUSES,
} from '../../constants/defaults';
import { withId } from '../../utils/route';
import { formatTimestamp } from '../../utils/format';
import { useWorkflowList } from '../../hooks/useWorkflowList';
import { useEntityCatalogue, useReferenceOptions } from '../../hooks/useWorkflowReferences';
import {
  useApprovalWorkflowConfig,
  useNotifyError,
  useTranslate,
} from '../../providers/useApprovalWorkflowConfig';
import type { Workflow, WorkflowListFilters } from '../../types/workflow';

/** The publish and active filters are built but switched off for now. */
const SHOW_STATUS_FILTERS = false;

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

  // Filter controls live in the default toolbar. Anything the host pins through
  // `filters` wins and its control is not offered.
  const [publishFilter, setPublishFilter] = useState<'' | 'draft' | 'published'>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');

  const effectiveFilters = useMemo<WorkflowListFilters>(
    () => ({
      ...(publishFilter ? { status: publishFilter } : null),
      ...(activeFilter ? { isActive: activeFilter === 'true' } : null),
      ...filters,
    }),
    [filters, publishFilter, activeFilter],
  );
  const hasActiveFilter = Boolean(publishFilter || activeFilter);

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
    toggleWorkflow,
  } = useWorkflowList({
    filters: effectiveFilters,
    scopeToModule,
    onDeleteError: notifyError,
    onToggleError: notifyError,
  });

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

  // "Companies (2), Departments (1)": how many of each, without a lookup per row.
  const scopeSummary = useCallback(
    (workflow: Workflow) => {
      const parts: Array<[string, number | undefined]> = [
        [t(I18N.workflow.scopeCompanies), workflow.company_ids?.length],
        [t(I18N.workflow.scopeLocations), workflow.location_ids?.length],
        [t(I18N.workflow.scopeDepartments), workflow.department_ids?.length],
        [t(I18N.workflow.scopeGrades), workflow.grade_ids?.length],
        [t(I18N.workflow.scopeTypes), workflow.employment_type_ids?.length],
      ];
      const text = parts
        .filter(([, count]) => count)
        .map(([label, count]) => `${label} (${count})`)
        .join(', ');
      return text || '-';
    },
    [t],
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
            ) : column.accessorKey === 'company_ids' ? (
              scopeSummary(workflow)
            ) : column.accessorKey === 'status' ? (
              workflow.status ? (
                <WorkflowLifecycleChip status={workflow.status} />
              ) : (
                '-'
              )
            ) : column.accessorKey === 'updated_at' ? (
              (formatTimestamp(workflow.updated_at) ?? '-')
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
    [t, routes.workflowView, labelOf, requestTypeLabel, scopeSummary, permissions, navigate],
  );

  const changeActive = useCallback(
    async (workflow: Workflow, activate: boolean) => {
      if (!workflow.id) return;
      // A failed toggle (say, a second live copy) has already been announced.
      if ((await toggleWorkflow(String(workflow.id))) === undefined) return;
      notify(
        t(activate ? I18N.workflow.activatedMessage : I18N.workflow.deactivatedMessage),
        'success',
      );
    },
    [toggleWorkflow, notify, t],
  );

  const rowActions = useMemo(
    () => [
      {
        label: t(I18N.common.edit),
        handleAction: (workflow: Workflow) => navigate(withId(routes.workflowEdit, workflow.id)),
        disabled: (workflow: Workflow) =>
          !permissions['workflow.edit'] ||
          NON_EDITABLE_WORKFLOW_STATUSES.includes(
            workflow.status as (typeof NON_EDITABLE_WORKFLOW_STATUSES)[number],
          ),
      },
      {
        label: t(I18N.workflow.activate),
        handleAction: (workflow: Workflow) => changeActive(workflow, true),
        disabled: (workflow: Workflow) => !permissions['workflow.activate'] || workflow.is_active,
      },
      {
        label: t(I18N.workflow.deactivate),
        handleAction: (workflow: Workflow) => changeActive(workflow, false),
        disabled: (workflow: Workflow) => !permissions['workflow.activate'] || !workflow.is_active,
      },
      {
        label: t(I18N.common.duplicate),
        handleAction: (workflow: Workflow) =>
          navigate(
            `${routes.workflowCreate}?duplicateOf=${encodeURIComponent(String(workflow.id))}`,
          ),
        disabled: () => !canAdd,
      },
    ],
    [t, navigate, routes.workflowEdit, routes.workflowCreate, permissions, canAdd, changeActive],
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

  const changeFilter = useCallback(
    (setter: (value: never) => void) => (event: { target: { value: string } }) => {
      setter(event.target.value as never);
      // A narrower result set may not have the page the user is on.
      listState.update({ pagination: { ...listState.pagination, pageNo: 1 } });
    },
    [listState],
  );

  const clearSearchAndFilters = useCallback(() => {
    setPublishFilter('');
    setActiveFilter('');
    setSearch('');
  }, [setSearch]);

  const filterControl = (
    label: string,
    value: string,
    onChange: (event: { target: { value: string } }) => void,
    options: Array<{ value: string; label: string }>,
  ) => (
    <MuiTextField
      select
      size="small"
      value={value}
      onChange={onChange}
      label={label}
      sx={{ ...searchFieldSx, minWidth: 150 }}
      InputLabelProps={{ shrink: true }}
      SelectProps={{ displayEmpty: true }}
    >
      <MenuItem value="">{t(I18N.workflow.filterAll)}</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </MuiTextField>
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
            actions={
              SHOW_STATUS_FILTERS ? (
                <>
                  {filters?.status === undefined
                    ? filterControl(
                        t(I18N.workflow.filterPublishStatus),
                        publishFilter,
                        changeFilter(setPublishFilter),
                        [
                          { value: 'draft', label: t(I18N.workflow.statusDraft) },
                          { value: 'published', label: t(I18N.workflow.statusPublished) },
                        ],
                      )
                    : null}
                  {filters?.isActive === undefined
                    ? filterControl(
                        t(I18N.workflow.filterStatus),
                        activeFilter,
                        changeFilter(setActiveFilter),
                        [
                          { value: 'true', label: t(I18N.workflow.active) },
                          { value: 'false', label: t(I18N.workflow.inactive) },
                        ],
                      )
                    : null}
                </>
              ) : null
            }
          />
        )}

        <AsyncBoundary
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          isEmpty={rows.length === 0 && !listState.search && !hasActiveFilter}
          emptyTitle={t(I18N.workflow.emptyListTitle)}
          emptyDescription={t(I18N.workflow.emptyListBody)}
          emptyAction={
            canAdd ? (
              <Button
                variant="contained"
                startIcon={<AddIcon fontSize="small" />}
                onClick={goToCreate}
              >
                {t(I18N.workflow.add)}
              </Button>
            ) : undefined
          }
          variant="page"
        >
          {rows.length === 0 && (listState.search || hasActiveFilter) ? (
            <EmptyState
              title={t(I18N.workflow.noResultsTitle)}
              description={t(I18N.workflow.noResultsBody)}
              action={
                <Button variant="outlined" onClick={clearSearchAndFilters}>
                  {t(I18N.workflow.clearSearch)}
                </Button>
              }
            />
          ) : (
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
          )}
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
