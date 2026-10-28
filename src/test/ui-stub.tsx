import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { Button as MuiButton } from '@mui/material';
import type { ButtonProps } from '@mui/material';

/**
 * Plain stand-ins for the `src/ui` boundary, which re-exports the host-supplied
 * `@erpsquad/common` (not installed here). Use inside `vi.mock('.../ui', ...)`.
 */
const Icon = () => null;

type ConfirmProps = {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onClose: () => void;
  buttonTexts?: { confirm?: string; cancel?: string };
};

export const uiStub = {
  // The design-system button takes `loading`; MUI's does not know the prop.
  Button: ({ loading, ...props }: ButtonProps & { loading?: boolean }) => (
    <MuiButton {...props} disabled={props.disabled || Boolean(loading)} />
  ),
  Chip: ({ label }: { label?: ReactNode }) => <span>{label}</span>,
  ConfirmModal: ({ open, title, description, onConfirm, onClose, buttonTexts }: ConfirmProps) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <p>{description}</p>
        <button type="button" onClick={onConfirm}>
          {buttonTexts?.confirm ?? 'Confirm'}
        </button>
        <button type="button" onClick={onClose}>
          {buttonTexts?.cancel ?? 'Cancel'}
        </button>
      </div>
    ) : null,
  TextField: forwardRef<HTMLInputElement, Record<string, unknown>>(
    ({ value, onChange, onBlur, name, placeholder, id, disabled }, ref) => (
      <input
        ref={ref}
        id={id as string}
        name={name as string}
        value={(value as string) ?? ''}
        placeholder={placeholder as string}
        disabled={Boolean(disabled)}
        onChange={onChange as never}
        onBlur={onBlur as never}
      />
    ),
  ),
  DynamicModal: () => null,
  Modal: () => null,
  SearchableSelect: () => <div data-testid="searchable-select" />,
  Checkbox: () => null,
  ActionIcon: Icon,
  CriteriaIcon: Icon,
  ShareIcon: Icon,
  TrashIcon: Icon,
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Typography: ({ children, role }: { children?: ReactNode; role?: string }) => (
    <span role={role}>{children}</span>
  ),
  ValueField: ({ label, children }: { label: string; children?: ReactNode }) => (
    <div>
      <span>{label}</span>
      <span>{children}</span>
    </div>
  ),
};
