import { ArrayUtils } from '@studio/pure-functions';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';

export type ProcessShapeElement = {
  id: string;
  type?: string;
  outgoing?: ProcessShapeFlow[];
};

export type ProcessShapeFlow = {
  type?: string;
  target?: ProcessShapeElement;
};

export type ProcessShapeIssue =
  /** The task has no outgoing flow, or a flow leads to an element other than an exclusive gateway. */
  | { kind: 'missingGateway' }
  /** All following elements are exclusive gateways, but some have fewer than two outgoing flows. */
  | { kind: 'gatewayWithoutBranches'; gatewayIds: string[] };

/** One flow for each outcome, such as archived or failed in Fiks Arkiv, or reject and everything else. */
const requiredGatewayBranchCount = 2;

/**
 * Each element after the task must be an exclusive gateway with at least two outgoing flows. Fiks Arkiv tasks
 * need this to match FiksArkivConfigValidationService.ValidateProcessShape, and tasks with reject need it to
 * send reject back. Report the first failed rule.
 */
export const getProcessShapeIssue = (
  task: ProcessShapeElement | undefined,
): ProcessShapeIssue | undefined => {
  if (!task) return undefined;

  const successors = getSuccessors(task);
  const gateways = successors.filter(isExclusiveGateway);
  if (successors.length === 0 || gateways.length !== successors.length) {
    return { kind: 'missingGateway' };
  }

  const gatewayIdsWithoutBranches = ArrayUtils.removeDuplicates(
    gateways
      .filter((gateway) => getOutgoingSequenceFlows(gateway).length < requiredGatewayBranchCount)
      .map((gateway) => gateway.id),
  );

  return gatewayIdsWithoutBranches.length > 0
    ? { kind: 'gatewayWithoutBranches', gatewayIds: gatewayIdsWithoutBranches }
    : undefined;
};

const getOutgoingSequenceFlows = (element: ProcessShapeElement): ProcessShapeFlow[] =>
  (element.outgoing ?? []).filter((flow) => flow.type === BpmnTypeEnum.SequenceFlow);

const getSuccessors = (task: ProcessShapeElement): ProcessShapeElement[] =>
  getOutgoingSequenceFlows(task).flatMap((flow) => (flow.target ? [flow.target] : []));

const isExclusiveGateway = (element: ProcessShapeElement): boolean =>
  element.type === BpmnTypeEnum.ExclusiveGateway;
