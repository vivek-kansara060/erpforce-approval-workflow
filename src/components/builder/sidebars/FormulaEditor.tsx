import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, TextField as MuiTextField } from '@mui/material';
import { BackspaceOutlinedIcon } from '../../../ui/icons';
import { Button, SearchableSelect, Typography } from '../../../ui';
import {
  ACCENT,
  ACCENT_SOFT,
  BORDER,
  FILL_SUBTLE,
  RADIUS,
  SURFACE,
  TEXT_STRONG,
  TEXT_SUBTLE,
  outlinedBorderSx,
} from '../../../ui/tokens';
import { ARITHMETIC_OPERATORS } from '../../../constants/options';
import type { SelectOptionGroup } from '../../../types/common';

type TokenType = 'field' | 'operator' | 'number';

interface Token {
  id: string;
  type: TokenType;
  value: string;
  label: string;
}

export interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Grouped entity fields available as operands. */
  fields: Array<SelectOptionGroup<string>>;
  placeholder?: string;
  fieldPlaceholder?: string;
  numberPlaceholder?: string;
  clearLabel?: string;
  disabled?: boolean;
}

const OPERATOR_SET = new Set<string>(ARITHMETIC_OPERATORS);
const SPLIT_PATTERN = /([+\-*/()])|\s+/;

/**
 * Token-based expression builder.
 *
 * Tokens are derived from `value` on every change rather than held in parallel
 * state, so the parent form is the single source of truth — the original kept a
 * local token array that drifted out of sync whenever the expression was reset
 * externally.
 */
export const FormulaEditor = ({
  value,
  onChange,
  fields,
  placeholder = 'Build an expression from fields, operators and numbers',
  fieldPlaceholder = 'Select field',
  numberPlaceholder = 'Value',
  clearLabel = 'Remove last token',
  disabled = false,
}: FormulaEditorProps) => {
  const [numberDraft, setNumberDraft] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const fieldLabels = useMemo(() => {
    const labels = new Map<string, string>();
    for (const group of fields ?? []) {
      for (const option of group.options ?? []) {
        labels.set(String(option.value), option.label);
      }
    }
    return labels;
  }, [fields]);

  const tokens = useMemo<Token[]>(() => {
    if (!value) return [];
    return value
      .split(SPLIT_PATTERN)
      .filter((part): part is string => Boolean(part?.trim()))
      .map((part, index) => {
        const trimmed = part.trim();
        if (fieldLabels.has(trimmed)) {
          return {
            id: `${index}-${trimmed}`,
            type: 'field',
            value: trimmed,
            label: fieldLabels.get(trimmed) as string,
          };
        }
        return {
          id: `${index}-${trimmed}`,
          type: OPERATOR_SET.has(trimmed) ? 'operator' : 'number',
          value: trimmed,
          label: trimmed,
        };
      });
  }, [value, fieldLabels]);

  const append = useCallback(
    (token: string) => {
      onChange([...tokens.map((entry) => entry.value), token].join(' '));
    },
    [tokens, onChange],
  );

  const removeLast = useCallback(() => {
    onChange(
      tokens
        .slice(0, -1)
        .map((entry) => entry.value)
        .join(' '),
    );
  }, [tokens, onChange]);

  const commitNumber = useCallback(() => {
    const trimmed = numberDraft.trim();
    if (!trimmed) return;
    append(trimmed);
    setNumberDraft('');
  }, [numberDraft, append]);

  useEffect(() => {
    if (disabled) setNumberDraft('');
  }, [disabled]);

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: BORDER,
        borderRadius: RADIUS.card,
        bgcolor: FILL_SUBTLE,
        p: 1.5,
      }}
    >
      <Box
        ref={containerRef}
        tabIndex={0}
        role="textbox"
        aria-label={placeholder}
        onKeyDown={(event) => {
          if (event.key === 'Backspace') {
            event.preventDefault();
            removeLast();
          }
        }}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.75,
          minHeight: 44,
          px: 1,
          py: 0.75,
          mb: 1.5,
          borderRadius: RADIUS.control,
          bgcolor: SURFACE,
          border: '1px solid',
          borderColor: BORDER,
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'theme.primary.700',
            outlineOffset: 1,
          },
        }}
      >
        {tokens.length === 0 ? (
          <Typography type="s5" color={TEXT_SUBTLE}>
            {placeholder}
          </Typography>
        ) : (
          tokens.map((token) => (
            <Box
              key={token.id}
              sx={{
                px: token.type === 'operator' ? 0.625 : 1,
                py: 0.25,
                borderRadius: RADIUS.control,
                bgcolor: token.type === 'field' ? ACCENT_SOFT : 'transparent',
                color: token.type === 'field' ? ACCENT : TEXT_STRONG,
                fontWeight: token.type === 'operator' ? 700 : 500,
                fontSize: '0.8125rem',
                lineHeight: 1.6,
              }}
            >
              {token.label}
            </Box>
          ))
        )}

        <Box flex={1} />

        {tokens.length > 0 ? (
          <IconButton
            size="small"
            aria-label={clearLabel}
            onClick={removeLast}
            disabled={disabled}
            sx={{ color: TEXT_SUBTLE, borderRadius: RADIUS.control }}
          >
            <BackspaceOutlinedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>

      <SearchableSelect
        options={fields}
        size="small"
        value=""
        hasParent
        disabled={disabled}
        placeholder={fieldPlaceholder}
        onChange={(event: { target: { value: string } }) => {
          if (event.target.value) append(event.target.value);
        }}
      />

      <Box display="flex" gap={0.5} py={1.5} flexWrap="wrap">
        {ARITHMETIC_OPERATORS.map((operator) => (
          <Button
            key={operator}
            type="button"
            variant="outlined"
            size="small"
            disabled={disabled}
            onClick={() => append(operator)}
            sx={{
              minWidth: 38,
              height: 34,
              p: 0,
              fontWeight: 600,
              ...outlinedBorderSx('solid'),
            }}
          >
            {operator}
          </Button>
        ))}
      </Box>

      <MuiTextField
        size="small"
        fullWidth
        type="number"
        value={numberDraft}
        disabled={disabled}
        placeholder={numberPlaceholder}
        onChange={(event) => setNumberDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitNumber();
          }
        }}
        onBlur={commitNumber}
        sx={{
          bgcolor: SURFACE,
          borderRadius: RADIUS.control,
          '&& .MuiOutlinedInput-notchedOutline': { borderColor: BORDER },
        }}
      />
    </Box>
  );
};
