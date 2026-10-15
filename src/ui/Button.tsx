import { forwardRef } from 'react';
import type { ComponentProps } from 'react';
import CommonButton from '@erpsquad/common/components/button';
import { TEXT_STRONG } from './tokens';

type CommonButtonProps = ComponentProps<typeof CommonButton>;

/**
 * The design-system button, with outlined buttons rendered in black text.
 *
 * The ERP theme paints `.MuiButton-outlined` text in the primary green; the
 * `&&` out-specifies it (see the note on `searchFieldSx`). Caller `sx` is
 * spread last so a screen can still override the colour.
 */
export const Button = forwardRef<HTMLButtonElement, CommonButtonProps>(
  ({ sx, ...props }, ref) => (
    <CommonButton
      ref={ref}
      {...props}
      sx={
        props.variant === 'outlined'
          ? { '&&.MuiButton-outlined': { color: TEXT_STRONG }, ...sx }
          : sx
      }
    />
  ),
);
Button.displayName = 'Button';
