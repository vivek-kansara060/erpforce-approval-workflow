import type { CriteriaCondition } from '../types/criteria';
import type { WorkflowGraph } from '../types/graph';

type Json = Record<string, unknown>;

/** The saved shape of a field: the editor's `entity.field` loses its entity prefix. */
const bareField = (field: string | undefined): string =>
  field?.includes('.') ? field.split('.').slice(1).join('.') : (field ?? '');

/** Sets `a.b.c` on `target`, creating the objects on the way; never overwrites. */
const setPath = (target: Json, path: string, value: unknown): void => {
  const keys = path.split('.').filter(Boolean);
  if (keys.length === 0) return;

  let cursor = target;
  keys.slice(0, -1).forEach((key) => {
    const next = cursor[key];
    cursor[key] = next && typeof next === 'object' && !Array.isArray(next) ? next : {};
    cursor = cursor[key] as Json;
  });

  const last = keys[keys.length - 1];
  if (!(last in cursor)) cursor[last] = value;
};

/**
 * A starting sample record for a test run: one entry per field the flow's
 * criteria read, set to the value the criteria compares against.
 *
 * Seeding with the criteria's own value means "Run" already gives a verdict, and
 * the user only has to nudge a number to see the other branch. Fields of the
 * workflow's own entity sit at the top; a condition on another entity goes under
 * that entity's name, as an array for an aggregate (which sums or counts rows).
 * Formula conditions are skipped: which fields they read is inside the
 * expression, and the user can add them.
 */
export const buildSampleRecord = (
  graph: WorkflowGraph | null | undefined,
  mainEntity: string,
): Json => {
  const record: Json = {};

  for (const node of graph?.nodes ?? []) {
    if (node.type !== 'criteria') continue;
    const conditions = (node.data as { conditions?: CriteriaCondition[] }).conditions ?? [];

    for (const condition of conditions) {
      const field = bareField(condition.field);
      if (!field) continue;
      const entity = condition.entity_type;
      const isRelated = Boolean(entity && entity !== mainEntity);

      if (condition.condition_type === 'aggregate' && entity) {
        if (!(entity in record)) record[entity] = [{ [field]: condition.value ?? '' }];
      } else if (condition.condition_type === 'formula') {
        continue;
      } else if (isRelated && entity) {
        const related = record[entity];
        const target: Json =
          related && typeof related === 'object' && !Array.isArray(related) ? (related as Json) : {};
        record[entity] = target;
        setPath(target, field, condition.value ?? '');
      } else {
        setPath(record, field, condition.value ?? '');
      }
    }
  }

  return record;
};
