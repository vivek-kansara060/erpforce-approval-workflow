/**
 * Design-system boundary.
 *
 * Every @erpsquad/common component the package renders is re-exported here and
 * nowhere else. Three reasons:
 *
 * 1. One file to audit when the common library changes, instead of ~40 deep
 *    imports scattered through the components.
 * 2. Deep imports are preserved (`components/button`, not the barrel), so the
 *    host bundler still tree-shakes the common library.
 * 3. A host on a different design system replaces this module alone.
 *
 * Nothing else in `src/` may import `@erpsquad/common` directly.
 */

export { Button } from './Button';
export { default as Typography } from '@erpsquad/common/components/typography';
export { default as Chip } from '@erpsquad/common/components/chip';
export { default as TextField } from '@erpsquad/common/components/text-field';
export { default as Checkbox } from '@erpsquad/common/components/checkbox';
export { default as SearchableSelect } from '@erpsquad/common/components/searchable-select';
export { default as DatePicker } from '@erpsquad/common/components/date-picker';
export { default as Tooltip } from '@erpsquad/common/components/tooltip';
export { default as Modal } from '@erpsquad/common/components/modal';
export { default as DynamicModal } from '@erpsquad/common/components/dynamic-modal';
export { default as ConfirmModal } from '@erpsquad/common/components/confirm-modal';
export { default as Accordion } from '@erpsquad/common/components/accordion';
export { default as ValueField } from '@erpsquad/common/components/value-field';
export { default as FormHeader } from '@erpsquad/common/components/form-header';
export { default as Menu } from '@erpsquad/common/components/menu';
export { default as Fallback } from '@erpsquad/common/components/fallback';
export { default as Footer } from '@erpsquad/common/components/footer';
export { default as ActionBar } from '@erpsquad/common/components/action-bar';
export { default as MaterialTable } from '@erpsquad/common/components/material-table';
export { default as DynamicLayoutWrapper } from '@erpsquad/common/components/dynamic-layout-wrapper';
export { default as ErpLoader } from '@erpsquad/common/components/loaders';
export { default as FormLoader } from '@erpsquad/common/components/loaders/form-loader';
export { default as PageSkeleton } from '@erpsquad/common/components/loaders/page-skeleton';

// Form-builder elements, used by the workflow form so inputs look and behave
// identically to every other ERP form.
export { default as DynamicInput } from '@erpsquad/common/components/form-control/form-builder/form-builder-element/text';
export { default as DynamicToggleButton } from '@erpsquad/common/components/form-control/form-builder/form-builder-element/toggle-button';
export { default as DynamicSearchSelect } from '@erpsquad/common/components/form-control/form-builder/form-builder-element/dynamic-select';

// Icons.
export { default as ShareIcon } from '@erpsquad/common/icons/share';
export { default as CriteriaIcon } from '@erpsquad/common/icons/criteria';
export { default as ActionIcon } from '@erpsquad/common/icons/action';
export { default as TrashIcon } from '@erpsquad/common/icons/trash';
