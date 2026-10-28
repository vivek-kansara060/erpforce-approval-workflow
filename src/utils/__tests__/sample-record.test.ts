import { describe, expect, it } from 'vitest';
import { buildSampleRecord } from '../sample-record';
import type { WorkflowGraph } from '../../types/graph';

const graphOf = (...conditions: Array<Record<string, unknown>>): WorkflowGraph => ({
  nodes: [
    {
      id: 'c',
      type: 'criteria',
      position: { x: 0, y: 0 },
      data: { label: 'c', conditions: conditions as never },
    },
  ],
  edges: [],
});

describe('buildSampleRecord', () => {
  it('seeds each field the criteria read with the value it compares against', () => {
    const record = buildSampleRecord(
      graphOf({ condition_type: 'operator', field: 'total_amount', operator: '>', value: 1000 }),
      'purchase_orders',
    );
    expect(record).toEqual({ total_amount: 1000 });
  });

  it('drops the editor\'s entity prefix and nests dotted paths', () => {
    const record = buildSampleRecord(
      graphOf(
        { condition_type: 'operator', field: 'purchase_orders.total', operator: '>', value: 5 },
        { condition_type: 'operator', field: 'purchase_orders.vendor.name', operator: '=', value: 'A' },
      ),
      'purchase_orders',
    );
    expect(record).toEqual({ total: 5, vendor: { name: 'A' } });
  });

  it('puts another entity\'s fields under that entity, and aggregates as rows', () => {
    const record = buildSampleRecord(
      graphOf(
        { condition_type: 'operator', entity_type: 'vendors', field: 'rating', operator: '>', value: 3 },
        {
          condition_type: 'aggregate',
          entity_type: 'items',
          field: 'amount',
          aggregate_function: 'sum',
          operator: '>',
          value: 100,
        },
      ),
      'purchase_orders',
    );
    expect(record).toEqual({ vendors: { rating: 3 }, items: [{ amount: 100 }] });
  });

  it('keeps the first value when two conditions read the same field', () => {
    const record = buildSampleRecord(
      graphOf(
        { condition_type: 'operator', field: 'total', operator: '>', value: 10 },
        { condition_type: 'operator', field: 'total', operator: '<', value: 99 },
      ),
      'x',
    );
    expect(record).toEqual({ total: 10 });
  });

  it('skips formulas and handles an empty or missing graph', () => {
    expect(
      buildSampleRecord(graphOf({ condition_type: 'formula', expression: 'a + b', value: 1 }), 'x'),
    ).toEqual({});
    expect(buildSampleRecord(null, 'x')).toEqual({});
    expect(buildSampleRecord({ nodes: [], edges: [] }, 'x')).toEqual({});
  });
});
