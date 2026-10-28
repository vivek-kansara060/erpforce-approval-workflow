import { Box, IconButton } from '@mui/material';
import { RedoIcon, UndoIcon } from '../../ui/icons';
import { Tooltip } from '../../ui';
import { BORDER, RADIUS, SHADOW, SURFACE, TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';

export interface HistoryControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoLabel: string;
  redoLabel: string;
}

const buttonSx = {
  width: 32,
  height: 32,
  borderRadius: RADIUS.control,
  color: TEXT_SUBTLE,
  '&:hover': { bgcolor: 'theme.secondary.200', color: TEXT_STRONG },
  '&.Mui-disabled': { opacity: 0.4 },
};

/** Undo / redo, as one floating segment matching the zoom controls. */
export const HistoryControls = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoLabel,
  redoLabel,
}: HistoryControlsProps) => (
  <Box
    sx={{
      display: 'flex',
      gap: 0.25,
      p: 0.5,
      bgcolor: SURFACE,
      border: '1px solid',
      borderColor: BORDER,
      borderRadius: RADIUS.card,
      boxShadow: SHADOW.raised,
    }}
  >
    {/* The span keeps the tooltip working on a disabled button. */}
    <Tooltip title={undoLabel} arrow placement="bottom">
      <span>
        <IconButton aria-label={undoLabel} disabled={!canUndo} onClick={onUndo} sx={buttonSx}>
          <UndoIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
    <Tooltip title={redoLabel} arrow placement="bottom">
      <span>
        <IconButton aria-label={redoLabel} disabled={!canRedo} onClick={onRedo} sx={buttonSx}>
          <RedoIcon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  </Box>
);
