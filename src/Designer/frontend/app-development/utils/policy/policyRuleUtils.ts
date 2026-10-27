const orgResourcePrefix = 'urn:altinn:org:';
const appResourcePrefix = 'urn:altinn:app:';
const taskResourcePrefix = 'urn:altinn:task:';

/**
 * Builds the id of a rule that belongs to one process task. Designer's backend recognises the ":ruleid:{taskId}"
 * suffix and keeps it in step when the task id changes.
 */
export const buildTaskRuleId = (org: string, app: string, taskId: string): string =>
  `urn:altinn:resource:app_${org}_${app}:policyid:1:ruleid:${taskId}`;

/**
 * Builds the resource that limits a rule to one process task.
 */
export const buildTaskResource = (org: string, app: string, taskId: string): string[] => [
  `${orgResourcePrefix}${org}`,
  `${appResourcePrefix}${app}`,
  `${taskResourcePrefix}${taskId}`,
];

/**
 * Tells whether a resource covers the whole app, because it names nothing but the org and the app.
 */
export const coversWholeApp = (resource: string[]): boolean =>
  resource.every(
    (attribute) =>
      attribute.startsWith(orgResourcePrefix) || attribute.startsWith(appResourcePrefix),
  );
