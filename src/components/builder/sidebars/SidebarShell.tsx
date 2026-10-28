import type { ReactNode } from 'react';
import { Box, Drawer, IconButton } from '@mui/material';
import { CloseIcon } from '../../../ui/icons';
import { Button, Typography } from '../../../ui';
import { BORDER, RADIUS, SURFACE, TEXT_STRONG, TEXT_SUBTLE } from '../../../ui/tokens';

export interface SidebarShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** Omit for a read-only drawer: the footer then offers only the close button. */
  onSave?: () => void;
  title: string;
  /** One line under the title explaining what the drawer configures. */
  subtitle?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  children: ReactNode;
  saveDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  /** Extra context pill shown above the form, e.g. "When criteria passed". */
  badge?: ReactNode;
}

const DRAWER_WIDTH = 460;

/**
 * Drawer chrome shared by the trigger, criteria and action sidebars: header,
 * scrollable body, sticky footer.
 *
 * The body scrolls independently of the footer, so the save button stays
 * reachable on a long action with several stages — in the original the whole
 * drawer scrolled and the footer could end up below the fold.
 *
 * The footer buttons are right-aligned and sized to their labels rather than
 * stretched to half the drawer each: a 230px-wide "Cancel" reads as the primary
 * action, which is exactly backwards.
 */
export const SidebarShell = ({
  isOpen,
  onClose,
  onSave,
  title,
  subtitle,
  icon,
  iconBgColor = 'theme.tertiary5.100',
  iconColor = 'theme.tertiary5.1000',
  children,
  saveDisabled = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  badge,
}: SidebarShellProps) => (
  <Drawer
    anchor="right"
    variant="temporary"
    open={isOpen}
    onClose={onClose}
    // Keep the form mounted so a user who closes and reopens does not lose
    // half-entered conditions.
    ModalProps={{ keepMounted: true }}
    sx={{
      /**
       * MUI puts a Drawer at `zIndex.drawer` (1200) because the canonical
       * drawer is a side nav that belongs *under* the app bar — and the ERP app
       * bar is `zIndex.drawer + 1`. This is a temporary right-hand editor, so
       * that ordering hid its header behind the host's fixed top bar. Lifted to
       * the modal layer, where it belongs.
       */
      zIndex: (theme) => theme.zIndex.modal,

      /**
       * Styled through the root at doubled specificity, not `PaperProps.sx`.
       *
       * The ERP ships a global `.MuiDrawer-root .MuiDrawer-paper` rule (grey
       * fill, right-hand border, `overflow: visible !important`) for its own
       * side nav, and mounts MUI on a `prepend: true` emotion cache — so every
       * emotion style lands *above* that stylesheet and loses any specificity
       * tie. `&&` clears it; a plain `&` would not.
       */
      '&& .MuiDrawer-paper': {
        width: { xs: '100%', sm: DRAWER_WIDTH },
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SURFACE,
        backgroundImage: 'none',
        border: 'none',
        borderLeft: '1px solid',
        borderColor: BORDER,
        // The same host rule sets `overflow: visible !important`, which lets the
        // drawer body escape the paper instead of scrolling inside it.
        overflow: 'hidden !important',
      },
    }}
  >
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        px: 2.5,
        py: 2,
        borderBottom: '1px solid',
        borderColor: BORDER,
        flexShrink: 0,
      }}
    >
      {icon ? (
        <Box
          aria-hidden
          sx={{
            bgcolor: iconBgColor,
            color: iconColor,
            width: 32,
            height: 32,
            borderRadius: RADIUS.control,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      ) : null}

      <Box flex={1} minWidth={0}>
        <Typography type="s2" weight="bold" color={TEXT_STRONG}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography type="s5" color={TEXT_SUBTLE}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      <IconButton
        aria-label={cancelLabel}
        onClick={onClose}
        size="small"
        sx={{
          color: TEXT_SUBTLE,
          borderRadius: RADIUS.control,
          '&:hover': { bgcolor: 'theme.secondary.200', color: TEXT_STRONG },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>

    <Box
      sx={{
        flex: 1,
        overflowY: 'auto',
        px: 2.5,
        py: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        // The body is a flex column with a fixed height, so without this its
        // children shrink to fit instead of overflowing. Cards with
        // `overflow: hidden` (a stage, a condition) then get squashed and clip
        // their own fields, rather than the body scrolling.
        '& > *': { flexShrink: 0 },
      }}
    >
      {badge}
      {children}
    </Box>

    <Box
      sx={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 1,
        px: 2.5,
        py: 2,
        borderTop: '1px solid',
        borderColor: BORDER,
        bgcolor: SURFACE,
        flexShrink: 0,
      }}
    >
      <Button variant="outlined" onClick={onClose}>
        {cancelLabel}
      </Button>
      {onSave ? (
        <Button variant="contained" onClick={onSave} disabled={saveDisabled}>
          {saveLabel}
        </Button>
      ) : null}
    </Box>
  </Drawer>
);
