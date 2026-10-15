import { Avatar, Box } from '@mui/material';
import { PersonOutlineOutlinedIcon as PersonIcon } from '../../ui/icons';
import { Tooltip, Typography } from '../../ui';
import { FILL_MUTED, RADIUS, TEXT_BODY, TEXT_SUBTLE } from '../../ui/tokens';
import { STATUS_TONES } from '../workflow/status-tone';
import type { StatusTone } from '../workflow/status-tone';

/** Compact status label: tinted fill, coloured dot, short text. */
export const StatusPill = ({ label, tone }: { label: string; tone: StatusTone }) => {
  const { dot, text, fill } = STATUS_TONES[tone];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.875,
        py: 0.125,
        borderRadius: RADIUS.pill,
        bgcolor: fill,
        color: text,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: dot }}
      />
      <Typography type="s5" weight="medium" color="inherit">
        {label}
      </Typography>
    </Box>
  );
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/** Initials avatar; a person glyph when the name is unknown. */
export const PersonAvatar = ({ name, size = 28 }: { name: string | undefined; size?: number }) => (
  <Avatar
    aria-hidden
    sx={{
      width: size,
      height: size,
      fontSize: Math.round(size * 0.4),
      fontWeight: 600,
      bgcolor: FILL_MUTED,
      color: TEXT_BODY,
      flexShrink: 0,
    }}
  >
    {name ? initialsOf(name) : <PersonIcon sx={{ fontSize: Math.round(size * 0.6) }} />}
  </Avatar>
);

export interface TimestampFormat {
  /** Short text shown inline: "2 hours ago", or the date once it is a week old. */
  label: string;
  /** Full date and time, shown on hover. */
  full: string;
}

/** A formatted time with the full value on hover. Renders nothing without a value. */
export const Timestamp = ({ value }: { value: TimestampFormat | undefined }) =>
  value ? (
    <Tooltip title={value.full} placement="top" arrow>
      <Box component="span" sx={{ flexShrink: 0, whiteSpace: 'nowrap', cursor: 'default' }}>
        <Typography type="s5" color={TEXT_SUBTLE}>
          {value.label}
        </Typography>
      </Box>
    </Tooltip>
  ) : null;
