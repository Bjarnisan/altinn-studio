import { describe, expect, it } from 'vitest';
import { isRejectGatewayMissing } from './rejectGateway';
import type { RejectGatewayTask } from './rejectGateway';
import type { ProcessShapeElement, ProcessShapeFlow } from '../../../../utils/processShape';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';

describe('isRejectGatewayMissing', () => {
  it.each`
    description                                             | task                                          | expected
    ${'no task is selected'}                                | ${undefined}                                  | ${false}
    ${'the task has no actions'}                            | ${createTask(undefined, [])}                  | ${false}
    ${'the task has no reject'}                             | ${createTask(['sign'], [])}                   | ${false}
    ${'reject has no flow out'}                             | ${createTask(['reject'], [])}                 | ${true}
    ${'reject is followed by a task'}                       | ${createTask(['sign', 'reject'], [nextTask])} | ${true}
    ${'reject is followed by a gateway with one flow out'}  | ${createTask(['reject'], [createGateway(1)])} | ${true}
    ${'reject is followed by a gateway with two flows out'} | ${createTask(['reject'], [createGateway(2)])} | ${false}
  `('returns $expected when $description', ({ task, expected }) => {
    expect(isRejectGatewayMissing(task)).toBe(expected);
  });
});

const nextTask: ProcessShapeElement = { id: 'Task_2', type: BpmnTypeEnum.Task };

const createSequenceFlow = (target?: ProcessShapeElement): ProcessShapeFlow => ({
  type: BpmnTypeEnum.SequenceFlow,
  target,
});

const createGateway = (outgoingFlowCount: number): ProcessShapeElement => ({
  id: 'Gateway_1',
  type: BpmnTypeEnum.ExclusiveGateway,
  outgoing: Array.from({ length: outgoingFlowCount }, () => createSequenceFlow()),
});

const createTask = (
  actions: string[] | undefined,
  successors: ProcessShapeElement[],
): RejectGatewayTask => ({
  id: 'Task_1',
  type: BpmnTypeEnum.Task,
  businessObject: {
    extensionElements: {
      values: [{ actions: actions && { action: actions.map((action) => ({ action })) } }],
    },
  },
  outgoing: successors.map((successor) => createSequenceFlow(successor)),
});
