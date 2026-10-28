import { memo } from 'react';
import type { ElementType } from 'react';
import { Box, IconButton } from '@mui/material';
import { Handle, Position } from '@xyflow/react';
import { ActionIcon, CriteriaIcon, Tooltip, TrashIcon, Typography } from '../../../ui';
import { ContentCopyOutlinedIcon } from '../../../ui/icons';
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
  /** No editing affordances: toolbar and connection handles are hidden. */
  readOnly?: boolean;
  /** Keeps the toolbar visible, so it is reachable without hover (touch). */
  selected?: boolean;
  /** Muted line under the label, e.g. "Criteria · 2 conditions". Already translated. */
  subtitle?: string;
  /** Flags a node that still needs configuring; the text is the tooltip. */
  incompleteLabel?: string;
  /** Labels for the hover toolbar, already translated. */
  labels?: { addCriteria: string; addAction: string; duplicate: string; delete: string };
  /** Show the duplicate button: criteria and action blocks only. */
  canDuplicate?: boolean;
}

const DEFAULT_LABELS = {
  addCriteria: 'Add criteria',
  addAction: 'Add action',
  duplicate: 'Duplicate with branches',
  delete: 'Delete node',
};

const HANDLE_SIZE = 9;

const handleStyle = (background: string, hidden = false) => ({
  background,
  // Kept in the DOM when hidden: React Flow anchors edges to the handles.
  ...(hidden ? { opacity: 0, pointerEvents: 'none' as const } : null),
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
  selected = false,
  subtitle,
  incompleteLabel,
  canDuplicate = false,
  labels = DEFAULT_LABELS,
}: GenericNodeProps) => {
  // A view-only canvas still lets a node be opened to inspect it.
  const canInspect = Boolean(data.onEdit);
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
        // The toolbar floats above the card instead of taking a row of its own,
        // so a node is as tall as its card and caption and the canvas can pack
        // rows closer.
        position: 'relative',
        '&:hover .approval-workflow--NodeToolbar, &:focus-within .approval-workflow--NodeToolbar': {
          opacity: 1,
          pointerEvents: 'auto',
          transform: 'translateX(-50%) translateY(0)',
        },
      }}
    >
      {!readOnly && (
        <Box
          className="approval-workflow--NodeToolbar"
          sx={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            zIndex: 2,
            width: 'max-content',
            display: 'flex',
            gap: 0.25,
            mb: 0.75,
            // The toolbar floats above the card with a gap between them. The gap
            // belongs to neither, so the cursor leaving the card on the way up
            // ended the hover, hid the toolbar and made it unclickable. This
            // invisible strip, part of the toolbar, closes the gap.
            '&::after': {
              content: '""',
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              height: 10,
            },
            p: 0.375,
            bgcolor: SURFACE,
            border: '1px solid',
            borderColor: BORDER,
            borderRadius: RADIUS.pill,
            boxShadow: SHADOW.raised,
            opacity: selected ? 1 : 0,
            pointerEvents: selected ? 'auto' : 'none',
            transform: selected
              ? 'translateX(-50%) translateY(0)'
              : 'translateX(-50%) translateY(4px)',
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

          {canDuplicate && data.onDuplicate ? (
            <Tooltip title={labels.duplicate} arrow placement="top">
              <IconButton
                size="small"
                aria-label={labels.duplicate}
                sx={toolbarButtonSx}
                onClick={(event) => {
                  event.stopPropagation();
                  data.onDuplicate?.(id);
                }}
              >
                <ContentCopyOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}

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
        role={canInspect ? 'button' : undefined}
        tabIndex={canInspect ? 0 : undefined}
        aria-label={[data.label, subtitle].filter(Boolean).join(', ')}
        onClick={() => data.onEdit?.(id)}
        onKeyDown={(event) => {
          if (!canInspect) return;
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
          cursor: canInspect ? 'pointer' : 'default',
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
              style={{ ...handleStyle(FLOW_COLORS.passHandle, readOnly), top: '35%' }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id="fail"
              style={{ ...handleStyle(FLOW_COLORS.failHandle, readOnly), top: '65%' }}
            />
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Right}
            style={handleStyle(FLOW_COLORS.neutralHandle, readOnly)}
          />
        )}

        {parentNodeId ? (
          <Handle
            type="target"
            position={Position.Left}
            style={handleStyle(targetHandleColor, readOnly)}
          />
        ) : null}

        {Icon ? <Icon style={{ fontSize: '2.25rem' }} /> : null}

        {incompleteLabel ? (
          <Tooltip title={incompleteLabel} arrow placement="top">
            <Box
              role="img"
              aria-label={incompleteLabel}
              sx={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: '50%',
                bgcolor: 'theme.warning.500',
                color: SURFACE,
                border: '2px solid',
                borderColor: SURFACE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              !
            </Box>
          </Tooltip>
        ) : null}
      </Box>

      <Box mt={1} maxWidth={120} textAlign="center">
        <Typography type="s4" weight="medium" color={TEXT_STRONG}>
          {String(data.label ?? '')}
        </Typography>
        {subtitle ? (
          <Typography type="s5" color={TEXT_SUBTLE}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export const GenericNode = memo(GenericNodeComponent);
GenericNode.displayName = 'GenericNode';
