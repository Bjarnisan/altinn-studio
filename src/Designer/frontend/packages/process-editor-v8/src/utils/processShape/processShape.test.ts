import { describe, expect, it } from 'vitest';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';
import type { ProcessShapeElement, ProcessShapeFlow } from './processShape';
import { getProcessShapeIssue } from './processShape';

describe('getProcessShapeIssue', () => {
  it('reports no issue when a gateway with two outgoing flows follows the task', () => {
    const task = createTask([createGateway('Gateway_1', 2)]);

    expect(getProcessShapeIssue(task)).toBeUndefined();
  });

  it('reports no issue when no task is selected', () => {
    expect(getProcessShapeIssue(undefined)).toBeUndefined();
  });

  it('reports a missing gateway when nothing follows the task', () => {
    expect(getProcessShapeIssue(createTask([]))).toEqual({ kind: 'missingGateway' });
  });

  it('reports a missing gateway when the task has no outgoing list', () => {
    expect(getProcessShapeIssue({ id: 'Task_1' })).toEqual({ kind: 'missingGateway' });
  });

  it('reports a missing gateway when the outgoing flow has no target', () => {
    const task: ProcessShapeElement = { id: 'Task_1', outgoing: [createSequenceFlow()] };

    expect(getProcessShapeIssue(task)).toEqual({ kind: 'missingGateway' });
  });

  it('reports a missing gateway when the successor is not a gateway', () => {
    const task = createTask([{ id: 'EndEvent_1', type: BpmnTypeEnum.EndEvent }]);

    expect(getProcessShapeIssue(task)).toEqual({ kind: 'missingGateway' });
  });

  it('reports a missing gateway when only some of the successors are gateways', () => {
    const task = createTask([createGateway('Gateway_1', 2), { id: 'Task_2', type: 'bpmn:Task' }]);

    expect(getProcessShapeIssue(task)).toEqual({ kind: 'missingGateway' });
  });

  it('reports the gateways with fewer than two outgoing flows', () => {
    const task = createTask([createGateway('Gateway_1', 1), createGateway('Gateway_2', 2)]);

    expect(getProcessShapeIssue(task)).toEqual({
      kind: 'gatewayWithoutBranches',
      gatewayIds: ['Gateway_1'],
    });
  });

  describe('with a text annotation attached', () => {
    const annotation: ProcessShapeFlow = {
      type: 'bpmn:Association',
      target: { id: 'TextAnnotation_1', type: 'bpmn:TextAnnotation' },
    };

    it('ignores text annotations attached to the task', () => {
      const task = createTask([createGateway('Gateway_1', 2)]);
      task.outgoing.push(annotation);

      expect(getProcessShapeIssue(task)).toBeUndefined();
    });

    it('does not count the annotation attached to the gateway as a branch', () => {
      const gateway = createGateway('Gateway_1', 1);
      gateway.outgoing.push(annotation);

      expect(getProcessShapeIssue(createTask([gateway]))).toEqual({
        kind: 'gatewayWithoutBranches',
        gatewayIds: ['Gateway_1'],
      });
    });
  });
});

type TestElement = ProcessShapeElement & { outgoing: ProcessShapeFlow[] };

const createSequenceFlow = (target?: ProcessShapeElement): ProcessShapeFlow => ({
  type: BpmnTypeEnum.SequenceFlow,
  target,
});

const createGateway = (id: string, outgoingFlowCount: number): TestElement => ({
  id,
  type: BpmnTypeEnum.ExclusiveGateway,
  outgoing: Array.from({ length: outgoingFlowCount }, () => createSequenceFlow()),
});

const createTask = (successors: ProcessShapeElement[]): TestElement => ({
  id: 'Task_1',
  type: BpmnTypeEnum.ServiceTask,
  outgoing: successors.map((successor) => createSequenceFlow(successor)),
});
