import { describe, expect, it } from 'vitest';
import { isRejectGatewayMissing } from './rejectGateway';
import type { RejectGatewayElement, RejectGatewayFlow } from './rejectGateway';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';

describe('isRejectGatewayMissing', () => {
  it.each`
    description                                             | task                                                                                       | expected
    ${'no task is selected'}                                | ${undefined}                                                                               | ${false}
    ${'the task has no actions'}                            | ${createTask(undefined, [createSequenceFlow(createTask())])}                               | ${false}
    ${'the task has no reject'}                             | ${createTask(['sign'], [createSequenceFlow(createTask())])}                                | ${false}
    ${'reject is followed by a gateway'}                    | ${createTask(['reject'], [createSequenceFlow(gateway)])}                                   | ${false}
    ${'reject has no flow out'}                             | ${createTask(['reject'], [])}                                                              | ${true}
    ${'reject has no list of flows out'}                    | ${createTask(['reject'])}                                                                  | ${true}
    ${'reject is followed by a task'}                       | ${createTask(['sign', 'reject'], [createSequenceFlow(createTask())])}                      | ${true}
    ${'reject is followed by a gateway and a task'}         | ${createTask(['reject'], [createSequenceFlow(gateway), createSequenceFlow(createTask())])} | ${true}
    ${'reject is connected to a gateway by an association'} | ${createTask(['reject'], [{ type: 'bpmn:Association', target: gateway }])}                 | ${true}
  `('returns $expected when $description', ({ task, expected }) => {
    expect(isRejectGatewayMissing(task)).toBe(expected);
  });
});

const gateway: RejectGatewayElement = { type: BpmnTypeEnum.ExclusiveGateway, outgoing: [] };

const createSequenceFlow = (target: RejectGatewayElement): RejectGatewayFlow => ({
  type: BpmnTypeEnum.SequenceFlow,
  target,
});

const createTask = (actions?: string[], outgoing?: RejectGatewayFlow[]): RejectGatewayElement => ({
  type: BpmnTypeEnum.Task,
  businessObject: {
    extensionElements: {
      values: [
        {
          $type: 'altinn:TaskExtension',
          actions: actions && { action: actions.map((action) => ({ action })) },
        },
      ],
    },
  },
  outgoing,
});
