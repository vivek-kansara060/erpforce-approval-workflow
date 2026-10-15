import { memo, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { CheckCircleOutlineIcon as CheckCircleIcon, HighlightOffIcon as CancelIcon } from '../../../ui/icons';
import { GenericNode } from './GenericNode';
import { ActionIcon, CriteriaIcon, ShareIcon } from '../../../ui';
import type { ResultBranch } from '../../../constants/defaults';
import type { FlowNode } from '../flow-types';

type Props = NodeProps<FlowNode> & { readOnly?: boolean };

const TriggerNode = memo(({ id, data }: Props) => (
  <GenericNode id={id} data={data} icon={ShareIcon} readOnly={!data.onEdit} />
));
TriggerNode.displayName = 'TriggerNode';

const CriteriaNode = memo(({ id, data }: Props) => (
  <GenericNode id={id} data={data} icon={CriteriaIcon} branching readOnly={!data.onEdit} />
));
CriteriaNode.displayName = 'CriteriaNode';

const ActionNode = memo(({ id, data }: Props) => (
  <GenericNode id={id} data={data} icon={ActionIcon} branching readOnly={!data.onEdit} />
));
ActionNode.displayName = 'ActionNode';

/**
 * Pass/Fail branch.
 *
 * Older graphs stored the branch under `type` rather than `resultType`, so both
 * are read; anything else is treated as a pass, which is what the label
 * projection in `graph-transform` also does.
 */
const ResultNode = memo(({ id, data }: Props) => {
  const tone: ResultBranch = (data.resultType ?? data.type) === 'fail' ? 'fail' : 'pass';
  const Icon = tone === 'fail' ? CancelIcon : CheckCircleIcon;
  return <GenericNode id={id} data={data} icon={Icon} tone={tone} readOnly={!data.onEdit} />;
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
