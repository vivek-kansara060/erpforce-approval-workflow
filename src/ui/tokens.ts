/**
 * Design tokens.
 *
 * Every surface, border, radius and muted text colour the package paints goes
 * through this file, so the whole feature reads as one screen instead of a
 * dozen components each inventing their own grey.
 *
 * The colour values are *theme palette paths*, not literals: MUI's system
 * resolves `borderColor: 'theme.secondary.200'` against
 * `palette.theme.secondary[200]`, which is the ERP neutral ramp. A host that
 * re-themes the ERP therefore re-themes the package for free.
 */

/** Page and card background. The feature is deliberately flat white. */
export const SURFACE = '#FFFFFF';

/** Default hairline: the theme's lightest neutral. */
export const BORDER = 'theme.secondary.200';

/** Hairline for controls that must read as interactive (inputs, chips). */
export const BORDER_STRONG = 'theme.secondary.300';

/** Recessed background: search fields, stat pills, the canvas. */
export const FILL_SUBTLE = 'theme.secondary.100';
export const FILL_MUTED = 'theme.secondary.200';

/** Text ramp. */
export const TEXT_STRONG = 'theme.secondary.1000';
export const TEXT_BODY = 'theme.secondary.900';
export const TEXT_MUTED = 'theme.secondary.800';
export const TEXT_SUBTLE = 'theme.secondary.700';
export const TEXT_DANGER = 'theme.error.600';

/** Accent used for the active/primary affordances. */
export const ACCENT = 'theme.primary.800';
export const ACCENT_HOVER = 'theme.primary.600';
export const ACCENT_SOFT = 'theme.primary.100';

/** `borderRadius` multipliers — MUI's shape unit is 4px. */
export const RADIUS = {
  /** 6px — inputs, small pills. */
  control: 1.5,
  /** 8px — cards, drawers, panels. */
  card: 2,
  /** 12px — canvas nodes, floating bars. */
  raised: 3,
  /** Fully round. */
  pill: 999,
} as const;

/** The only two shadows in the package. */
export const SHADOW = {
  /** Floating bars over the canvas. */
  raised: '0px 1px 2px rgba(31, 33, 37, 0.04), 0px 4px 12px rgba(31, 33, 37, 0.06)',
  /** A sticky header once content scrolls under it. */
  header: '0px 1px 0px rgba(31, 33, 37, 0.04)',
} as const;

/** Hover state of a destructive icon button (delete node, stage, condition). */
export const DANGER_HOVER = { bgcolor: 'theme.error.100', color: 'theme.error.600' } as const;

/** Quiet icon button that turns red on hover. */
export const dangerIconButtonSx = {
  color: TEXT_SUBTLE,
  borderRadius: RADIUS.control,
  '&:hover': DANGER_HOVER,
} as const;

/** Horizontal page gutter, shared by header and body so they line up. */
export const PAGE_GUTTER = { xs: 2, md: 3 } as const;

/** White panel with the theme hairline around it. */
export const cardSx = {
  bgcolor: SURFACE,
  border: '1px solid',
  borderColor: BORDER,
  borderRadius: RADIUS.card,
} as const;

/**
 * ERP search field: recessed fill, no outline, icon leading.
 *
 * Matches `SearchBar` in @erpsquad/common. It is reproduced here rather than
 * imported because the package's toolbar owns its own debounce and controlled
 * value, which that component does not expose.
 *
 * Note the doubled `&&`. The ERP mounts MUI on a `prepend: true` emotion cache,
 * so every emotion style — `sx` included — is injected *above* the app's
 * stylesheet and loses any specificity tie with it. `.MuiTextField-root
 * .MuiOutlinedInput-root` there hard-sets padding and a fieldset border, which
 * a plain `&` cannot clear. Anything in this package that reaches into a MUI
 * internal class needs the same treatment.
 */
export const searchFieldSx = {
  '&& .MuiOutlinedInput-root': {
    bgcolor: FILL_MUTED,
    borderRadius: RADIUS.control,
    pl: 1.25,
    pr: 0.5,
    fontSize: '0.875rem',
    transition: 'box-shadow 120ms ease, background-color 120ms ease',
    '&:hover': { bgcolor: FILL_SUBTLE },
    '&.Mui-focused': {
      bgcolor: SURFACE,
      boxShadow: '0 0 0 1px rgba(46, 178, 115, 0.45)',
    },
  },
  '&& .MuiOutlinedInput-root fieldset': { border: 'none' },
  '&& .MuiOutlinedInput-input': { py: 0.875, px: 0.5 },
} as const;

/**
 * Outlined button carrying a visible border.
 *
 * The ERP's outlined button is borderless with a shadow, declared at
 * `.MuiButton-root.MuiButton-outlined`, so a dashed "add another" affordance has
 * to out-specify it — see the note on `searchFieldSx` for why `&&` is required.
 */
export const outlinedBorderSx = (style: 'solid' | 'dashed') =>
  ({
    '&&.MuiButton-outlined': {
      border: `1px ${style}`,
      borderColor: BORDER,
      bgcolor: SURFACE,
      boxShadow: 'none',
      '&:hover': { borderColor: ACCENT_HOVER, bgcolor: ACCENT_SOFT },
    },
  }) as const;
