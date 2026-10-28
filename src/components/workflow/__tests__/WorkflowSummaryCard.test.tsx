import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowSummaryCard } from '../WorkflowSummaryCard';
import type { WorkflowGraph } from '../../../types/graph';

vi.mock('../../../ui', async () => (await import('../../../test/ui-stub')).uiStub);

const triggerOnly: WorkflowGraph = {
  nodes: [
    {
      id: 't',
      type: 'trigger',
      position: { x: 0, y: 0 },
      data: { label: 'PO', trigger: 'purchase_orders' },
    },
  ],
  edges: [],
};

describe('WorkflowSummaryCard', () => {
  it('opens the flow from a tile, by click and keyboard', () => {
    const onSelect = vi.fn();
    render(<WorkflowSummaryCard graph={triggerOnly} onSelect={onSelect} />);

    const tiles = screen.getAllByRole('button');
    expect(tiles).toHaveLength(3);

    fireEvent.click(tiles[0]);
    fireEvent.keyDown(tiles[1], { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('renders plain tiles when nothing is selectable', () => {
    render(<WorkflowSummaryCard graph={triggerOnly} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the empty hint only when there are no criteria or actions', () => {
    const { rerender } = render(<WorkflowSummaryCard graph={triggerOnly} emptyLabel="Nothing yet" />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();

    rerender(
      <WorkflowSummaryCard
        emptyLabel="Nothing yet"
        graph={{
          ...triggerOnly,
          nodes: [
            ...triggerOnly.nodes,
            {
              id: 'c',
              type: 'criteria',
              position: { x: 0, y: 0 },
              data: { label: 'c', conditions: [] },
            },
          ],
        }}
      />,
    );
    expect(screen.queryByText('Nothing yet')).not.toBeInTheDocument();
  });
});
