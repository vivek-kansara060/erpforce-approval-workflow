import type { ReactNode } from 'react';
import { Box, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { CloseIcon } from '../../ui/icons';
import { Modal, Typography } from '../../ui';
import { BORDER, FILL_SUBTLE, RADIUS, TEXT_MUTED, TEXT_STRONG, TEXT_SUBTLE } from '../../ui/tokens';
import { getDetailRows, isPlainObject, isScalar } from '../../utils/entity-data';
import type { DetailRow } from '../../utils/entity-data';

export interface RecordDetailsLabels {
  none: string;
  yes: string;
  no: string;
  empty: string;
  /** Used as the close button's accessible name. */
  close: string;
}

export interface RecordDetailsModalProps {
  open: boolean;
  onClose: () => void;
  /** Modal heading, usually the record's series number. */
  title: string;
  /** Smaller line under the heading, usually the request type. */
  subtitle?: string;
  /** The `entity_type_data` object. */
  data?: unknown;
  labels: RecordDetailsLabels;
}

/** Past this depth, nested data is shown as text rather than nesting cards forever. */
const MAX_DEPTH = 3;

const gridSx = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  columnGap: 2,
  rowGap: 1.5,
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography type="s4" weight="medium" color={TEXT_STRONG}>
      {label}
    </Typography>
    <Typography type="s5" color={TEXT_MUTED} sx={{ wordBreak: 'break-word' }}>
      {children}
    </Typography>
  </Box>
);

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: BORDER,
      borderRadius: RADIUS.control,
      bgcolor: FILL_SUBTLE,
      p: 1.5,
      display: 'flex',
      flexDirection: 'column',
      gap: 1.5,
    }}
  >
    <Typography
      type="s5"
      weight="medium"
      color={TEXT_SUBTLE}
      sx={{ textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 11 }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const isInline = (value: unknown): boolean =>
  isScalar(value) || (Array.isArray(value) && value.every(isScalar));

const inlineText = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : String(value);

/** Rows as one grid of plain fields, then a card for each nested object or list. */
const Rows = ({
  rows,
  labels,
  depth,
}: {
  rows: DetailRow[];
  labels: RecordDetailsLabels;
  depth: number;
}) => {
  const inline = rows.filter((row) => isInline(row.value));
  const nested = rows.filter((row) => !isInline(row.value));

  return (
    <>
      {inline.length > 0 ? (
        <Box sx={gridSx}>
          {inline.map((row) => (
            <Field key={row.key} label={row.label}>
              {inlineText(row.value)}
            </Field>
          ))}
        </Box>
      ) : null}

      {nested.map((row) => (
        <Section key={row.key} title={row.label}>
          <Nested value={row.value} labels={labels} depth={depth + 1} />
        </Section>
      ))}
    </>
  );
};

/** The body of a card: an object's fields, or each item of a list of objects. */
const Nested = ({
  value,
  labels,
  depth,
}: {
  value: unknown;
  labels: RecordDetailsLabels;
  depth: number;
}) => {
  if (depth > MAX_DEPTH) {
    return (
      <Typography type="s5" color={TEXT_MUTED} sx={{ wordBreak: 'break-word' }}>
        {JSON.stringify(value)}
      </Typography>
    );
  }

  if (Array.isArray(value)) {
    return (
      <>
        {value.map((item, index) => (
          <Box key={index} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {isPlainObject(item) ? (
              <Rows rows={getDetailRows(item, labels)} labels={labels} depth={depth} />
            ) : (
              <Typography type="s5" color={TEXT_MUTED}>
                {String(item)}
              </Typography>
            )}
          </Box>
        ))}
      </>
    );
  }

  return <Rows rows={getDetailRows(value, labels)} labels={labels} depth={depth} />;
};

/**
 * Read-only view of a request's `entity_type_data`.
 *
 * Plain values sit in one grid; nested objects and lists each get their own
 * titled card. Nothing here is module-specific: labels come from the keys, so a
 * new module's data shows up without any change.
 */
export const RecordDetailsModal = ({
  open,
  onClose,
  title,
  subtitle,
  data,
  labels,
}: RecordDetailsModalProps) => {
  const rows = getDetailRows(data, labels);

  return (
    <Modal open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          m: 0,
          px: 2,
          py: 1.25,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: BORDER,
        }}
      >
        <Box display="flex" alignItems="center" gap={1} minWidth={0}>
          <Typography type="s2" weight="bold" color={TEXT_STRONG}>
            {title}
          </Typography>
          {subtitle ? (
            <Box
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: RADIUS.control,
                bgcolor: 'theme.primary.100',
                color: 'theme.primary.800',
                whiteSpace: 'nowrap',
              }}
            >
              <Typography type="s5" weight="medium" color="inherit">
                {subtitle}
              </Typography>
            </Box>
          ) : null}
        </Box>
        <IconButton
          aria-label={labels.close}
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
      </DialogTitle>

      <DialogContent sx={{ px: 2, py: 2 }}>
        {rows.length === 0 ? (
          <Typography type="s4" color={TEXT_SUBTLE}>
            {labels.empty}
          </Typography>
        ) : (
          <Box
            sx={{
              border: '1px solid',
              borderColor: BORDER,
              borderRadius: RADIUS.control,
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Rows rows={rows} labels={labels} depth={0} />
          </Box>
        )}
      </DialogContent>
    </Modal>
  );
};
