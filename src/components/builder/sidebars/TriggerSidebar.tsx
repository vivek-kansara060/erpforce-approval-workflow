import { useEffect, useState } from 'react';
import { SearchableSelect, ShareIcon } from '../../../ui';
import { FormField } from '../../layout';
import { SidebarShell } from './SidebarShell';
import { I18N } from '../../../constants/i18n-keys';
import { useTranslate } from '../../../providers/useApprovalWorkflowConfig';
import { useEntityCatalogue } from '../../../hooks/useWorkflowReferences';
import type { TriggerNodeData } from '../../../types/graph';

export interface TriggerSidebarProps {
  isOpen: boolean;
  nodeId: string | null;
  nodeData: TriggerNodeData | null;
  onClose: () => void;
  onSave: (nodeId: string, data: TriggerNodeData) => void;
  /** Entity the workflow is bound to, from the form. */
  entityType: string;
  module: string;
  /** Show the saved trigger without editing. */
  readOnly?: boolean;
}

/**
 * Picks the entity whose lifecycle starts the workflow.
 *
 * The option list comes from the generic entity catalogue, so the same sidebar
 * serves HRMS leave requests and procurement purchase orders without a change.
 */
export const TriggerSidebar = ({
  isOpen,
  nodeId,
  nodeData,
  onClose,
  onSave,
  entityType,
  module,
  readOnly = false,
}: TriggerSidebarProps) => {
  const t = useTranslate();
  // Keep the saved trigger selectable even if its entity was disabled since.
  const { catalogue, labelOf } = useEntityCatalogue({
    selectedValue: nodeData?.trigger || entityType,
  });
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelected(nodeData?.trigger || entityType || '');
  }, [isOpen, nodeData?.trigger, entityType]);

  const handleSave = () => {
    if (!nodeId) return;
    onSave(nodeId, {
      label: labelOf(selected) || nodeData?.label || 'Trigger',
      trigger: selected,
      triggerId: selected,
      event_type: nodeData?.event_type || 'onCreate',
      module,
    });
  };

  return (
    <SidebarShell
      isOpen={isOpen}
      onClose={onClose}
      onSave={readOnly ? undefined : handleSave}
      title={t(I18N.sidebar.triggerTitle)}
      subtitle={t(I18N.sidebar.triggerSubtitle)}
      icon={<ShareIcon fontSize="small" />}
      saveDisabled={!selected}
      saveLabel={t(I18N.common.save)}
      cancelLabel={t(readOnly ? I18N.node.detailsClose : I18N.common.cancel)}
    >
      <FormField label={t(I18N.sidebar.triggerTitle)} required>
        <SearchableSelect
          disabled={readOnly}
          options={catalogue}
          size="small"
          value={selected}
          onChange={(event: { target: { value: string } }) => setSelected(event.target.value)}
          placeholder={t(I18N.sidebar.triggerPlaceholder)}
        />
      </FormField>
    </SidebarShell>
  );
};
