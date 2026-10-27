import { describe, expect, it } from 'vitest';
import { act, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { Element } from 'bpmn-js/lib/model/Types';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RejectGatewayAlert } from './RejectGatewayAlert';
import type { RejectGatewayTask } from './rejectGateway';
import type { ProcessShapeElement, ProcessShapeFlow } from '../../../../utils/processShape';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { modelerOnMock } from '../../../../../test/mocks/bpmnModelerMock';
import { renderWithProviders } from '../../../../../test/renderWithProviders';

describe('RejectGatewayAlert', () => {
  it('warns when no gateway follows a task with reject', () => {
    renderRejectGatewayAlert(createSigningTask([]));

    expect(screen.getByText(missingGatewayText)).toBeInTheDocument();
  });

  it('shows no warning when a gateway with two outgoing flows follows the task', () => {
    renderRejectGatewayAlert(createSigningTask([createSequenceFlow(createGateway())]));

    expect(screen.queryByText(missingGatewayText)).not.toBeInTheDocument();
  });

  it('clears the warning when the gateway is added', () => {
    const task = createSigningTask([]);
    renderRejectGatewayAlert(task);

    task.outgoing.push(createSequenceFlow(createGateway()));
    act(() => notifyDiagramChanged());

    expect(screen.queryByText(missingGatewayText)).not.toBeInTheDocument();
  });
});

const missingGatewayText = textMock(
  'process_editor.configuration_panel.reject.missing_gateway_alert',
);

const notifyDiagramChanged = (): void =>
  modelerOnMock.mock.calls
    .filter(([eventName]) => eventName === 'commandStack.changed')
    .forEach(([, listener]) => listener());

type TestTask = RejectGatewayTask & { outgoing: ProcessShapeFlow[] };

const createSequenceFlow = (target?: ProcessShapeElement): ProcessShapeFlow => ({
  type: BpmnTypeEnum.SequenceFlow,
  target,
});

const createGateway = (): ProcessShapeElement => ({
  id: 'Gateway_1',
  type: BpmnTypeEnum.ExclusiveGateway,
  outgoing: [createSequenceFlow(), createSequenceFlow()],
});

const createSigningTask = (outgoing: ProcessShapeFlow[]): TestTask => ({
  id: 'Task_1',
  type: BpmnTypeEnum.Task,
  businessObject: {
    extensionElements: {
      values: [
        {
          $type: 'altinn:TaskExtension',
          actions: { action: [{ action: 'sign' }, { action: 'reject' }] },
        },
      ],
    },
  },
  outgoing,
});

const renderRejectGatewayAlert = (task: TestTask): RenderResult =>
  renderWithProviders(<RejectGatewayAlert />, {
    bpmnContextProps: {
      bpmnDetails: {
        ...mockBpmnDetails,
        taskType: 'signing',
        element: task as unknown as Element,
      },
    },
  });
