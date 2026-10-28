import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { NodeChange, Viewport } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ActionIcon, Button, ConfirmModal, CriteriaIcon, Typography } from '../../ui';
import { BORDER, SURFACE, TEXT_SUBTLE } from '../../ui/tokens';
import { PageHeader } from '../layout';
import { ZoomControls } from './ZoomControls';
import { HistoryControls } from './HistoryControls';
import { ScopeFilterBar } from './ScopeFilterBar';
import { useAvailableHeight } from './useAvailableHeight';
import { useNodeTypes } from './nodes/nodeTypes';
import { EDGE_TYPES } from './edges/BranchEdge';
import { applyTrackedNodeChanges, toFlowEdge } from './flow-types';
import { useFlowNodes } from './useFlowNodes';
import type { NodeCallbacks } from './flow-types';
import { TestRunDrawer } from './sidebars/TestRunDrawer';
import { TriggerSidebar } from './sidebars/TriggerSidebar';
import { CriteriaSidebar } from './sidebars/CriteriaSidebar';
import { ActionSidebar } from './sidebars/ActionSidebar';
import { FLOW_COLORS } from '../../constants/defaults';
import { I18N } from '../../constants/i18n-keys';
import { useWorkflowGraph } from '../../hooks/useWorkflowGraph';
import {
  useApprovalWorkflowConfig,
  useTranslate,
} from '../../providers/useApprovalWorkflowConfig';
import type { ScopeFilterDefinition } from '../../constants/options';
import type {
  ActionNodeData,
  CriteriaNodeData,
  ResultNodeData,
  TriggerNodeData,
  WorkflowGraph,
} from '../../types/graph';
import type { WorkflowScope } from '../../types/workflow';

export interface WorkflowBuilderProps {
  /** Graph to seed the canvas with. Read once, on mount. */
  initialGraph?: WorkflowGraph | null;
  onChange?: (graph: WorkflowGraph) => void;
  onBack?: () => void;

  /** Entity the workflow is bound to; drives the trigger and criteria fields. */
  entityType: string;
  /** Label for the trigger node of a brand-new workflow. */
  entityLabel?: string;

  /** Scope selections, rendered above the canvas and used to filter lookups. */
  scope: WorkflowScope;
  onScopeChange?: (key: keyof WorkflowScope, value: Array<string | number>) => void;
  scopeFilters?: ScopeFilterDefinition[];
  /** Hide the scope bar entirely (a module without organisational scope). */
  showScopeFilters?: boolean;

  readOnly?: boolean;
  title?: string;
  /**
   * Explicit canvas height. Left unset, the canvas measures its own distance
   * from the top of the viewport and fills the rest of it.
   */
  height?: number | string;
  /**
   * Render the builder's own title bar. Set false when the embedding screen
   * already shows one — two stacked headers cost ~120px of canvas.
   * @default true
   */
  showHeader?: boolean;
}

const EMPTY_GRAPH: WorkflowGraph = { nodes: [], edges: [] };

/** More blocks than this and the overview map is shown. */
const MINIMAP_MIN_NODES = 8;

/** Test run is built but switched off for now; flip to bring the button and drawer back. */
const SHOW_TEST_RUN = false;

const minimapNodeColor = (node: { data?: Record<string, unknown>; type?: string }) => {
  const result = node.data?.resultType ?? node.data?.type;
  if (result === 'fail') return FLOW_COLORS.fail;
  if (result === 'pass') return FLOW_COLORS.pass;
  return FLOW_COLORS.neutralHandle;
};

/** One line of the canvas key: the pass and fail colours, then what they mean. */
const Legend = ({ text }: { text: string }) => (
  <Box display="flex" alignItems="center" gap={0.75}>
    <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: FLOW_COLORS.pass }} />
    <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: FLOW_COLORS.fail }} />
    <Typography type="s5" color={TEXT_SUBTLE}>
      {text}
    </Typography>
  </Box>
);

const BuilderCanvas = ({
  initialGraph,
  onChange,
  onBack,
  entityType,
  entityLabel,
  scope,
  onScopeChange,
  scopeFilters,
  showScopeFilters = true,
  readOnly = false,
  title,
  height,
  showHeader = true,
}: WorkflowBuilderProps) => {
  const t = useTranslate();
  const { moduleContext, notify } = useApprovalWorkflowConfig();
  const nodeTypes = useNodeTypes();
  const [rootRef, measuredHeight] = useAvailableHeight(height === undefined);

  const graph = useWorkflowGraph({
    initialGraph,
    trigger: {
      label: entityLabel ?? entityType,
      entityType,
      module: moduleContext.module,
    },
    onChange,
    readOnly,
  });

  // `graph` is a fresh object every render; the callbacks below depend on its
  // members, which are stable, so they keep their identity too.
  const {
    requestDelete,
    confirmDelete,
    saveNode,
    setNodes,
    moveNode,
    setViewport,
    openSidebarForNode,
    openCriteriaSidebar,
    openActionSidebar,
    duplicateNode,
    undo,
    redo,
  } = graph;
  const isSidebarOpen = graph.sidebar.isOpen;
  const [isTestRunOpen, setIsTestRunOpen] = useState(false);
  const openTestRun = useCallback(() => setIsTestRunOpen(true), []);
  const closeTestRun = useCallback(() => setIsTestRunOpen(false), []);
  // While the drawer is shut it gets one stable, empty graph, so dragging a node
  // does not re-render it; it is handed the live graph only once it opens.
  const testRunGraph = useMemo(
    () => (isTestRunOpen ? { nodes: graph.nodes, edges: graph.edges } : EMPTY_GRAPH),
    [isTestRunOpen, graph.nodes, graph.edges],
  );

  const handleDelete = useCallback(
    (nodeId: string) => {
      // The only block today is the trigger; its reason is English, so the
      // translated copy is shown instead.
      if (requestDelete(nodeId).blocked) notify(t(I18N.workflow.triggerNotDeletable), 'error');
    },
    [requestDelete, notify, t],
  );

  const handleDuplicate = useCallback(
    (nodeId: string) => {
      duplicateNode(nodeId, t(I18N.node.copySuffix));
      notify(t(I18N.node.duplicated), 'success');
    },
    [duplicateNode, notify, t],
  );

  // Stable callback bundle: a new object here would re-create every node's data
  // and force React Flow to re-render the whole canvas on each parent render.
  // A view-only canvas still lets a node be opened to inspect it; it just gets
  // no toolbar, and `draggable` is switched off below.
  const callbacks = useMemo<Partial<NodeCallbacks>>(
    () =>
      readOnly
        ? { onEdit: openSidebarForNode }
        : {
            onEdit: openSidebarForNode,
            onDelete: handleDelete,
            onAddCriteria: openCriteriaSidebar,
            onAddAction: openActionSidebar,
            onDuplicate: handleDuplicate,
          },
    [
      readOnly,
      openSidebarForNode,
      openCriteriaSidebar,
      openActionSidebar,
      handleDelete,
      handleDuplicate,
    ],
  );

  // Ctrl/Cmd+Z and Ctrl+Shift+Z / Ctrl+Y. Ignored while typing in a field or
  // while a drawer is open, so it never steals the browser's own text undo.
  useEffect(() => {
    if (readOnly) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isSidebarOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [readOnly, isSidebarOpen, undo, redo]);

  const flowNodes = useFlowNodes(graph.nodes, callbacks, !readOnly);

  const flowEdges = useMemo(() => graph.edges.map(toFlowEdge), [graph.edges]);

  /**
   * React Flow emits a change stream; `applyTrackedNodeChanges` mirrors only
   * the parts of it the package owns, and returns the previous array when
   * nothing moved — so an idle stream costs no render. See the note on that
   * function for why measurement changes are dropped.
   */
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) => applyTrackedNodeChanges(current, changes));
    },
    [setNodes],
  );

  const handleNodeDragStop = useCallback(
    (_event: unknown, node: { id: string; position: { x: number; y: number } }) =>
      moveNode(node.id, node.position),
    [moveNode],
  );

  // React Flow switches pointer events off on every node of a canvas where
  // nothing is selectable or draggable, so a view-only canvas never received the
  // click that opens a block. Registering a node click handler turns them back
  // on.
  const handleNodeClick = useCallback(
    (_event: unknown, node: { id: string }) => openSidebarForNode(node.id),
    [openSidebarForNode],
  );

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => setViewport(viewport),
    [setViewport],
  );

  const handleConfirmDelete = useCallback(() => {
    const result = confirmDelete();
    if (!result) return;
    notify(
      t(result.hadChildren ? I18N.workflow.nodeAndBranchesDeleted : I18N.workflow.nodeDeleted),
      'success',
    );
  }, [confirmDelete, notify, t]);

  const handleSaveTrigger = useCallback(
    (nodeId: string, data: TriggerNodeData) => saveNode(nodeId, data),
    [saveNode],
  );

  const handleSaveCriteria = useCallback(
    (nodeId: string, data: CriteriaNodeData, parentNodeId: string) =>
      saveNode(nodeId, data, { parentNodeId, kind: 'criteria' }),
    [saveNode],
  );

  const handleSaveAction = useCallback(
    (nodeId: string, data: ActionNodeData, parentNodeId: string) =>
      saveNode(nodeId, data, { parentNodeId, kind: 'action' }),
    [saveNode],
  );

  return (
    <Box
      ref={rootRef}
      display="flex"
      flexDirection="column"
      height={measuredHeight ?? height ?? '70vh'}
      position="relative"
      sx={{ bgcolor: SURFACE, overflow: 'hidden' }}
    >
      {showHeader ? (
        <PageHeader
          title={title ?? t(I18N.workflow.builder)}
          subtitle={entityLabel}
          onBack={onBack}
          backLabel={t(I18N.common.back)}
          sticky={false}
        />
      ) : null}

      {/* In normal flow, not floating over the canvas: as an overlay it sat on
          top of whichever node happened to be near the top of the viewport. */}
      {showScopeFilters && onScopeChange ? (
        <Box sx={{ borderBottom: '1px solid', borderColor: BORDER, flexShrink: 0 }}>
          <ScopeFilterBar
            scope={scope}
            onChange={onScopeChange}
            filters={scopeFilters}
            disabled={readOnly}
          />
        </Box>
      ) : null}

      <Box flex={1} minHeight={0} position="relative">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={EDGE_TYPES}
          onNodesChange={readOnly ? undefined : handleNodesChange}
          onNodeDragStop={readOnly ? undefined : handleNodeDragStop}
          onNodeClick={readOnly ? handleNodeClick : undefined}
          onMoveEnd={handleMoveEnd}
          nodesDraggable={!readOnly}
          nodesConnectable={false}
          elementsSelectable={!readOnly}
          panOnScroll
          zoomOnScroll={false}
          minZoom={0.3}
          maxZoom={2}
          /**
           * Frame the graph on mount rather than restoring the persisted
           * viewport.
           *
           * A viewport is an absolute pan/zoom captured against whatever canvas
           * size the author happened to have. Replaying it on a different window
           * — or after this screen's own chrome changed height — reliably put
           * half the flow outside the visible area, which is what it was doing.
           * The viewport is still recorded on pan so the saved graph round-trips
           * unchanged; it just no longer decides the opening shot.
           */
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1, minZoom: 0.4 }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: FLOW_COLORS.edge, strokeWidth: 1.5 },
          }}
          proOptions={{ hideAttribution: true }}
          // Deleting with the keyboard while a sidebar is open would remove the
          // node behind the drawer.
          deleteKeyCode={graph.sidebar.isOpen || readOnly ? [] : ['Backspace', 'Delete']}
        >
          {/* Only worth the pixels once the flow outgrows one screen. */}
          {graph.nodes.length > MINIMAP_MIN_NODES ? (
            <MiniMap
              pannable
              zoomable
              position="top-right"
              style={{ marginTop: 64 }}
              nodeColor={minimapNodeColor}
              maskColor="rgba(31, 33, 37, 0.06)"
            />
          ) : null}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color={FLOW_COLORS.canvasDots}
            style={{ backgroundColor: FLOW_COLORS.canvasBackground }}
          />
        </ReactFlow>

        {!readOnly && graph.nodes.length === 1 ? (
          <Box
            position="absolute"
            top={12}
            left={16}
            zIndex={4}
            display="flex"
            alignItems="center"
            gap={1.5}
            flexWrap="wrap"
            maxWidth="calc(100% - 96px)"
          >
            <Typography type="s5" color={TEXT_SUBTLE}>
              {t(I18N.node.startHint)}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CriteriaIcon fontSize="small" />}
              onClick={() => openCriteriaSidebar(graph.nodes[0].id)}
            >
              {t(I18N.node.addCriteria)}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ActionIcon fontSize="small" />}
              onClick={() => openActionSidebar(graph.nodes[0].id)}
            >
              {t(I18N.node.addAction)}
            </Button>
          </Box>
        ) : null}

        {readOnly ? (
          <Box position="absolute" top={12} left={16} zIndex={4}>
            <Typography type="s5" color={TEXT_SUBTLE}>
              {t(I18N.node.viewHint)}
            </Typography>
          </Box>
        ) : null}

        <Box position="absolute" top={12} right={16} zIndex={4} display="flex" gap={1}>
          {SHOW_TEST_RUN ? (
            <Button variant="outlined" size="small" onClick={openTestRun}>
              {t(I18N.node.testRun)}
            </Button>
          ) : null}
          {readOnly ? null : (
            <HistoryControls
              canUndo={graph.canUndo}
              canRedo={graph.canRedo}
              onUndo={undo}
              onRedo={redo}
              undoLabel={t(I18N.node.undo)}
              redoLabel={t(I18N.node.redo)}
            />
          )}
        </Box>

        {graph.nodes.length > 1 ? (
          <Box
            position="absolute"
            bottom={24}
            left={16}
            zIndex={4}
            display="flex"
            flexDirection="column"
            gap={0.5}
          >
            {graph.nodes.some((node) => node.type === 'criteria') ? (
              <Legend text={t(I18N.node.legendCriteria)} />
            ) : null}
            {graph.nodes.some((node) => node.type === 'action') ? (
              <Legend text={t(I18N.node.legendAction)} />
            ) : null}
          </Box>
        ) : null}

        <Box position="absolute" bottom={24} right={16} zIndex={4}>
          <ZoomControls />
        </Box>
      </Box>

      {SHOW_TEST_RUN ? (
        <TestRunDrawer
          isOpen={isTestRunOpen}
          onClose={closeTestRun}
          graph={testRunGraph}
          entityType={entityType}
        />
      ) : null}

      <TriggerSidebar
        isOpen={graph.sidebar.isOpen && graph.sidebar.kind === 'trigger'}
        nodeId={graph.sidebar.nodeId}
        nodeData={graph.activeNodeData as TriggerNodeData | null}
        onClose={graph.closeSidebar}
        onSave={handleSaveTrigger}
        entityType={entityType}
        module={moduleContext.module}
        readOnly={readOnly}
      />

      <CriteriaSidebar
        isOpen={graph.sidebar.isOpen && graph.sidebar.kind === 'criteria'}
        nodeId={graph.sidebar.nodeId}
        parentNodeId={graph.sidebar.parentNodeId}
        nodeData={graph.activeNodeData as CriteriaNodeData | null}
        onClose={graph.closeSidebar}
        onSave={handleSaveCriteria}
        entityType={entityType}
        readOnly={readOnly}
      />

      <ActionSidebar
        isOpen={graph.sidebar.isOpen && graph.sidebar.kind === 'action'}
        nodeId={graph.sidebar.nodeId}
        parentNodeId={graph.sidebar.parentNodeId}
        /**
         * Either a dedicated action node or a Pass/Fail branch — the
         * sidebar edits both, and a branch carries `action` alongside its
         * `resultType`. Casting to `ActionNodeData` alone hid that.
         */
        nodeData={graph.activeNodeData as (ActionNodeData & Partial<ResultNodeData>) | null}
        onClose={graph.closeSidebar}
        onSave={handleSaveAction}
        module={moduleContext.module}
        scope={scope}
        readOnly={readOnly}
      />

      {readOnly ? null : (
        <ConfirmModal
          open={Boolean(graph.pendingDeleteId)}
          onClose={graph.cancelDelete}
          onConfirm={handleConfirmDelete}
          title={t(I18N.common.delete)}
          description={t(I18N.common.deleteMessage)}
        />
      )}
    </Box>
  );
};

/**
 * The workflow canvas.
 *
 * Presentation only: all graph mutation lives in `useWorkflowGraph`, and the
 * component is fully controlled through `initialGraph` / `onChange`, so it can
 * be embedded in any form — the original read and wrote react-hook-form state
 * directly from inside the canvas.
 *
 * Loaded lazily by the views, since @xyflow/react is the package's single
 * largest dependency and the dashboard never needs it.
 */
export const WorkflowBuilder = (props: WorkflowBuilderProps) => (
  <ReactFlowProvider>
    <BuilderCanvas {...props} />
  </ReactFlowProvider>
);
