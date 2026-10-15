import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Collapse, IconButton } from '@mui/material';
import { ExpandMoreIcon } from '../../ui/icons';
import { Typography } from '../../ui';
import {
  BORDER,
  RADIUS,
  SURFACE,
  TEXT_DANGER,
  TEXT_STRONG,
  TEXT_SUBTLE,
  cardSx,
} from '../../ui/tokens';

export interface SectionCardProps {
  /** Omit for a bare panel with no header strip. */
  title?: ReactNode;
  description?: ReactNode;
  required?: boolean;
  /** Small square icon tile rendered before the title. */
  icon?: ReactNode;
  /** Right-hand controls in the header strip. */
  actions?: ReactNode;
  children: ReactNode;
  /** Remove the body padding, e.g. when the child is a full-bleed table. */
  disableBodyPadding?: boolean;
  /** Add a expand/collapse toggle to the header. @default false */
  collapsible?: boolean;
  /** Only meaningful with `collapsible`. @default true */
  defaultExpanded?: boolean;
}

/**
 * A white panel with the theme's neutral hairline, an optional header strip and
 * a padded body.
 *
 * Replaces the mixture of bare `Accordion`s, naked `Divider`s and unbounded
 * `Grid`s the screens used before, none of which gave the content an edge.
 * `collapsible` keeps the fold/unfold affordance those accordions had, without
 * their full-bleed 2px summary rule.
 */
export const SectionCard = ({
  title,
  description,
  required = false,
  icon,
  actions,
  children,
  disableBodyPadding = false,
  collapsible = false,
  defaultExpanded = true,
}: SectionCardProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const expanded = collapsible ? isExpanded : true;

  const body = <Box sx={disableBodyPadding ? undefined : { px: 2.5, py: 2 }}>{children}</Box>;

  return (
    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
      {title ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
            px: 2.5,
            py: 1.25,
            bgcolor: SURFACE,
            ...(expanded ? { borderBottom: '1px solid', borderColor: BORDER } : null),
          }}
        >
          <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
            {icon ? (
              <Box
                aria-hidden
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  borderRadius: RADIUS.control,
                  border: '1px solid',
                  borderColor: BORDER,
                  color: TEXT_SUBTLE,
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
            ) : null}

            <Box minWidth={0}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <Typography type="s3" weight="bold" color={TEXT_STRONG}>
                  {title}
                </Typography>
                {required ? (
                  <Typography type="s3" weight="bold" color={TEXT_DANGER}>
                    *
                  </Typography>
                ) : null}
              </Box>
              {description ? (
                <Typography type="s5" color={TEXT_SUBTLE}>
                  {description}
                </Typography>
              ) : null}
            </Box>
          </Box>

          {actions || collapsible ? (
            <Box display="flex" alignItems="center" gap={1}>
              {actions}
              {collapsible ? (
                <IconButton
                  size="small"
                  aria-expanded={expanded}
                  aria-label={String(title)}
                  onClick={() => setIsExpanded((previous) => !previous)}
                  sx={{
                    color: TEXT_SUBTLE,
                    borderRadius: RADIUS.control,
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 160ms ease',
                  }}
                >
                  <ExpandMoreIcon fontSize="small" />
                </IconButton>
              ) : null}
            </Box>
          ) : null}
        </Box>
      ) : null}

      {collapsible ? <Collapse in={expanded}>{body}</Collapse> : body}
    </Box>
  );
};
