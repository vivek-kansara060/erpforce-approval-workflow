import { useEffect, useState } from 'react';
import { CircularProgress, DialogActions, DialogContent, DialogTitle, IconButton, TextField as MuiTextField } from '@mui/material';
import { CloseIcon } from '../../ui/icons';
import { Button, Modal, Typography } from '../../ui';
import { BORDER, RADIUS, TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';

export interface ApprovalCommentModalProps {
  open: boolean;
  onClose: () => void;
  /** Receives the comment text. Kept as a plain string for adapter compatibility. */
  onConfirm: (comment: string) => void;
  title: string;
  loading?: boolean;
  confirmButtonText?: string;
  confirmButtonColor?: 'success' | 'error' | 'primary' | 'secondary' | 'info' | 'warning';
  commentLabel?: string;
  commentPlaceholder?: string;
  cancelButtonText?: string;
  /** Block confirmation until a comment is entered (common for rejections). */
  requireComment?: boolean;
}

/**
 * Default decision modal: a title, a comment box, confirm and cancel.
 *
 * Used whenever a module adapter does not supply its own modal. The prop shape
 * matches the original `ApprovalCommentModal` exactly, so adapters migrated
 * from the HRMS app keep working unchanged.
 */
export const ApprovalCommentModal = ({
  open,
  onClose,
  onConfirm,
  title,
  loading = false,
  confirmButtonText = 'Confirm',
  confirmButtonColor = 'primary',
  commentLabel = 'Comments',
  commentPlaceholder = 'Enter comments here...',
  cancelButtonText = 'Cancel',
  requireComment = false,
}: ApprovalCommentModalProps) => {
  const [comment, setComment] = useState('');

  // Reset when reopened, so a previous decision's text never leaks into the next.
  useEffect(() => {
    if (open) setComment('');
  }, [open]);

  const handleClose = () => {
    setComment('');
    onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    onConfirm(comment);
  };

  const confirmDisabled = loading || (requireComment && comment.trim().length === 0);

  return (
    <Modal open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle
          sx={{
            m: 0,
            px: 2.5,
            py: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: BORDER,
          }}
        >
          <Typography type="s2" weight="bold" color={TEXT_STRONG}>
            {title}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            size="small"
            sx={{
              color: TEXT_SUBTLE,
              borderRadius: RADIUS.control,
              '&:hover': { bgcolor: 'theme.secondary.200', color: TEXT_STRONG },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 2.5, py: 2.5 }}>
          <Typography type="s5" weight="medium" color={TEXT_SUBTLE} mb={0.75}>
            {commentLabel}
          </Typography>
          <MuiTextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            size="small"
            placeholder={commentPlaceholder}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            required={requireComment}
            sx={{ '&& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER } }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 2.5, py: 2, borderTop: '1px solid', borderColor: BORDER }}>
          <Button onClick={handleClose} variant="outlined" disabled={loading}>
            {cancelButtonText}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={confirmButtonColor}
            disabled={confirmDisabled}
            endIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {confirmButtonText}
          </Button>
        </DialogActions>
      </form>
    </Modal>
  );
};
