import { useMemo } from 'react';
import { Box } from '@mui/material';
import { OpenInNewIcon } from '../../ui/icons';
import { ActionIcon, Button, CriteriaIcon, ShareIcon, Typography } from '../../ui';
import {
  BORDER,
  FILL_SUBTLE,
  RADIUS,
  SURFACE,
  TEXT_STRONG,
  TEXT_SUBTLE,
} from '../../ui/tokens';
import { summarizeGraph } from '../../utils/graph-transform';
import type { WorkflowGraph } from '../../types/graph';

export interface WorkflowSummaryCardProps {
  graph: WorkflowGraph | null | undefined;
  /** Rendered under the heading when present; already formatted by the caller. */
  createdAtLabel?: string;
  onOpenEditor?: () => void;
  openEditorLabel?: string;
  /** Makes each tile a button that opens the flow, e.g. the read-only canvas. */
  onSelect?: () => void;
  /** Shown under the tiles when the flow has no criteria or actions yet. */
  emptyLabel?: string;
  /** Heading strip. Omit when the card already sits inside a titled section. */
  heading?: string;
  triggersLabel?: string;
  criteriaLabel?: string;
  actionsLabel?: string;
  /** Draw the card's own border. @default false — the caller usually owns it. */
  bordered?: boolean;
}

/**
 * Compact overview of a flow: how many triggers, criteria and actions it has,
 * plus a way into the builder.
 *
 * The counts are tiles rather than text pills — each is a scannable number with
 * its own icon, which is what makes this readable at a glance next to a form.
 */
export const WorkflowSummaryCard = ({
  graph,
  createdAtLabel,
  onOpenEditor,
  openEditorLabel = 'Open in Editor',
  onSelect,
  emptyLabel,
  heading,
  triggersLabel = 'Triggers',
  criteriaLabel = 'Criteria',
  actionsLabel = 'Actions',
  bordered = false,
}: WorkflowSummaryCardProps) => {
  const counts = useMemo(() => summarizeGraph(graph), [graph]);

  const stats = [
    { key: 'triggers', icon: <ShareIcon fontSize="small" />, label: triggersLabel, value: counts.triggers },
    { key: 'criteria', icon: <CriteriaIcon fontSize="small" />, label: criteriaLabel, value: counts.criteria },
    { key: 'actions', icon: <ActionIcon fontSize="small" />, label: actionsLabel, value: counts.actions },
  ];

  return (
    <Box
      sx={{
        bgcolor: SURFACE,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        ...(bordered
          ? { border: '1px solid', borderColor: BORDER, borderRadius: RADIUS.card, p: 2.5 }
          : null),
      }}
    >
      {heading || createdAtLabel || onOpenEditor ? (
        <Box
          display="flex"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          flexDirection={{ xs: 'column', sm: 'row' }}
          gap={1}
        >
          <Box>
            {heading ? (
              <Typography type="s2" weight="bold" color={TEXT_STRONG}>
                {heading}
              </Typography>
            ) : null}
            {createdAtLabel ? (
              <Typography type="s5" color={TEXT_SUBTLE}>
                {createdAtLabel}
              </Typography>
            ) : null}
          </Box>

          {onOpenEditor ? (
            <Button
              variant="outlined"
              size="small"
              endIcon={<OpenInNewIcon fontSize="small" />}
              onClick={onOpenEditor}
            >
              {openEditorLabel}
            </Button>
          ) : null}
        </Box>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 1.5,
        }}
      >
        {stats.map((stat) => (
          <Box
            key={stat.key}
            {...(onSelect
              ? {
                  role: 'button',
                  tabIndex: 0,
                  onClick: onSelect,
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect();
                    }
                  },
                }
              : null)}
            sx={{
              ...(onSelect
                ? {
                    cursor: 'pointer',
                    transition: 'border-color 140ms ease',
                    '&:hover, &:focus-visible': { borderColor: 'theme.primary.600' },
                  }
                : null),
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 1.75,
              py: 1.5,
              border: '1px solid',
              borderColor: BORDER,
              borderRadius: RADIUS.card,
              bgcolor: SURFACE,
            }}
          >
            <Box
              aria-hidden
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: RADIUS.control,
                bgcolor: FILL_SUBTLE,
                border: '1px solid',
                borderColor: BORDER,
                color: TEXT_SUBTLE,
                flexShrink: 0,
              }}
            >
              {stat.icon}
            </Box>

            <Box minWidth={0}>
              <Typography type="s2" weight="bold" color={TEXT_STRONG}>
                {stat.value}
              </Typography>
              <Typography type="s5" color={TEXT_SUBTLE}>
                {stat.label}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {emptyLabel && counts.criteria + counts.actions === 0 ? (
        <Typography type="s4" color={TEXT_SUBTLE}>
          {emptyLabel}
        </Typography>
      ) : null}
    </Box>
  );
};
