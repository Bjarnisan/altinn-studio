const orgAttributePrefix = 'urn:altinn:org:';
const appAttributePrefix = 'urn:altinn:app:';
const taskAttributePrefix = 'urn:altinn:task:';
const taskRuleIdSegment = ':ruleid:';

/**
 * Builds the id of a rule that belongs to one process task. Designer's backend recognises the ":ruleid:{taskId}"
 * suffix and keeps it in step when the task id changes.
 */
export const buildTaskRuleId = (org: string, app: string, taskId: string): string =>
  `urn:altinn:resource:app_${org}_${app}:policyid:1${taskRuleIdSegment}${taskId}`;

/**
 * Tells whether a rule id belongs to the task. The policy editor rewrites the start of every rule id when it saves,
 * so only the ":ruleid:{taskId}" suffix is compared, as Designer's backend does when the task id changes.
 */
export const belongsToTask = (ruleId: string, taskId: string): boolean =>
  ruleId.endsWith(`${taskRuleIdSegment}${taskId}`);

/**
 * Builds the resource that limits a rule to one process task.
 */
export const buildTaskResource = (org: string, app: string, taskId: string): string[] => [
  `${orgAttributePrefix}${org}`,
  `${appAttributePrefix}${app}`,
  `${taskAttributePrefix}${taskId}`,
];

/**
 * Tells whether a resource covers the whole app, because it names one org and one app and nothing else.
 */
export const coversWholeApp = (resource: string[]): boolean =>
  resource.length === 2 &&
  resource.some((attribute) => attribute.startsWith(orgAttributePrefix)) &&
  resource.some((attribute) => attribute.startsWith(appAttributePrefix));

/**
 * Tells whether a subject is a service owner rather than a user.
 */
export const isServiceOwner = (subject: string): boolean => subject.startsWith(orgAttributePrefix);
