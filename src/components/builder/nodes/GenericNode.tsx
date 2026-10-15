import { memo } from 'react';
import type { ElementType } from 'react';
import { Box, IconButton } from '@mui/material';
import { Handle, Position } from '@xyflow/react';
import { ActionIcon, CriteriaIcon, Tooltip, TrashIcon, Typography } from '../../../ui';
import { FLOW_COLORS, RESULT_BRANCH_PRESENTATION } from '../../../constants/defaults';
import type { ResultBranch } from '../../../constants/defaults';
import {
  BORDER,
  DANGER_HOVER,
  RADIUS,
  SHADOW,
  SURFACE,
  TEXT_STRONG,
  TEXT_SUBTLE,
} from '../../../ui/tokens';
import type { FlowNodeData } from '../flow-types';

export interface GenericNodeProps {
  id: string;
  data: FlowNodeData;
  /** `criteria` and `action` render two source handles (pass / fail). */
  branching?: boolean;
  /**
   * `ElementType` rather than a narrow `ComponentType`: the icons come from
   * both MUI (`OverridableComponent`) and the ERP icon set, which have
   * incompatible prop signatures.
   */
  icon?: ElementType;
  /**
   * Tints the card as a Pass or Fail branch. Left unset the card is the neutral
   * white tile every other node type uses.
   */
  tone?: ResultBranch;
  readOnly?: boolean;
  /** Labels for the hover toolbar, already translated. */
  labels?: { addCriteria: string; addAction: string; delete: string };
}

const DEFAULT_LABELS = {
  addCriteria: 'Add criteria',
  addAction: 'Add action',
  delete: 'Delete node',
};

const HANDLE_SIZE = 9;

const handleStyle = (background: string) => ({
  background,
  width: HANDLE_SIZE,
  height: HANDLE_SIZE,
  border: `2px solid ${SURFACE}`,
  boxShadow: '0 0 0 1px rgba(31, 33, 37, 0.08)',
});

const toolbarButtonSx = {
  width: 26,
  height: 26,
  borderRadius: RADIUS.control,
  color: TEXT_SUBTLE,
  '&:hover': { bgcolor: 'theme.secondary.200', color: TEXT_STRONG },
};

/**
 * The one node renderer.
 *
 * Trigger, criteria, action and result nodes differ only by icon, handles and
 * whether a toolbar is shown, so they share this component rather than each
 * re-implementing the card, the handles and the toolbar as the original did.
 *
 * The card is a white tile with the theme hairline; the per-node toolbar is a
 * floating pill that only materialises on hover or keyboard focus, so a busy
 * canvas is not covered in always-on icon rows.
 */
const GenericNodeComponent = ({
  id,
  data,
  branching = false,
  icon: Icon,
  tone,
  readOnly = false,
  labels = DEFAULT_LABELS,
}: GenericNodeProps) => {
  const parentNodeId = data.parentNodeId as string | undefined;
  const resultType = (data.resultType ?? data.type) as 'pass' | 'fail' | undefined;

  const targetHandleColor =
    resultType === 'pass'
      ? FLOW_COLORS.passHandle
      : resultType === 'fail'
        ? FLOW_COLORS.failHandle
        : FLOW_COLORS.neutralHandle;

  // A tinted branch keeps its own colour on hover and focus; swapping to the
  // primary green would make a Fail tile read as a passing one mid-interaction.
  const presentation = tone ? RESULT_BRANCH_PRESENTATION[tone] : undefined;

  return (
    <Box
      className="approval-workflow--Node"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        '&:hover .approval-workflow--NodeToolbar, &:focus-within .approval-workflow--NodeToolbar': {
          opacity: 1,
          pointerEvents: 'auto',
          transform: 'translateY(0)',
        },
      }}
    >
      {!readOnly && (
        <Box
          className="approval-workflow--NodeToolbar"
          sx={{
            display: 'flex',
            gap: 0.25,
            mb: 0.75,
            p: 0.375,
            bgcolor: SURFACE,
            border: '1px solid',
            borderColor: BORDER,
            borderRadius: RADIUS.pill,
            boxShadow: SHADOW.raised,
            opacity: 0,
            pointerEvents: 'none',
            transform: 'translateY(4px)',
            transition: 'opacity 140ms ease, transform 140ms ease',
          }}
        >
          <Tooltip title={labels.addCriteria} arrow placement="top">
            <IconButton
              size="small"
              aria-label={labels.addCriteria}
              sx={toolbarButtonSx}
              onClick={(event) => {
                event.stopPropagation();
                data.onAddCriteria?.(id);
              }}
            >
              <CriteriaIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={labels.addAction} arrow placement="top">
            <IconButton
              size="small"
              aria-label={labels.addAction}
              sx={toolbarButtonSx}
              onClick={(event) => {
                event.stopPropagation();
                data.onAddAction?.(id);
              }}
            >
              <ActionIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {parentNodeId ? (
            <Tooltip title={labels.delete} arrow placement="top">
              <IconButton
                size="small"
                aria-label={labels.delete}
                sx={{
                  ...toolbarButtonSx,
                  '&:hover': DANGER_HOVER,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onDelete?.(id);
                }}
              >
                <TrashIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      )}

      <Box
        role={readOnly ? undefined : 'button'}
        tabIndex={readOnly ? undefined : 0}
        aria-label={String(data.label ?? '')}
        onClick={() => !readOnly && data.onEdit?.(id)}
        onKeyDown={(event) => {
          if (readOnly) return;
          if (event.key === 'Enter' || event.key === ' ') data.onEdit?.(id);
        }}
        sx={{
          border: '1px solid',
          borderColor: presentation?.borderColor ?? BORDER,
          borderRadius: RADIUS.raised,
          bgcolor: presentation?.backgroundColor ?? SURFACE,
          boxShadow: SHADOW.raised,
          color: presentation?.color ?? TEXT_SUBTLE,
          width: 96,
          height: 96,
          cursor: readOnly ? 'default' : 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 140ms ease, box-shadow 140ms ease, color 140ms ease',
          '&:hover':
            readOnly || presentation
              ? undefined
              : { borderColor: 'theme.primary.600', color: 'theme.primary.800' },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: presentation?.borderColor ?? 'theme.primary.700',
            outlineOffset: 2,
          },
        }}
      >
        {branching ? (
          <>
            <Handle
              type="source"
              position={Position.Right}
              id="pass"
              style={{ ...handleStyle(FLOW_COLORS.passHandle), top: '50%' }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id="fail"
              style={{ ...handleStyle(FLOW_COLORS.failHandle), top: '50%' }}
            />
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Right}
            style={handleStyle(FLOW_COLORS.neutralHandle)}
          />
        )}

        {parentNodeId ? (
          <Handle
            type="target"
            position={Position.Left}
            style={handleStyle(targetHandleColor)}
          />
        ) : null}

        {Icon ? <Icon style={{ fontSize: '2.25rem' }} /> : null}
      </Box>

      <Box mt={1} maxWidth={148} textAlign="center">
        <Typography type="s4" weight="medium" color={TEXT_STRONG}>
          {String(data.label ?? '')}
        </Typography>
      </Box>
    </Box>
  );
};

export const GenericNode = memo(GenericNodeComponent);
GenericNode.displayName = 'GenericNode';
