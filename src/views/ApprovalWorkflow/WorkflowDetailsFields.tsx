import { useMemo } from 'react';
import { Grid } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { SearchableSelect, TextField } from '../../ui';
import { FormField } from '../../components/layout';
import { I18N } from '../../constants/i18n-keys';
import { WORKFLOW_FIELDS, WORKFLOW_FORM_NAME } from '../../constants/fields';
import { useTranslate } from '../../providers/useApprovalWorkflowConfig';
import { useEntityCatalogue, useReferenceOptions } from '../../hooks/useWorkflowReferences';
import type { SelectOption } from '../../types/common';

export interface WorkflowDetailsFieldsProps {
  /** Locked once a workflow is published, to protect running approvals. */
  entityTypeLocked?: boolean;
  seriesNumber?: string;
}

const field = (name: string) => `${WORKFLOW_FORM_NAME}.${name}` as const;

/** Every control on this form is the same height, whatever renders it. */
const CONTROL_SIZE = 'small' as const;

/**
 * The workflow's descriptive fields.
 *
 * Bound through `Controller` rather than the ERP form-builder elements so the
 * package does not depend on a particular field-array naming convention — the
 * form name is a package constant and the host never has to match it.
 *
 * Laid out on a 12-column grid in two columns at `sm` and up: identity on the
 * left, classification on the right, description across the full width.
 */
export const WorkflowDetailsFields = ({
  entityTypeLocked = false,
  seriesNumber,
}: WorkflowDetailsFieldsProps) => {
  const t = useTranslate();
  const { control, formState, watch } = useFormContext();
  const entityType = watch(field(WORKFLOW_FIELDS.ENTITY_TYPE)) as string | undefined;
  const { catalogue, isLoading: isCatalogueLoading } = useEntityCatalogue({
    selectedValue: entityType,
  });
  const { options: requestTypes } = useReferenceOptions('action_type');

  const statusOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'true', label: t(I18N.workflow.active) },
      { value: 'false', label: t(I18N.workflow.inactive) },
    ],
    [t],
  );

  const errors = (formState.errors?.[WORKFLOW_FORM_NAME] ?? {}) as Record<
    string,
    { message?: string } | undefined
  >;

  return (
    <Grid container columnSpacing={3} rowSpacing={2}>
      <Grid item xs={12} sm={6}>
        <FormField label={t(I18N.fields.id)} htmlFor="workflow-series-number">
          <TextField
            id="workflow-series-number"
            size={CONTROL_SIZE}
            fullWidth
            disabled
            value={seriesNumber ?? ''}
            placeholder="—"
          />
        </FormField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormField
          label={t(I18N.fields.name)}
          required
          htmlFor="workflow-name"
          error={errors[WORKFLOW_FIELDS.NAME]?.message}
        >
          <Controller
            name={field(WORKFLOW_FIELDS.NAME)}
            control={control as Control}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                id="workflow-name"
                size={CONTROL_SIZE}
                fullWidth
                placeholder={t(I18N.placeholders.name)}
                error={Boolean(errors[WORKFLOW_FIELDS.NAME])}
              />
            )}
          />
        </FormField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormField
          label={t(I18N.fields.entityType)}
          required
          error={errors[WORKFLOW_FIELDS.ENTITY_TYPE]?.message}
        >
          <Controller
            name={field(WORKFLOW_FIELDS.ENTITY_TYPE)}
            control={control as Control}
            render={({ field: controllerField }) => (
              <SearchableSelect
                options={catalogue}
                size={CONTROL_SIZE}
                value={controllerField.value ?? ''}
                disabled={entityTypeLocked || isCatalogueLoading}
                error={Boolean(errors[WORKFLOW_FIELDS.ENTITY_TYPE])}
                onChange={(event: { target: { value: string } }) =>
                  controllerField.onChange(event.target.value)
                }
                placeholder={t(I18N.placeholders.entityType)}
              />
            )}
          />
        </FormField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormField label={t(I18N.fields.requestType)}>
          <Controller
            name={field(WORKFLOW_FIELDS.REQUEST_TYPE)}
            control={control as Control}
            render={({ field: controllerField }) => (
              <SearchableSelect
                options={requestTypes}
                size={CONTROL_SIZE}
                value={controllerField.value ?? ''}
                onChange={(event: { target: { value: string } }) =>
                  controllerField.onChange(event.target.value)
                }
                placeholder={t(I18N.placeholders.requestType)}
              />
            )}
          />
        </FormField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormField label={t(I18N.fields.status)}>
          <Controller
            name={field(WORKFLOW_FIELDS.IS_ACTIVE)}
            control={control as Control}
            render={({ field: controllerField }) => (
              <SearchableSelect
                options={statusOptions}
                size={CONTROL_SIZE}
                showCancelButton={false}
                value={String(Boolean(controllerField.value))}
                onChange={(event: { target: { value: string } }) =>
                  controllerField.onChange(event.target.value === 'true')
                }
              />
            )}
          />
        </FormField>
      </Grid>

      <Grid item xs={12}>
        <FormField label={t(I18N.fields.description)} htmlFor="workflow-description">
          <Controller
            name={field(WORKFLOW_FIELDS.DESCRIPTION)}
            control={control as Control}
            render={({ field: controllerField }) => (
              <TextField
                {...controllerField}
                id="workflow-description"
                value={controllerField.value ?? ''}
                size={CONTROL_SIZE}
                fullWidth
                multiline
                rows={3}
                placeholder={t(I18N.placeholders.description)}
              />
            )}
          />
        </FormField>
      </Grid>
    </Grid>
  );
};
