import type { ApproverStageDraft } from '../types/approver';
import type { WorkflowFormValues } from '../types/workflow';

/** A brand-new, empty workflow form. */
export const createDefaultWorkflowFormValues = (module: string): WorkflowFormValues => ({
  id: null,
  name: '',
  description: '',
  module,
  entity_type: '',
  request_type: null,
  is_active: true,
  graph: null,
  company_ids: [],
  location_ids: [],
  department_ids: [],
  grade_ids: [],
  employment_type_ids: [],
});

/** A brand-new approval stage in the action sidebar. */
export const createDefaultApproverStage = (module: string): ApproverStageDraft => ({
  action_type_ref: '',
  approver_type: '',
  department_id: '',
  designation_id: '',
  approver_ids: [],
  level: '',
  approval_message: '',
  auto_approve_enabled: false,
  auto_approve_value: '',
  auto_approve_unit: '',
  module,
});

/** Default approval messages per approver type, applied when left blank. */
export const DEFAULT_APPROVAL_MESSAGES = {
  HIERARCHY: (level: string) => `${level} Manager approval required`,
  DEPARTMENT: () => 'Department head approval required',
  USER: () => 'Final approval from management',
} as const;

/**
 * Canvas layout geometry.
 *
 * `NODE_WIDTH` and `NODE_HEIGHT` are what a node actually occupies as
 * `GenericNode` renders it — the 96px card with its label and subtitle under
 * it (a long label wraps within the box, so 120px is the working width). The
 * hover toolbar floats above the card and takes no height. Earlier values
 * reserved room for it and for a 148px label, which read as far too wide.
 *
 * The two spacings are the *gap* between adjacent nodes, not the stride;
 * `layout-utils` adds the node's own size to get the column and row stride.
 */
export const LAYOUT = {
  NODE_WIDTH: 120,
  NODE_HEIGHT: 136,
  HORIZONTAL_SPACING: 36,
  VERTICAL_SPACING: 24,
  DEFAULT_MEASURED: { width: 366, height: 55 },
} as const;

/**
 * Edge/handle/canvas colours, kept out of components so a theme can override
 * them.
 *
 * Values are drawn from the ERP palette (`src/theme/color.ts` in
 * @erpsquad/common) rather than picked by eye, so the canvas belongs to the
 * same screen as the form around it: neutral-100 paper, neutral-300 dots,
 * primary green for a passing branch and the theme error red for a failing one.
 */
export const FLOW_COLORS = {
  /** Default connector: neutral-400, quiet enough to sit under the nodes. */
  edge: '#BDBEBF',
  pass: '#2EB273',
  fail: '#F86060',
  passHandle: '#2EB273',
  failHandle: '#F86060',
  neutralHandle: '#BDBEBF',
  canvasBackground: '#FBFBFB',
  canvasDots: '#D3D3D4',
} as const;

export const DEFAULT_EDGE_STYLE = { stroke: FLOW_COLORS.edge, strokeWidth: 2 } as const;
export const PASS_EDGE_STYLE = { stroke: FLOW_COLORS.pass, strokeWidth: 2 } as const;
export const FAIL_EDGE_STYLE = { stroke: FLOW_COLORS.fail, strokeWidth: 2 } as const;

/**
 * Result-branch presentation, shared by the canvas node, its edge label and the
 * action sidebar badge.
 *
 * `color` is the foreground (icon and label), `backgroundColor` the tint behind
 * it and `borderColor` the outline of the Pass/Fail tile — so the three places a
 * branch is drawn cannot drift apart.
 */
export const RESULT_BRANCH_PRESENTATION = {
  pass: {
    // primary-1000 on primary-100: the lighter greens failed contrast on the pill.
    color: '#1F7C5E',
    backgroundColor: '#D2F0E6',
    borderColor: FLOW_COLORS.pass,
    labelKey: 'approval-work-flow.criteria.when_passed',
    labelFallback: 'When criteria passed',
  },
  fail: {
    color: '#C64D4D',
    backgroundColor: '#FEDFDF',
    borderColor: FLOW_COLORS.fail,
    labelKey: 'approval-work-flow.criteria.when_failed',
    labelFallback: 'When criteria failed',
  },
} as const;

/** The two branches a criteria/action node always produces. */
export type ResultBranch = keyof typeof RESULT_BRANCH_PRESENTATION;

/**
 * Request type preselected on a brand-new workflow.
 *
 * The `action_type` reference list is deployment-owned, so this is matched
 * loosely by `findOptionByKey` (value, id or label) rather than assuming one
 * particular id. A deployment whose list has no equivalent entry simply gets no
 * preselection.
 */
export const DEFAULT_REQUEST_TYPE_KEY = 'request_approval';

/** Statuses that lock a workflow against editing. */
export const NON_EDITABLE_WORKFLOW_STATUSES = [
  'In Progress',
  'Closed',
  'Cancelled',
  'Completed',
] as const;

export const NON_DELETABLE_WORKFLOW_STATUSES = ['Completed'] as const;

/** How long a cached server response stays fresh, in ms. */
export const DEFAULT_STALE_TIME = 30_000;

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Upper bound on the approval requests fetched for one record's history. A
 * record collects one request per approver per stage, so this is far above any
 * real workflow while still bounding the response.
 */
export const APPROVAL_HISTORY_LIMIT = 100;
