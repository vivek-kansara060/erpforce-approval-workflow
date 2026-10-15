/**
 * The workflow graph.
 *
 * These types intentionally do NOT import from `@xyflow/react`: the graph is a
 * plain serialisable structure that the API stores verbatim, and keeping it
 * free of the flow library lets the dashboard entry point be built without
 * pulling React Flow into the bundle. The builder widens them to React Flow's
 * `Node`/`Edge` at its own boundary (see components/builder/flow-types.ts).
 */

import type { CriteriaCondition } from './criteria';
import type { ApproverStage } from './approver';

export type WorkflowNodeType =
  | 'trigger'
  | 'criteria'
  | 'criteriaResult'
  | 'action'
  | 'actionResult';

/** Legacy node types still present in persisted graphs. */
export type LegacyResultNodeType = 'pass' | 'fail';

export type PersistedNodeType = WorkflowNodeType | LegacyResultNodeType;

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeMeasurements {
  width: number;
  height: number;
}

export interface TriggerNodeData {
  label: string;
  /** Entity type that starts the workflow, e.g. `leave_requests`. */
  trigger: string;
  triggerId?: string;
  /** `onCreate` by default; reserved for future trigger events. */
  event_type?: string;
  module?: string;
  description?: string;
}

export interface CriteriaNodeData {
  label: string;
  conditions: CriteriaCondition[];
  logicOperator?: 'AND' | 'OR';
}

export interface ResultNodeData {
  label: string;
  resultType: 'pass' | 'fail';
  /** Older graphs stored the branch under `type` instead of `resultType`. */
  type?: 'pass' | 'fail';
  /**
   * Approval stages configured directly on this branch.
   *
   * A Pass/Fail branch is not only a marker: the builder edits it through the
   * action sidebar (see `useWorkflowGraph.openSidebarForNode`), so "what
   * happens when the criteria passes" is stored on the branch node itself. The
   * engine reads it from here — `transformGraphToExecution` walks
   * `criteriaResult` nodes specifically for their `action` array.
   */
  action?: ApproverStage[];
}

export interface ActionNodeData {
  label: string;
  action: ApproverStage[];
}

/**
 * Node data that carries approval stages: a dedicated action node, or a result
 * branch that has been configured through the action sidebar.
 */
export type ActionBearingNodeData = ActionNodeData | ResultNodeData;

export type WorkflowNodeData =
  | TriggerNodeData
  | CriteriaNodeData
  | ResultNodeData
  | ActionNodeData;

export interface WorkflowNode<TData extends WorkflowNodeData = WorkflowNodeData> {
  id: string;
  type: PersistedNodeType;
  position: NodePosition;
  parentId?: string | null;
  data: TData;
  measured?: NodeMeasurements;
  selected?: boolean;
  dragging?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  label?: string;
  style?: Record<string, string | number>;
  markerEnd?: Record<string, string | number>;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: Viewport;
}

export interface GraphValidationResult {
  isValid: boolean;
  errors: string[];
}

/** Type guards keep the node-data unions usable without casts. */
export const isTriggerNode = (
  node: WorkflowNode,
): node is WorkflowNode<TriggerNodeData> => node.type === 'trigger';

export const isCriteriaNode = (
  node: WorkflowNode,
): node is WorkflowNode<CriteriaNodeData> => node.type === 'criteria';

export const isActionNode = (
  node: WorkflowNode,
): node is WorkflowNode<ActionNodeData> => node.type === 'action';

export const isResultNode = (
  node: WorkflowNode,
): node is WorkflowNode<ResultNodeData> =>
  node.type === 'criteriaResult' ||
  node.type === 'actionResult' ||
  node.type === 'pass' ||
  node.type === 'fail';
