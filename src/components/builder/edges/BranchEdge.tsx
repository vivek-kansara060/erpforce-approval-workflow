import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, Position, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { FLOW_COLORS, RESULT_BRANCH_PRESENTATION } from '../../../constants/defaults';

/**
 * Edge with an optional pill label, used for the pass/fail branches.
 *
 * `getBezierPath` is called with fixed Right -> Left positions because the
 * layout is always left-to-right; letting React Flow infer them produced the
 * looping edges visible in the original builder.
 */
const BranchEdgeComponent = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  style,
  markerEnd,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  });

  const stroke = (style?.stroke as string | undefined) ?? FLOW_COLORS.edge;
  const presentation =
    stroke === FLOW_COLORS.fail
      ? RESULT_BRANCH_PRESENTATION.fail
      : RESULT_BRANCH_PRESENTATION.pass;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: presentation.backgroundColor,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1.4,
              letterSpacing: '0.01em',
              color: stroke,
              border: 'none',
              boxShadow: '0 1px 2px rgba(31, 33, 37, 0.08)',
              pointerEvents: 'all',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

export const BranchEdge = memo(BranchEdgeComponent);
BranchEdge.displayName = 'BranchEdge';

/** Stable `edgeTypes` map; see the note in nodeTypes.tsx. */
export const EDGE_TYPES = Object.freeze({ smoothstep: BranchEdge });
