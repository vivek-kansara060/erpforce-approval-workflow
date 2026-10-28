import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import {
  CheckCircleOutlineIcon as CheckCircleIcon,
  HighlightOffIcon as CancelIcon,
} from '../../../ui/icons';
import { GenericNode } from './GenericNode';
import { ActionIcon, CriteriaIcon, ShareIcon } from '../../../ui';
import type { ResultBranch } from '../../../constants/defaults';
import { I18N } from '../../../constants/i18n-keys';
import {
  useApprovalWorkflowConfig,
  useTranslate,
} from '../../../providers/useApprovalWorkflowConfig';
import { getNodeIssues } from '../../../utils/node-validation';
import type { FlowNode } from '../flow-types';

type Props = NodeProps<FlowNode> & { readOnly?: boolean };

const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

/**
 * Text under a node's label: what it is and how much it holds. Derived from
 * data already on the node, so it costs no request; returns a primitive so the
 * memoised node only re-renders when the text actually changes.
 */
export const useNodeSubtitle = (
  kind: 'trigger' | 'criteria' | 'action' | 'result',
  data: FlowNode['data'],
): string => {
  const t = useTranslate();
  const plural = (n: number, one: Parameters<typeof t>[0], many: Parameters<typeof t>[0]) =>
    `${n} ${t(n === 1 ? one : many)}`;

  switch (kind) {
    case 'trigger':
      return t(I18N.node.trigger);
    case 'criteria':
      return [
        t(I18N.node.criteria),
        plural(count(data.conditions), I18N.node.condition, I18N.node.conditions),
      ].join(' · ');
    case 'action':
      return [
        t(I18N.node.action),
        plural(count(data.action), I18N.node.stage, I18N.node.stages),
      ].join(' · ');
    default: {
      // Under an action a Pass/Fail pair is the approval outcome; the backend
      // runs the Fail side when a round is rejected.
      const isFail = (data.resultType ?? data.type) === 'fail';
      const caption =
        data.parentType === 'action' ? t(isFail ? I18N.node.onRejected : I18N.node.onApproved) : '';
      const stages = count(data.action);
      return [caption, stages ? plural(stages, I18N.node.stage, I18N.node.stages) : '']
        .filter(Boolean)
        .join(' · ');
    }
  }
};

/** Toolbar and tooltip text, translated once per language change. */
const useNodeLabels = () => {
  const t = useTranslate();
  return useMemo(
    () => ({
      addCriteria: t(I18N.node.addCriteria),
      addAction: t(I18N.node.addAction),
      duplicate: t(I18N.node.duplicateNode),
      delete: t(I18N.node.deleteNode),
    }),
    [t],
  );
};

/**
 * Why a block is flagged, as one tooltip line per issue (first three, then a
 * count). Computed from the block's own data, so it recalculates only when that
 * changes. Shown while editing only: someone reading a saved flow is not being
 * asked to fix it.
 */
const useIssuesLabel = (
  type: Parameters<typeof getNodeIssues>[0]['type'],
  data: FlowNode['data'],
): string | undefined => {
  const t = useTranslate();
  const { moduleContext } = useApprovalWorkflowConfig();
  const editing = Boolean(data.onAddCriteria);

  return useMemo(() => {
    if (!editing) return undefined;
    const issues = getNodeIssues(
      { type, data } as Parameters<typeof getNodeIssues>[0],
      moduleContext.module,
    );
    if (issues.length === 0) return undefined;

    const lines = issues.slice(0, 3).map((issue) => {
      switch (issue.code) {
        case 'no-conditions':
          return t(I18N.node.issueNoConditions);
        case 'no-stages':
          return t(I18N.node.issueNoStages);
        case 'condition-incomplete':
          return `${t(I18N.node.condition)} ${issue.index}: ${t(I18N.node.issueCondition)}`;
        default:
          return `${t(I18N.node.stage)} ${issue.index}: ${t(I18N.node.issueStage)}`;
      }
    });
    if (issues.length > 3) lines.push(`+${issues.length - 3}`);
    return lines.join(' · ');
    // `data` carries callbacks too; only the parts that decide validity matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, type, data.conditions, data.action, moduleContext.module, t]);
};

/** Editing affordances (toolbar, handles) exist only when the canvas can edit. */
const isReadOnly = (data: FlowNode['data']) => !data.onAddCriteria;

const TriggerNode = memo(({ id, data, selected }: Props) => (
  <GenericNode
    id={id}
    data={data}
    icon={ShareIcon}
    readOnly={isReadOnly(data)}
    selected={selected}
    subtitle={useNodeSubtitle('trigger', data)}
    labels={useNodeLabels()}
  />
));
TriggerNode.displayName = 'TriggerNode';

const CriteriaNode = memo(({ id, data, selected }: Props) => (
  <GenericNode
    id={id}
    data={data}
    icon={CriteriaIcon}
    branching
    canDuplicate
    readOnly={isReadOnly(data)}
    selected={selected}
    subtitle={useNodeSubtitle('criteria', data)}
    labels={useNodeLabels()}
    incompleteLabel={useIssuesLabel('criteria', data)}
  />
));
CriteriaNode.displayName = 'CriteriaNode';

const ActionNode = memo(({ id, data, selected }: Props) => (
  <GenericNode
    id={id}
    data={data}
    icon={ActionIcon}
    branching
    canDuplicate
    readOnly={isReadOnly(data)}
    selected={selected}
    subtitle={useNodeSubtitle('action', data)}
    labels={useNodeLabels()}
    incompleteLabel={useIssuesLabel('action', data)}
  />
));
ActionNode.displayName = 'ActionNode';

/**
 * Pass/Fail branch.
 *
 * Older graphs stored the branch under `type` rather than `resultType`, so both
 * are read; anything else is treated as a pass, which is what the label
 * projection in `graph-transform` also does.
 */
const ResultNode = memo(({ id, data, selected }: Props) => {
  const tone: ResultBranch = (data.resultType ?? data.type) === 'fail' ? 'fail' : 'pass';
  const Icon = tone === 'fail' ? CancelIcon : CheckCircleIcon;
  return (
    <GenericNode
      id={id}
      data={data}
      icon={Icon}
      tone={tone}
      readOnly={isReadOnly(data)}
      selected={selected}
      subtitle={useNodeSubtitle('result', data)}
      incompleteLabel={useIssuesLabel('criteriaResult', data)}
      labels={useNodeLabels()}
    />
  );
});
ResultNode.displayName = 'ResultNode';

/**
 * React Flow's `nodeTypes` map.
 *
 * It must be referentially stable — React Flow remounts every node when the map
 * identity changes, which is what made the original canvas flicker and lose
 * focus on each parent render. `createNodeTypes` returns a frozen module-level
 * constant, and `useNodeTypes` hands the same object to every consumer.
 */
const NODE_TYPES = Object.freeze({
  trigger: TriggerNode,
  criteria: CriteriaNode,
  criteriaResult: ResultNode,
  action: ActionNode,
  actionResult: ResultNode,
  // Legacy node types found in graphs saved by earlier versions.
  pass: ResultNode,
  fail: ResultNode,
});

export type WorkflowNodeTypes = typeof NODE_TYPES;

export const useNodeTypes = (): WorkflowNodeTypes => useMemo(() => NODE_TYPES, []);

export { NODE_TYPES, TriggerNode, CriteriaNode, ActionNode, ResultNode };
