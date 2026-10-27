import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';

type TaskExtension = {
  actions?: { action?: { action?: string }[] };
};

export type RejectGatewayElement = {
  type?: string;
  businessObject?: { extensionElements?: { values?: TaskExtension[] } };
  outgoing?: RejectGatewayFlow[];
};

export type RejectGatewayFlow = {
  type?: string;
  target?: RejectGatewayElement;
};

/**
 * A `reject` abandons the task without validating it, and the process follows the flow out of the task. Only an
 * exclusive gateway right after the task can send `reject` back, so without one the process moves on as if the
 * task were completed.
 */
export const isRejectGatewayMissing = (task: RejectGatewayElement | undefined): boolean =>
  task !== undefined && hasRejectAction(task) && !isFollowedByExclusiveGateway(task);

const hasRejectAction = (task: RejectGatewayElement): boolean =>
  task.businessObject?.extensionElements?.values?.[0]?.actions?.action?.some(
    (actionElement) => actionElement.action === 'reject',
  ) ?? false;

const isFollowedByExclusiveGateway = (task: RejectGatewayElement): boolean => {
  const flows = (task.outgoing ?? []).filter((flow) => flow.type === BpmnTypeEnum.SequenceFlow);
  return (
    flows.length > 0 && flows.every((flow) => flow.target?.type === BpmnTypeEnum.ExclusiveGateway)
  );
};
