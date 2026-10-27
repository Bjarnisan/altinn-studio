import { PredefinedGatewayAction } from '@studio/components';
import { getProcessShapeIssue } from '../../../../utils/processShape';
import type { ProcessShapeElement } from '../../../../utils/processShape';
import { TaskUtils } from '../../../../utils/taskUtils';

type TaskExtension = {
  $type?: string;
  actions?: { action?: { action?: string }[] };
};

export type RejectGatewayTask = ProcessShapeElement & {
  businessObject?: { extensionElements?: { values?: TaskExtension[] } };
};

/**
 * A `reject` abandons the task without validating it, and the process follows the flow out of the task. Only an
 * exclusive gateway right after the task, with one flow back and one flow on, can send `reject` back. Without it
 * the process moves on as if the task were completed.
 */
export const isRejectGatewayMissing = (task: RejectGatewayTask | undefined): boolean =>
  hasRejectAction(task) && getProcessShapeIssue(task) !== undefined;

const hasRejectAction = (task: RejectGatewayTask | undefined): boolean =>
  TaskUtils.getTaskExtensionFromBusinessObject(task?.businessObject)?.actions?.action?.some(
    (actionElement) => actionElement.action === PredefinedGatewayAction.Reject,
  ) ?? false;
