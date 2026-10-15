import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { Typography } from '../../ui';
import { TEXT_DANGER, TEXT_MUTED, TEXT_SUBTLE } from '../../ui/tokens';

export interface FormFieldProps {
  label?: ReactNode;
  required?: boolean;
  /** Validation message; renders in the error colour and replaces `hint`. */
  error?: string;
  /** Neutral guidance shown under the control. */
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}

/**
 * Label, control, message — the single field layout used by the form screens
 * and all three builder drawers.
 *
 * The label sits above the control (rather than MUI's floating variant) because
 * that is what every other ERP form does, and the slot is a fixed height so a
 * row of fields aligns whether or not a given field is required.
 */
export const FormField = ({
  label,
  required = false,
  error,
  hint,
  htmlFor,
  children,
}: FormFieldProps) => (
  <Box display="flex" flexDirection="column" gap={0.5} width="100%">
    {label ? (
      <Box component="label" htmlFor={htmlFor} display="flex" alignItems="center" gap={0.375}>
        <Typography type="s5" weight="medium" color={error ? TEXT_DANGER : TEXT_MUTED}>
          {label}
        </Typography>
        {required ? (
          <Typography type="s5" weight="medium" color={TEXT_DANGER}>
            *
          </Typography>
        ) : null}
      </Box>
    ) : null}

    {children}

    {error || hint ? (
      <Typography type="s5" color={error ? TEXT_DANGER : TEXT_SUBTLE}>
        {error || hint}
      </Typography>
    ) : null}
  </Box>
);
