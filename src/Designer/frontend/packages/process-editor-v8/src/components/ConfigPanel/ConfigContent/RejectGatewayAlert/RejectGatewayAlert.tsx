import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioParagraph } from '@studio/components';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnDiagramVersion } from '../../../../hooks/useBpmnDiagramVersion';
import { isRejectGatewayMissing } from './rejectGateway';

export const RejectGatewayAlert = (): ReactElement | null => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();
  useBpmnDiagramVersion();

  if (!isRejectGatewayMissing(bpmnDetails.element)) return null;

  return (
    <StudioAlert data-color='warning'>
      <StudioParagraph data-size='sm'>
        {t('process_editor.configuration_panel.reject.missing_gateway_alert')}
      </StudioParagraph>
    </StudioAlert>
  );
};
