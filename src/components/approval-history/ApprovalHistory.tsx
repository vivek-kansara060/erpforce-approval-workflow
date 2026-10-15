import { useCallback, useId, useState } from 'react';
import type { MouseEvent } from 'react';
import { Box, IconButton, Popover } from '@mui/material';
import { CloseIcon, HistoryOutlinedIcon as HistoryIcon } from '../../ui/icons';
import { Button, Typography } from '../../ui';
import { BORDER, RADIUS, SHADOW, SURFACE, TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';
import { ApprovalHistoryPanel } from './ApprovalHistoryPanel';
import { toEntityRef } from '../../utils/approval-history';
import { useTranslate } from '../../providers/useApprovalWorkflowConfig';
import { I18N } from '../../constants/i18n-keys';

export interface ApprovalHistoryProps {
  /** Entity the record belongs to, e.g. `purchase_orders`. */
  entityType: string;
  /**
   * Primary key of the record in its own module. While it is missing (a record
   * that has not been saved yet), the button renders disabled.
   */
  entityId: string | number | null | undefined;
  /** Formats each event's ISO timestamp. Defaults to the user's locale. */
  formatDate?: (iso: string) => string;
  /** Button text. Defaults to the translated "Approval History". */
  label?: string;
  disabled?: boolean;
}

/**
 * "Approval History" button that opens the record's approval trail in a
 * popover: where it stands now, then every submission, each approval level,
 * and what every approver at that level did, with their remarks.
 *
 * Nothing is fetched until the popover opens. Reopening within the provider's
 * `staleTime` is served from cache; after that the cached timeline shows
 * immediately while it refreshes.
 *
 * ```tsx
 * <ApprovalHistory entityType="purchase_orders" entityId={order.id} />
 * ```
 */
export const ApprovalHistory = ({
  entityType,
  entityId,
  formatDate,
  label,
  disabled = false,
}: ApprovalHistoryProps) => {
  const t = useTranslate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const baseId = useId();
  const popoverId = `${baseId}-approval-history`;
  const titleId = `${baseId}-approval-history-title`;

  const open = anchorEl !== null;
  const title = t(I18N.dashboard.history);
  const isDisabled = disabled || toEntityRef(entityType, entityId) === undefined;

  const handleOpen = useCallback(
    (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget),
    [],
  );
  const handleClose = useCallback(() => setAnchorEl(null), []);

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<HistoryIcon fontSize="small" />}
        onClick={handleOpen}
        disabled={isDisabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
      >
        {label ?? title}
      </Button>

      <Popover
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-labelledby': titleId,
            sx: {
              mt: 1,
              width: { xs: 'calc(100vw - 32px)', sm: 440 },
              maxHeight: 'min(640px, calc(100vh - 32px))',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: SURFACE,
              border: '1px solid',
              borderColor: BORDER,
              borderRadius: RADIUS.card,
              boxShadow: SHADOW.raised,
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            pl: 2,
            pr: 1,
            py: 1.25,
            borderBottom: '1px solid',
            borderColor: BORDER,
            flexShrink: 0,
          }}
        >
          <Box id={titleId} minWidth={0}>
            <Typography type="s2" weight="bold" color={TEXT_STRONG}>
              {title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            aria-label={t(I18N.common.close)}
            sx={{ color: TEXT_SUBTLE }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ overflowY: 'auto', overscrollBehavior: 'contain', px: 2, py: 2 }}>
          <ApprovalHistoryPanel
            entityType={entityType}
            entityId={entityId}
            formatDate={formatDate}
          />
        </Box>
      </Popover>
    </>
  );
};
