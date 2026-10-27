import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { Element } from 'bpmn-js/lib/model/Types';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RejectGatewayAlert } from './RejectGatewayAlert';
import type { RejectGatewayElement, RejectGatewayFlow } from './rejectGateway';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { modelerOnMock } from '../../../../../test/mocks/bpmnModelerMock';

describe('RejectGatewayAlert', () => {
  it('warns when no gateway follows a task with reject', () => {
    renderRejectGatewayAlert(createSigningTask([]));

    expect(screen.getByText(missingGatewayText)).toBeInTheDocument();
  });

  it('shows no warning when a gateway follows the task', () => {
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

type TestElement = RejectGatewayElement & { outgoing: RejectGatewayFlow[] };

const createSequenceFlow = (target: RejectGatewayElement): RejectGatewayFlow => ({
  type: BpmnTypeEnum.SequenceFlow,
  target,
});

const createGateway = (): RejectGatewayElement => ({ type: BpmnTypeEnum.ExclusiveGateway });

const createSigningTask = (outgoing: RejectGatewayFlow[]): TestElement => ({
  type: BpmnTypeEnum.Task,
  businessObject: {
    extensionElements: {
      values: [{ actions: { action: [{ action: 'sign' }, { action: 'reject' }] } }],
    },
  },
  outgoing,
});

const renderRejectGatewayAlert = (task: TestElement): RenderResult =>
  render(
    <BpmnContext.Provider
      value={{
        ...mockBpmnContextValue,
        bpmnDetails: {
          ...mockBpmnDetails,
          taskType: 'signing',
          element: task as unknown as Element,
        },
      }}
    >
      <RejectGatewayAlert />
    </BpmnContext.Provider>,
  );
