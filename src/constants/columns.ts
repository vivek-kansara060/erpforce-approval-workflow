import { APPROVAL_FIELDS, WORKFLOW_FIELDS } from './fields';

/**
 * Column descriptors.
 *
 * The shape matches `MaterialTableColumnProps` from @erpsquad/common but is
 * declared structurally so this module stays importable without the peer
 * dependency (constants are used by the API layer to build `select` payloads).
 */
export interface ApprovalTableColumn {
  accessorKey: string;
  /** Translation key; resolved by the view. */
  header: string;
  /**
   * English fallback for `header`.
   *
   * Without it the views fell back to the key itself, and a host that has not
   * shipped these translations rendered `approval-work-flow.columns.status` as
   * a column heading. Everything else in the package pairs a key with readable
   * text (see `I18N`); the column table now does too.
   */
  label: string;
  visible: boolean;
  type?: 'string' | 'number' | 'date' | 'datetime' | 'custom' | 'status' | 'boolean';
}

export const WORKFLOW_LIST_COLUMNS: ApprovalTableColumn[] = [
  {
    accessorKey: WORKFLOW_FIELDS.NAME,
    header: 'approval-work-flow.columns.workflow_title',
    label: 'Workflow Title',
    visible: true,
    type: 'string',
  },
  {
    accessorKey: WORKFLOW_FIELDS.ENTITY_TYPE,
    header: 'approval-work-flow.columns.request_category',
    label: 'Request Category',
    visible: true,
    type: 'custom',
  },
  {
    accessorKey: WORKFLOW_FIELDS.REQUEST_TYPE,
    header: 'approval-work-flow.columns.request_type',
    label: 'Request Type',
    visible: true,
    type: 'custom',
  },
  {
    accessorKey: WORKFLOW_FIELDS.IS_ACTIVE,
    header: 'approval-work-flow.columns.status',
    label: 'Status',
    visible: true,
    type: 'custom',
  },
];

export const APPROVAL_DASHBOARD_COLUMNS: ApprovalTableColumn[] = [
  {
    accessorKey: APPROVAL_FIELDS.ID,
    header: 'approval-dashboard.columns.id',
    label: 'ID',
    visible: true,
    type: 'string',
  },
  {
    accessorKey: APPROVAL_FIELDS.ENTITY_TYPE,
    header: 'approval-dashboard.columns.request_type',
    label: 'Request Type',
    visible: true,
    type: 'custom',
  },
  {
    accessorKey: APPROVAL_FIELDS.DESCRIPTION,
    header: 'approval-dashboard.columns.description',
    label: 'Description',
    visible: true,
    type: 'string',
  },
  {
    accessorKey: APPROVAL_FIELDS.REQUESTED_BY,
    header: 'approval-dashboard.columns.requested_by',
    label: 'Requested By',
    visible: true,
    type: 'string',
  },
  {
    accessorKey: APPROVAL_FIELDS.DATE,
    header: 'approval-dashboard.columns.date',
    label: 'Date',
    visible: true,
    type: 'date',
  },
  {
    accessorKey: APPROVAL_FIELDS.STATUS,
    header: 'approval-dashboard.columns.status',
    label: 'Status',
    visible: true,
    type: 'custom',
  },
  // Approve and Reject live in the row's action menu alongside View. They had a
  // dedicated column of buttons, which cost a full column of width on every row
  // to repeat two actions the menu already had room for.
];
