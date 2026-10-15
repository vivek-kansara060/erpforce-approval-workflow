import { useMemo, useState } from 'react';
import { Box, Divider, Grid } from '@mui/material';
import {
  ActionIcon,
  CriteriaIcon,
  DynamicModal,
  ShareIcon,
  Typography,
} from '../../ui';
import {
  ACCENT,
  ACCENT_SOFT,
  BORDER,
  RADIUS,
  TEXT_STRONG,
  TEXT_SUBTLE,
} from '../../ui/tokens';

interface GuideStep {
  key: 'trigger' | 'criteria' | 'action';
  name: string;
  question: string;
  answer: string;
}

const STEPS: GuideStep[] = [
  {
    key: 'trigger',
    name: 'Trigger',
    question: 'What are Triggers?',
    answer:
      'A Trigger is an event or condition that starts the workflow. It watches for a specific change in the system, such as a record being created or a status being updated.',
  },
  {
    key: 'criteria',
    name: 'Criteria',
    question: 'What are Criteria?',
    answer:
      'Criteria are the conditions that decide whether the workflow continues after the trigger fires. They keep the automation from running on records that do not match your rules.',
  },
  {
    key: 'action',
    name: 'Actions',
    question: 'What are Actions?',
    answer:
      'Actions are what happens once the trigger has fired and the criteria are met — routing the record to an approver, notifying a team, or updating a field.',
  },
];

const ICONS: Record<GuideStep['key'], typeof ShareIcon> = {
  trigger: ShareIcon,
  criteria: CriteriaIcon,
  action: ActionIcon,
};

export interface FlowGuideModalProps {
  open: boolean;
  onClose?: () => void;
  /** Optional illustration; the package ships no image assets of its own. */
  illustration?: string;
  skipLabel?: string;
  nextLabel?: string;
  doneLabel?: string;
  title?: string;
}

/**
 * First-run tutorial for the builder.
 *
 * The original embedded a PNG from the host app's assets folder. Here the image
 * is an optional prop, so the package ships no binary assets and the host can
 * supply one that matches its own branding.
 */
export const FlowGuideModal = ({
  open,
  onClose,
  illustration,
  skipLabel = 'Skip for now',
  nextLabel = 'Next',
  doneLabel = 'Got it',
  title = 'Workflow Tutorial',
}: FlowGuideModalProps) => {
  const [activeKey, setActiveKey] = useState<GuideStep['key']>('trigger');

  const activeIndex = useMemo(
    () => STEPS.findIndex((step) => step.key === activeKey),
    [activeKey],
  );
  const activeStep = STEPS[activeIndex];
  const isLastStep = activeIndex === STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) onClose?.();
    else setActiveKey(STEPS[activeIndex + 1].key);
  };

  return (
    <DynamicModal
      style={{ padding: 0 }}
      open={open}
      onClose={onClose}
      title={title}
      buttons={[
        {
          label: skipLabel,
          variant: 'outlined',
          sx: { color: 'text.primary' },
          onClick: onClose,
        },
        { label: isLastStep ? doneLabel : nextLabel, onClick: handleNext },
      ]}
    >
      <Grid container sx={{ pr: 2 }}>
        <Grid item xs={3}>
          <Box pt={1} role="tablist" aria-label={title} display="flex" flexDirection="column" gap={0.5}>
            {STEPS.map((step) => {
              const Icon = ICONS[step.key];
              const selected = step.key === activeKey;
              return (
                <Box
                  key={step.key}
                  role="tab"
                  tabIndex={0}
                  aria-selected={selected}
                  onClick={() => setActiveKey(step.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setActiveKey(step.key);
                  }}
                  sx={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 1,
                    px: 1.25,
                    borderRadius: RADIUS.control,
                    color: selected ? ACCENT : TEXT_SUBTLE,
                    bgcolor: selected ? ACCENT_SOFT : 'transparent',
                    transition: 'background-color 140ms ease, color 140ms ease',
                    '&:hover': { bgcolor: selected ? ACCENT_SOFT : 'theme.secondary.100' },
                  }}
                >
                  <Icon fontSize="small" />
                  <Typography type="s4" weight={selected ? 'medium' : 'normal'} color="inherit">
                    {step.name}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Grid>

        <Grid item xs={1} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Divider orientation="vertical" sx={{ borderColor: BORDER }} />
        </Grid>

        <Grid item xs={8}>
          <Box display="flex" flexDirection="column" gap={2}>
            {illustration ? (
              <Box height={200} width="100%">
                <img src={illustration} alt="" style={{ width: '100%', objectFit: 'contain' }} />
              </Box>
            ) : null}
            <Box display="flex" flexDirection="column" gap={0.75} mt={illustration ? 3 : 0}>
              <Typography type="s2" weight="bold" color={TEXT_STRONG}>
                {activeStep.question}
              </Typography>
              <Typography type="s4" color={TEXT_SUBTLE}>
                {activeStep.answer}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </DynamicModal>
  );
};
