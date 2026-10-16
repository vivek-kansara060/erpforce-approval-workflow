import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { AddIcon, AccountTreeOutlinedIcon as FlowIcon } from '../../ui/icons';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { Button, ConfirmModal, Typography } from '../../ui';
import { TEXT_DANGER, SURFACE } from '../../ui/tokens';
import { AsyncBoundary, EmptyState, LoadingState } from '../../components/feedback';
import { PageHeader, PageShell, SectionCard } from '../../components/layout';
import { WorkflowSummaryCard } from '../../components/workflow';
import { FlowGuideModal } from '../../components/modals';
import { PermissionGate } from '../../permissions/PermissionGate';
import { I18N } from '../../constants/i18n-keys';
import { WORKFLOW_FIELDS, WORKFLOW_FORM_NAME } from '../../constants/fields';
import {
  DEFAULT_REQUEST_TYPE_KEY,
  createDefaultWorkflowFormValues,
} from '../../constants/defaults';
import { createTranslatedWorkflowSchema } from '../../schemas/workflow.schema';
import { hasScopeSelection } from '../../utils/workflow-payload';
import { findOptionByKey } from '../../utils/option-source';
import { WorkflowDetailsFields } from './WorkflowDetailsFields';
import { useWorkflow, useWorkflowMutations } from '../../hooks/useWorkflow';
import { useEntityCatalogue, useReferenceOptions } from '../../hooks/useWorkflowReferences';
import {
  useApprovalWorkflowConfig,
  useNotifyError,
  useTranslate,
} from '../../providers/useApprovalWorkflowConfig';
import { validateGraph } from '../../utils/graph-transform';
import { isTriggerNode } from '../../types/graph';
import type { ScopeFilterDefinition } from '../../constants/options';
import type { WorkflowGraph } from '../../types/graph';
import type { WorkflowFormValues, WorkflowScope } from '../../types/workflow';

/**
 * @xyflow/react and the whole builder subtree load only when the user actually
 * opens the canvas — the details form is usable while it downloads.
 */
const WorkflowBuilder = lazy(() =>
  import('../../components/builder/WorkflowBuilder').then((module) => ({
    default: module.WorkflowBuilder,
  })),
);

export interface WorkflowFormViewProps {
  mode: 'create' | 'edit';
  /** Workflow to edit, or to copy when `duplicate` is set. */
  workflowId?: string;
  /** Load `workflowId` as a template for a new record. */
  duplicate?: boolean;
  /** Start on the canvas instead of the details form. */
  openBuilder?: boolean;
  scopeFilters?: ScopeFilterDefinition[];
  showScopeFilters?: boolean;
  /** Show the first-run builder tutorial. @default true for `create` */
  showFlowGuide?: boolean;
  flowGuideIllustration?: string;
}

interface FormShape {
  [WORKFLOW_FORM_NAME]: WorkflowFormValues;
}

/** Keeps the form readable on ultra-wide displays. */
const FORM_MAX_WIDTH = 1080;

/**
 * Create and edit screen.
 *
 * One component serves both modes: they differed only in which mutation ran and
 * which breadcrumb showed, yet the original duplicated ~200 lines across
 * `add-approval-workflow` and `edit-approval-workflow`, including two divergent
 * copies of the scope validation.
 */
export const WorkflowFormView = ({
  mode,
  workflowId,
  duplicate = false,
  openBuilder = false,
  scopeFilters,
  showScopeFilters = true,
  showFlowGuide,
  flowGuideIllustration,
}: WorkflowFormViewProps) => {
  const t = useTranslate();
  const { moduleContext, currentUser, routes, navigate, notify, translate } =
    useApprovalWorkflowConfig();
  const { labelOf } = useEntityCatalogue();
  // Served from the shared reference cache — the same response the details form
  // renders, not a second request.
  const { options: requestTypes } = useReferenceOptions('action_type');

  const { workflow, formValues, isLoading, error, refetch } = useWorkflow(workflowId, {
    mode: duplicate ? 'duplicate' : 'edit',
  });

  // A failed save used to do nothing visible: `save` resolves `undefined` and
  // the submit handler simply returned. The user now sees why.
  const notifyError = useNotifyError();
  const { save, isSaving } = useWorkflowMutations({ onError: notifyError });

  const [isBuilderOpen, setIsBuilderOpen] = useState(openBuilder);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [pendingEntityChange, setPendingEntityChange] = useState<string | null>(null);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);
  const [publishAttempted, setPublishAttempted] = useState(false);

  const resolver = useMemo(
    () => yupResolver(createTranslatedWorkflowSchema(translate)),
    [translate],
  );

  const methods = useForm<FormShape>({
    resolver: resolver as never,
    mode: 'onTouched',
    defaultValues: {
      [WORKFLOW_FORM_NAME]: createDefaultWorkflowFormValues(moduleContext.module),
    },
  });

  const { control, handleSubmit, reset, getValues, setValue } = methods;

  // Hydrate once the record arrives. `reset` keeps the form pristine, so the
  // dirty-field checks below reflect the user's edits only.
  // `hydratedId` gates the builder: it reads `initialGraph` once on mount, so
  // mounting it before this reset ran seeded it with an empty graph.
  const [hydratedId, setHydratedId] = useState<string | undefined>();

  useEffect(() => {
    if (!workflowId || isLoading) return;
    reset({ [WORKFLOW_FORM_NAME]: formValues });
    setHydratedId(workflowId);
  }, [workflowId, isLoading, formValues, reset]);

  const isHydrated = !workflowId || hydratedId === workflowId;

  /**
   * Seeds a brand-new workflow from context: the default request type, and the
   * signed-in user's company as the initial canvas scope.
   *
   * Create-only, and each value is seeded once — after any record being
   * duplicated has loaded, and never over a value that is already set. Editing
   * therefore keeps whatever the workflow was saved with, and so does a
   * duplicate that already carries one.
   *
   * Both sources arrive asynchronously and independently (the reference list
   * over HTTP, the company from the host's auth context), so each has its own
   * latch rather than one shared gate — a failed reference call must not also
   * cost the company default.
   *
   * Values are written through the form, so the details fields, the canvas scope
   * bar, validation and the payload all read one source of truth.
   */
  const seeded = useRef({ requestType: false, company: false });

  useEffect(() => {
    if (mode !== 'create' || isLoading) return;

    const latch = seeded.current;
    const current = getValues(WORKFLOW_FORM_NAME);

    if (!latch.requestType && requestTypes.length > 0) {
      latch.requestType = true;
      if (!current?.[WORKFLOW_FIELDS.REQUEST_TYPE]) {
        const preset = findOptionByKey(requestTypes, DEFAULT_REQUEST_TYPE_KEY);
        if (preset) {
          setValue(`${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.REQUEST_TYPE}`, preset.value);
        }
      }
    }

    // A host that does not supply `currentUser.company_id` simply gets no
    // default; the scope bar is still there to pick one, and the save-time
    // `hasScopeSelection` check still refuses an unscoped workflow.
    if (!latch.company && currentUser?.company_id != null) {
      latch.company = true;
      if (!current?.[WORKFLOW_FIELDS.COMPANY_IDS]?.length) {
        setValue(`${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.COMPANY_IDS}`, [currentUser.company_id]);
      }
    }
  }, [mode, isLoading, requestTypes, currentUser?.company_id, getValues, setValue]);

  const [entityType, graph, scopeCompany, scopeLocation, scopeDepartment, scopeGrade, scopeType] =
    useWatch({
      control,
      name: [
        `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.ENTITY_TYPE}`,
        `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.GRAPH}`,
        `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.COMPANY_IDS}`,
        `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.LOCATION_IDS}`,
        `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.DEPARTMENT_IDS}`,
        `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.GRADE_IDS}`,
        `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.EMPLOYMENT_TYPE_IDS}`,
      ],
    });

  const scope = useMemo<WorkflowScope>(
    () => ({
      company_ids: scopeCompany ?? [],
      location_ids: scopeLocation ?? [],
      department_ids: scopeDepartment ?? [],
      grade_ids: scopeGrade ?? [],
      employment_type_ids: scopeType ?? [],
    }),
    [scopeCompany, scopeLocation, scopeDepartment, scopeGrade, scopeType],
  );

  const workflowName = useWatch({
    control,
    name: `${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.NAME}`,
  });

  const handleScopeChange = useCallback(
    (key: keyof WorkflowScope, value: Array<string | number>) => {
      setValue(`${WORKFLOW_FORM_NAME}.${key}`, value, { shouldDirty: true });
    },
    [setValue],
  );

  const handleGraphChange = useCallback(
    (next: WorkflowGraph) => {
      setValue(`${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.GRAPH}`, next, { shouldDirty: true });
    },
    [setValue],
  );

  /**
   * Changing the entity invalidates every criterion built against the old
   * entity's fields, so an existing flow is cleared — with a confirmation.
   */
  useEffect(() => {
    if (!entityType) return;
    const currentGraph = getValues(`${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.GRAPH}`);
    const triggerEntity = currentGraph?.nodes?.find(isTriggerNode)?.data.trigger;

    if (triggerEntity && triggerEntity !== entityType && currentGraph?.nodes?.length) {
      setPendingEntityChange(triggerEntity);
    }
  }, [entityType, getValues]);

  const confirmEntityChange = useCallback(() => {
    setValue(`${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.GRAPH}`, { nodes: [], edges: [] });
    setPendingEntityChange(null);
  }, [setValue]);

  const cancelEntityChange = useCallback(() => {
    if (pendingEntityChange) {
      setValue(`${WORKFLOW_FORM_NAME}.${WORKFLOW_FIELDS.ENTITY_TYPE}`, pendingEntityChange);
    }
    setPendingEntityChange(null);
  }, [pendingEntityChange, setValue]);

  const openBuilderPanel = useCallback(() => {
    setIsBuilderOpen(true);
    const guideEnabled = showFlowGuide ?? mode === 'create';
    if (guideEnabled && !hasSeenGuide) {
      setIsGuideOpen(true);
      setHasSeenGuide(true);
    }
  }, [showFlowGuide, mode, hasSeenGuide]);

  const submit = useCallback(
    async (values: FormShape, status: 'draft' | 'published') => {
      const payload = values[WORKFLOW_FORM_NAME];

      if (!hasScopeSelection(payload)) {
        notify(t(I18N.workflow.scopeRequired), 'error');
        return;
      }

      const saved = await save({
        values: payload,
        mode: mode === 'edit' && payload.id ? 'update' : 'create',
        status,
        skipGraphValidation: status === 'draft',
      });

      if (!saved) return;

      notify(
        t(
          status === 'draft'
            ? I18N.workflow.draftMessage
            : mode === 'edit'
              ? I18N.workflow.updatedMessage
              : I18N.workflow.savedMessage,
        ),
        'success',
      );
      navigate(routes.workflowList);
    },
    [mode, save, notify, t, navigate, routes.workflowList],
  );

  const onPublish = handleSubmit(
    (values) => {
      setPublishAttempted(true);
      return submit(values, 'published');
    },
    () => setPublishAttempted(true),
  );
  const onSaveDraft = useCallback(() => submit(getValues(), 'draft'), [submit, getValues]);

  const canOpenBuilder = Boolean(entityType && workflowName);
  const hasFlow = Boolean(graph?.nodes?.length);

  // Shown beside the section title once there is a flow to judge, or once a
  // publish has been attempted (an empty flow is reported then).
  const graphErrors = useMemo(
    () => (hasFlow || publishAttempted ? validateGraph(graph).errors : []),
    [hasFlow, publishAttempted, graph],
  );

  const headerActions = (
    <>
      <Button
        type="button"
        variant="outlined"
        onClick={() => navigate(routes.workflowList)}
        disabled={isSaving}
      >
        {t(I18N.common.discard)}
      </Button>
      {mode === 'create' ? (
        <Button type="button" variant="outlined" onClick={onSaveDraft} disabled={isSaving}>
          {t(I18N.common.saveAsDraft)}
        </Button>
      ) : null}
      <Button type="submit" variant="contained" loading={isSaving}>
        {t(I18N.common.save)}
      </Button>
    </>
  );

  return (
    <PermissionGate capability={mode === 'create' ? 'workflow.create' : 'workflow.edit'}>
      <AsyncBoundary isLoading={isLoading} error={error} onRetry={refetch} variant="page">
        <FormProvider {...methods}>
          <Box
            component="form"
            onSubmit={onPublish}
            noValidate
            sx={{ bgcolor: SURFACE, minHeight: '100%' }}
          >
            {/* One header, whichever pane is showing. Stacking the screen's
                header above the builder's own cost ~120px of canvas and read
                as two competing titles. */}
            <PageHeader
              title={
                isBuilderOpen
                  ? t(I18N.workflow.builder)
                  : t(mode === 'create' ? I18N.workflow.add : I18N.workflow.edit)
              }
              subtitle={isBuilderOpen ? labelOf(entityType) || undefined : workflow?.series_number}
              onBack={isBuilderOpen ? () => setIsBuilderOpen(false) : undefined}
              backLabel={t(I18N.common.back)}
              actions={headerActions}
            />

            {isBuilderOpen ? (
              !isHydrated ? (
                <LoadingState variant="page" />
              ) : (
                <Suspense fallback={<LoadingState variant="page" />}>
                  <WorkflowBuilder
                    showHeader={false}
                    initialGraph={graph}
                    onChange={handleGraphChange}
                    onBack={() => setIsBuilderOpen(false)}
                    entityType={entityType}
                    entityLabel={labelOf(entityType)}
                    scope={scope}
                    onScopeChange={handleScopeChange}
                    scopeFilters={scopeFilters}
                    showScopeFilters={showScopeFilters}
                  />
                </Suspense>
              )
            ) : (
              <PageShell maxWidth={FORM_MAX_WIDTH}>
                <SectionCard
                  title={t(I18N.workflow.detailsSection)}
                  description={t(I18N.workflow.detailsSectionBody)}
                >
                  <WorkflowDetailsFields
                    entityTypeLocked={mode === 'edit' && workflow?.status === 'published'}
                    seriesNumber={workflow?.series_number}
                  />
                </SectionCard>

                <SectionCard
                  title={t(I18N.workflow.approvalFlow)}
                  description={t(I18N.workflow.approvalFlowBody)}
                  required
                  titleAside={
                    graphErrors.length > 0 ? (
                      <Typography type="s5" color={TEXT_DANGER} role="alert">
                        {graphErrors.join(', ')}
                      </Typography>
                    ) : null
                  }
                  collapsible
                  icon={<FlowIcon fontSize="small" />}
                  actions={
                    hasFlow ? (
                      <Button
                        type="button"
                        variant="outlined"
                        size="small"
                        onClick={openBuilderPanel}
                      >
                        {t(I18N.workflow.openInEditor)}
                      </Button>
                    ) : null
                  }
                  disableBodyPadding={!hasFlow}
                >
                  {hasFlow ? (
                    <WorkflowSummaryCard graph={graph} />
                  ) : (
                    <EmptyState
                      title={t(I18N.workflow.emptyFlowTitle)}
                      description={t(
                        canOpenBuilder
                          ? I18N.workflow.emptyFlowBody
                          : I18N.workflow.flowNeedsDetails,
                      )}
                      icon={<FlowIcon fontSize="medium" />}
                      minHeight={180}
                      action={
                        <Button
                          type="button"
                          variant="contained"
                          startIcon={<AddIcon fontSize="small" />}
                          onClick={openBuilderPanel}
                          disabled={!canOpenBuilder}
                        >
                          {t(I18N.workflow.addFlow)}
                        </Button>
                      }
                    />
                  )}
                </SectionCard>
              </PageShell>
            )}
          </Box>
        </FormProvider>

        <FlowGuideModal
          open={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
          illustration={flowGuideIllustration}
        />

        <ConfirmModal
          open={Boolean(pendingEntityChange)}
          onClose={cancelEntityChange}
          onConfirm={confirmEntityChange}
          title={t(I18N.common.warning)}
          description={t(I18N.workflow.changeCategoryWarning)}
          buttonTexts={{ confirm: t(I18N.common.yes), cancel: t(I18N.common.cancel) }}
        />
      </AsyncBoundary>
    </PermissionGate>
  );
};
