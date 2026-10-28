import { memo, useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { TextField, Typography } from '../../../ui';
import {
  BORDER,
  FILL_SUBTLE,
  RADIUS,
  TEXT_DANGER,
  TEXT_STRONG,
  TEXT_SUBTLE,
} from '../../../ui/tokens';
import { SidebarShell } from './SidebarShell';
import { FormField } from '../../layout';
import { I18N } from '../../../constants/i18n-keys';
import { transformGraphForApi } from '../../../utils/graph-transform';
import { buildSampleRecord } from '../../../utils/sample-record';
import { useSimulateWorkflow } from '../../../hooks/useWorkflow';
import {
  useApprovalWorkflowConfig,
  useNotifyError,
  useTranslate,
} from '../../../providers/useApprovalWorkflowConfig';
import type { SimulationResult, SimulationStep } from '../../../types/workflow';
import type { WorkflowGraph } from '../../../types/graph';

export interface TestRunDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** The graph as it stands now, saved or not. */
  graph: WorkflowGraph;
  entityType: string;
}

const OUTCOME_COPY = {
  approval: I18N.node.testRunApproval,
  'no-approval': I18N.node.testRunNoApproval,
  incomplete: I18N.node.testRunIncomplete,
  'no-trigger': I18N.node.testRunNoTrigger,
} as const;

const show = (value: unknown): string =>
  value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');

const monoSx = { '& textarea': { fontFamily: 'monospace', fontSize: 13 } };

/**
 * Try a sample request against the flow, before any real request meets it.
 *
 * The server walks the graph exactly as the engine would, with the sample in
 * place of a stored record, and reports each step: every criteria with the value
 * it was given and the value it expected, then the approval the request reaches.
 * It is a dry run: nothing is created, saved or sent, and an unsaved draft can be
 * tried because the graph itself is what is sent.
 */
export const TestRunDrawer = memo(({ isOpen, onClose, graph, entityType }: TestRunDrawerProps) => {
  const t = useTranslate();
  const { moduleContext } = useApprovalWorkflowConfig();
  const notifyError = useNotifyError();
  const { mutate, isLoading } = useSimulateWorkflow(notifyError);

  const [sample, setSample] = useState('');
  const [parseError, setParseError] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  // A fresh sample, seeded from the flow as it is now, each time the drawer opens.
  useEffect(() => {
    if (!isOpen) return;
    setSample(JSON.stringify(buildSampleRecord(graph, entityType), null, 2));
    setParseError(false);
    setResult(null);
    // Seeded on open only: re-seeding on every graph change would overwrite edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const run = useCallback(async () => {
    let entityData: Record<string, unknown>;
    try {
      const parsed = JSON.parse(sample || '{}');
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not an object');
      }
      entityData = parsed as Record<string, unknown>;
    } catch {
      setParseError(true);
      return;
    }

    setParseError(false);
    const response = await mutate({
      graph: transformGraphForApi(graph),
      entityData,
      entityType,
      module: moduleContext.module,
    });
    if (response) setResult(response);
  }, [sample, mutate, graph, entityType, moduleContext.module]);

  const names = (list: string[] | undefined) => (list && list.length ? list.join(', ') : '');

  const renderStep = (step: SimulationStep, index: number) => (
    <Box
      key={step.action_id}
      sx={{
        border: '1px solid',
        borderColor: BORDER,
        borderRadius: RADIUS.card,
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
      }}
    >
      <Typography type="s4" weight="bold" color={TEXT_STRONG}>
        {`${index + 1}. ${step.name}`}
      </Typography>

      {step.type === 'criteria' ? (
        <>
          {step.error ? (
            <Typography type="s5" color={TEXT_DANGER} role="alert">
              {step.error}
            </Typography>
          ) : (
            <>
              <Typography type="s5" weight="medium" color={TEXT_STRONG}>
                {t(step.passed ? I18N.node.testRunMet : I18N.node.testRunNotMet)}
              </Typography>
              {(step.conditions ?? []).map((condition, position) => (
                <Typography key={position} type="s5" color={TEXT_SUBTLE}>
                  {`${condition.field ?? ''} ${condition.operator ?? ''} ${show(condition.expected)} (${t(I18N.node.testRunGot)} ${show(condition.actual)})`}
                </Typography>
              ))}
            </>
          )}
        </>
      ) : null}

      {step.type === 'approval' ? (
        <>
          <Typography type="s5" weight="medium" color={TEXT_STRONG}>
            {t(I18N.node.testRunApprovalStep)}
            {step.approver?.approver_type ? ` · ${String(step.approver.approver_type)}` : ''}
          </Typography>
          {names(step.next_level) ? (
            <Typography type="s5" color={TEXT_SUBTLE}>
              {`${t(I18N.node.testRunThen)}: ${names(step.next_level)}`}
            </Typography>
          ) : null}
          {names(step.after_approval) ? (
            <Typography type="s5" color={TEXT_SUBTLE}>
              {`${t(I18N.node.testRunAfterApproval)}: ${names(step.after_approval)}`}
            </Typography>
          ) : null}
          {names(step.after_rejection) ? (
            <Typography type="s5" color={TEXT_SUBTLE}>
              {`${t(I18N.node.testRunAfterRejection)}: ${names(step.after_rejection)}`}
            </Typography>
          ) : null}
        </>
      ) : null}
    </Box>
  );

  return (
    <SidebarShell
      isOpen={isOpen}
      onClose={onClose}
      onSave={run}
      saveDisabled={isLoading}
      title={t(I18N.node.testRun)}
      subtitle={t(I18N.node.testRunSubtitle)}
      saveLabel={t(I18N.node.testRunRun)}
      cancelLabel={t(I18N.node.detailsClose)}
    >
      <FormField label={t(I18N.node.testRunSample)} htmlFor="test-run-sample">
        <TextField
          id="test-run-sample"
          size="small"
          fullWidth
          multiline
          rows={10}
          value={sample}
          error={parseError}
          onChange={(event: { target: { value: string } }) => {
            setSample(event.target.value);
            setParseError(false);
          }}
          sx={monoSx}
        />
        <Typography
          type="s5"
          color={parseError ? TEXT_DANGER : TEXT_SUBTLE}
          role={parseError ? 'alert' : undefined}
        >
          {parseError ? t(I18N.node.testRunInvalid) : t(I18N.node.testRunSampleHint)}
        </Typography>
      </FormField>

      {result ? (
        <Box display="flex" flexDirection="column" gap={1.25}>
          <Typography type="s4" weight="bold" color={TEXT_STRONG}>
            {t(I18N.node.testRunResult)}
          </Typography>
          <Box sx={{ bgcolor: FILL_SUBTLE, borderRadius: RADIUS.card, p: 1.5 }}>
            <Typography type="s4" weight="medium" color={TEXT_STRONG}>
              {t(OUTCOME_COPY[result.outcome])}
            </Typography>
          </Box>
          {result.steps.length === 0 ? (
            <Typography type="s5" color={TEXT_SUBTLE}>
              {t(I18N.node.testRunNothing)}
            </Typography>
          ) : (
            result.steps.map(renderStep)
          )}
        </Box>
      ) : null}
    </SidebarShell>
  );
});
TestRunDrawer.displayName = 'TestRunDrawer';
