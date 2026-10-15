/**
 * Semantic tone -> dot, text and fill.
 *
 * Shared by the status chips and the approval timeline so a status reads in
 * the same colour wherever it appears. Internal: not re-exported.
 */
export const STATUS_TONES = {
  positive: { dot: 'theme.primary.800', text: 'theme.primary.1000', fill: 'theme.primary.100' },
  negative: { dot: 'theme.error.500', text: 'theme.error.700', fill: 'theme.error.100' },
  neutral: { dot: 'theme.secondary.500', text: 'theme.secondary.900', fill: 'theme.secondary.200' },
  progress: {
    dot: 'theme.tertiary5.800',
    text: 'theme.tertiary5.1000',
    fill: 'theme.tertiary5.100',
  },
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

/**
 * Maps a server status string to a tone.
 *
 * Matched case-insensitively on a substring because the approvals API returns
 * both `Approved` and `Partially Approved` for the same outcome family.
 */
export const toneForStatus = (status: string): StatusTone => {
  const value = status.toLowerCase();
  if (value.includes('reject') || value.includes('cancel') || value.includes('decline')) {
    return 'negative';
  }
  if (value.includes('approve') || value.includes('complete')) return 'positive';
  if (value.includes('pending') || value.includes('progress') || value.includes('await')) {
    return 'progress';
  }
  return 'neutral';
};
