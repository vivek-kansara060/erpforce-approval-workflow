import * as yup from 'yup';
import { WORKFLOW_FIELDS, WORKFLOW_FORM_NAME } from '../constants/fields';
import type { TranslateFn } from '../types/config';

export interface WorkflowSchemaMessages {
  nameRequired: string;
  nameTooShort: string;
  entityTypeRequired: string;
  graphRequired: string;
}

const defaultMessages: WorkflowSchemaMessages = {
  nameRequired: 'Workflow title is required',
  nameTooShort: 'Workflow title must be at least 3 characters',
  entityTypeRequired: 'Request category is required',
  graphRequired: 'At least one approval flow item is required',
};

/**
 * Validation for the workflow form.
 *
 * Messages are injectable so the host's i18n drives them; the original hard-coded
 * English strings inside the schema, which made them impossible to translate.
 */
export const createWorkflowSchema = (
  messages: Partial<WorkflowSchemaMessages> = {},
  options: { requireGraph?: boolean } = {},
) => {
  const copy = { ...defaultMessages, ...messages };
  const { requireGraph = true } = options;

  const graphSchema = yup
    .object()
    .nullable()
    .shape({
      nodes: yup.array().of(yup.object()).default([]),
      edges: yup.array().of(yup.object()).default([]),
    });

  return yup.object({
    [WORKFLOW_FORM_NAME]: yup.object({
      [WORKFLOW_FIELDS.NAME]: yup
        .string()
        .trim()
        .required(copy.nameRequired)
        .min(3, copy.nameTooShort),

      [WORKFLOW_FIELDS.ENTITY_TYPE]: yup
        .string()
        .nullable()
        .required(copy.entityTypeRequired),

      [WORKFLOW_FIELDS.IS_ACTIVE]: yup.boolean(),
      [WORKFLOW_FIELDS.DESCRIPTION]: yup.string().nullable(),

      [WORKFLOW_FIELDS.GRAPH]: requireGraph
        ? graphSchema
            .required(copy.graphRequired)
            .test(
              'has-nodes',
              copy.graphRequired,
              (value) => Array.isArray(value?.nodes) && value.nodes.length > 0,
            )
        : graphSchema,
    }),
  });
};

/** Builds the schema with messages resolved through the host's translator. */
export const createTranslatedWorkflowSchema = (
  translate: TranslateFn,
  options?: { requireGraph?: boolean },
) =>
  createWorkflowSchema(
    {
      nameRequired: translate(
        'approval-work-flow.validation.name_required',
        defaultMessages.nameRequired,
      ),
      nameTooShort: translate(
        'approval-work-flow.validation.name_min',
        defaultMessages.nameTooShort,
      ),
      entityTypeRequired: translate(
        'approval-work-flow.validation.entity_type_required',
        defaultMessages.entityTypeRequired,
      ),
      graphRequired: translate(
        'approval-work-flow.validation.graph_required',
        defaultMessages.graphRequired,
      ),
    },
    options,
  );
