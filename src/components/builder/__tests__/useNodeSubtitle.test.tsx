import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNodeSubtitle } from '../nodes/nodeTypes';
import type { FlowNodeData } from '../flow-types';
import { Wrapper } from '../../../test/provider-wrapper';

vi.mock('../../../ui', async () => (await import('../../../test/ui-stub')).uiStub);

const subtitle = (kind: Parameters<typeof useNodeSubtitle>[0], data: Record<string, unknown>) =>
  renderHook(() => useNodeSubtitle(kind, data as FlowNodeData), { wrapper: Wrapper }).result
    .current;

describe('useNodeSubtitle', () => {
  it('names a trigger', () => {
    expect(subtitle('trigger', { label: 'PO', trigger: 'purchase_orders' })).toBe('Trigger');
  });

  it('counts a criteria node conditions, singular and plural', () => {
    expect(subtitle('criteria', { label: 'c', conditions: [{}] })).toBe('Criteria · 1 condition');
    expect(subtitle('criteria', { label: 'c', conditions: [{}, {}] })).toBe(
      'Criteria · 2 conditions',
    );
  });

  it('counts an action node stages', () => {
    expect(subtitle('action', { label: 'a', action: [{}, {}, {}] })).toBe('Action · 3 stages');
  });

  it('reads a branch under an action as the approval outcome', () => {
    expect(
      subtitle('result', { label: 'Pass', resultType: 'pass', parentType: 'action' }),
    ).toBe('On approved');
    expect(
      subtitle('result', { label: 'Fail', resultType: 'fail', parentType: 'action' }),
    ).toBe('On rejected');
  });

  it('leaves a branch under a criteria uncaptioned, but shows its stages', () => {
    expect(subtitle('result', { label: 'Pass', resultType: 'pass', parentType: 'criteria' })).toBe(
      '',
    );
    expect(
      subtitle('result', {
        label: 'Pass',
        resultType: 'pass',
        parentType: 'criteria',
        action: [{}],
      }),
    ).toBe('1 stage');
  });
});
