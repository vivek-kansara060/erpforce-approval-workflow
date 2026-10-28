import { isRuleComplete } from './condition-transform';
import { isStageComplete, stageToDraft } from './approver-config';
import type { ApproverStage } from '../types/approver';
import type { ConditionRule, CriteriaCondition } from '../types/criteria';
import type { WorkflowNode } from '../types/graph';

/**
 * Something a block still needs before it can do its job.
 *
 * Codes, not sentences: the canvas translates them, and `index` is the 1-based
 * condition or stage number so the message can say which one.
 */
export type NodeIssue =
  | { code: 'no-conditions' }
  | { code: 'condition-incomplete'; index: number }
  | { code: 'no-stages' }
  | { code: 'stage-incomplete'; index: number };

const toRule = (condition: CriteriaCondition): ConditionRule => ({
  id: '',
  field: condition.field ?? '',
  operator: condition.operator,
  value: condition.value,
  condition_type: condition.condition_type,
  aggregate_function: condition.aggregate_function,
  expression: condition.expression,
});

/**
 * What is missing from one block. Display only: it neither blocks saving nor
 * changes the payload, it just lets the canvas say *why* a block is flagged.
 *
 * - criteria: needs at least one condition, and every condition filled in;
 * - action: needs at least one stage, and every stage with an action and an
 *   approver;
 * - Pass/Fail branch: stages are optional, but any that are present must be
 *   complete. An empty branch is a legitimate "do nothing".
 */
export const getNodeIssues = (
  node: Pick<WorkflowNode, 'type' | 'data'>,
  module = '',
): NodeIssue[] => {
  const data = node.data as { conditions?: CriteriaCondition[]; action?: ApproverStage[] };
  const issues: NodeIssue[] = [];

  if (node.type === 'criteria') {
    const conditions = data.conditions ?? [];
    if (conditions.length === 0) return [{ code: 'no-conditions' }];
    conditions.forEach((condition, position) => {
      if (!isRuleComplete(toRule(condition))) {
        issues.push({ code: 'condition-incomplete', index: position + 1 });
      }
    });
    return issues;
  }

  if (node.type === 'trigger') return issues;

  const stages = data.action ?? [];
  if (stages.length === 0) return node.type === 'action' ? [{ code: 'no-stages' }] : issues;

  stages.forEach((stage, position) => {
    if (!isStageComplete(stageToDraft(stage, module))) {
      issues.push({ code: 'stage-incomplete', index: position + 1 });
    }
  });
  return issues;
};
